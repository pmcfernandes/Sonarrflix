const fs = require('fs');
const path = require('path');

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

function streamVideo(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!VIDEO_EXTENSIONS.has(ext)) {
    res.status(415).json({ error: 'The episode file is not a supported browser video format.' });
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      res.status(404).json({ error: 'The episode file could not be read from this server.' });
      return;
    }

    const range = req.headers.range;
    const contentType = getVideoContentType(filePath);

    if (!range) {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
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

    fs.createReadStream(filePath, { start, end }).pipe(res);
  });
}

module.exports = {
  streamVideo
};
