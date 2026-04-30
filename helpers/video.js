const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { TextDecoder } = require('util');
const { config } = require('./config');

const VIDEO_EXTENSIONS = new Set([
  '.avi',
  '.m4v',
  '.mkv',
  '.mov',
  '.mp4',
  '.mpeg',
  '.mpg',
  '.webm'
]);

const DIRECT_PLAY_EXTENSIONS = new Set([
  '.m4v',
  '.mp4',
  '.webm'
]);

function getVideoContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.mp4' || ext === '.m4v') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.mov') return 'video/quicktime';
  if (ext === '.avi') return 'video/x-msvideo';
  if (ext === '.mkv') return 'video/x-matroska';
  if (ext === '.mpeg' || ext === '.mpg') return 'video/mpeg';

  return 'application/octet-stream';
}

function canDirectPlay(filePath) {
  return DIRECT_PLAY_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function resolveVideoPath(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/');

  for (const mapping of config.mediaPathMappings) {
    if (normalized === mapping.from || normalized.startsWith(`${mapping.from}/`)) {
      return normalized.replace(mapping.from, mapping.to).replace(/\//g, path.sep);
    }
  }

  return filePath;
}

function getSubtitleLabel(filePath, videoPath) {
  const videoBaseName = path.basename(videoPath, path.extname(videoPath));
  const subtitleBaseName = path.basename(filePath, path.extname(filePath));
  const suffix = subtitleBaseName.replace(videoBaseName, '').replace(/^[.\s_-]+/, '');

  if (!suffix) {
    return 'Default';
  }

  return suffix
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function listSubtitleTracks(videoPath, episodeId) {
  const resolvedPath = resolveVideoPath(videoPath);
  const directory = path.dirname(resolvedPath);
  const videoBaseName = path.basename(resolvedPath, path.extname(resolvedPath));

  try {
    return fs.readdirSync(directory)
      .filter((fileName) => path.extname(fileName).toLowerCase() === '.srt')
      .filter((fileName) => path.basename(fileName, '.srt').startsWith(videoBaseName))
      .map((fileName, index) => {
        const filePath = path.join(directory, fileName);
        const label = getSubtitleLabel(filePath, resolvedPath);

        return {
          id: index,
          label,
          srclang: label === 'Default' ? 'en' : label.slice(0, 2).toLowerCase(),
          src: `/api/player/${episodeId}/subtitles/${index}`,
          fileName
        };
      });
  } catch (_error) {
    return [];
  }
}

function srtToVtt(srt) {
  return `WEBVTT\n\n${String(srt || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r+/g, '')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')}`;
}

function decodeSubtitleBuffer(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.toString('utf8');
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch (_error) {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

function streamSubtitle(req, res, videoPath, subtitleId) {
  const resolvedPath = resolveVideoPath(videoPath);
  const tracks = listSubtitleTracks(resolvedPath, req.params.episodeId);
  const track = tracks.find((item) => item.id === Number(subtitleId));

  if (!track) {
    res.status(404).json({ error: 'Subtitle track not found.' });
    return;
  }

  const subtitlePath = path.join(path.dirname(resolvedPath), track.fileName);
  fs.readFile(subtitlePath, (error, content) => {
    if (error) {
      res.status(404).json({ error: 'Subtitle file could not be read.' });
      return;
    }

    const decodedContent = decodeSubtitleBuffer(content);
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(srtToVtt(decodedContent), 'utf8');
  });
}

function streamTranscodedVideo(req, res, filePath, durationInSeconds = 0) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  
  let startByte = 0;
  let endByte = fileSize - 1;
  let startTime = 0;

  if (range && durationInSeconds > 0) {
    const [startText, endText] = range.replace(/bytes=/, '').split('-');
    startByte = Number.parseInt(startText, 10);
    if (endText) endByte = Number.parseInt(endText, 10);
    if (!Number.isNaN(startByte) && startByte > 0) {
      startTime = Math.floor((startByte / fileSize) * durationInSeconds);
    }
  }

  const ffmpeg = spawn('ffmpeg', [
    '-hide_banner',
    '-loglevel', 'error',
    '-ss', String(startTime),
    '-i', filePath,
    '-map', '0:v:0',
    '-map', '0:a?',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '160k',
    '-f', 'matroska',
    'pipe:1'
  ], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderr = '';
  ffmpeg.stderr.on('data', (chunk) => stderr += chunk.toString());

  ffmpeg.once('error', () => {
    if (!res.headersSent) res.status(500).json({ error: 'ffmpeg is not available to transcode this episode.' });
  });

  ffmpeg.once('spawn', () => {
    if (range) {
      res.writeHead(206, {
        'Content-Range': `bytes ${startByte}-${endByte}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Type': 'video/x-matroska'
      });
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/x-matroska',
        'Accept-Ranges': 'bytes'
      });
    }
  });

  req.on('close', () => ffmpeg.kill('SIGKILL'));
  ffmpeg.stdout.pipe(res);

  ffmpeg.once('close', (code) => {
    if (code !== 0 && !res.headersSent) {
      res.status(500).json({ error: stderr.trim() || 'ffmpeg could not transcode this episode.' });
    }
  });
}

function streamVideo(req, res, filePath, durationInSeconds) {
  const resolvedPath = resolveVideoPath(filePath);
  const ext = path.extname(resolvedPath).toLowerCase();
  if (!VIDEO_EXTENSIONS.has(ext)) {
    res.status(415).json({ error: 'The episode file is not a supported browser video format.' });
    return;
  }

  fs.stat(resolvedPath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      res.status(404).json({ error: 'The episode file could not be read from this server.' });
      return;
    }

    if (!canDirectPlay(resolvedPath)) {
      streamTranscodedVideo(req, res, resolvedPath, durationInSeconds);
      return;
    }

    const range = req.headers.range;
    const contentType = getVideoContentType(resolvedPath);

    if (!range) {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(resolvedPath).pipe(res);
      return;
    }

    const [startText, endText] = range.replace(/bytes=/, '').split('-');
    const start = Number.parseInt(startText, 10);
    const end = endText ? Number.parseInt(endText, 10) : stat.size - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start >= stat.size || end >= stat.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      res.end();
      return;
    }

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': contentType
    });

    fs.createReadStream(resolvedPath, { start, end }).pipe(res);
  });
}

module.exports = {
  listSubtitleTracks,
  resolveVideoPath,
  streamSubtitle,
  streamVideo
};
