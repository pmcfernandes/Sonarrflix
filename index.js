require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SONARR_URL = normalizeBaseUrl(process.env.SONARR_URL || 'http://localhost:8989');
const SONARR_API_KEY = process.env.SONARR_API_KEY || '';
const PUBLIC_DIR = path.join(__dirname, 'public');

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

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function requireSonarrConfig() {
  if (!SONARR_URL || !SONARR_API_KEY.trim()) {
    const missing = [];
    if (!SONARR_URL) missing.push('SONARR_URL');
    if (!SONARR_API_KEY.trim()) missing.push('SONARR_API_KEY');
    throw new Error(`Missing Sonarr configuration: ${missing.join(', ')}`);
  }
}

function sonarrImageUrl(imagePath) {
  if (!imagePath) {
    return '';
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  return `/api/image?path=${encodeURIComponent(imagePath)}`;
}

async function sonarrFetch(route, options = {}) {
  requireSonarrConfig();

  const response = await fetch(`${SONARR_URL}/api/v3/${route.replace(/^\/+/, '')}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'X-Api-Key': SONARR_API_KEY,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Sonarr returned HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  return response.json();
}

function getSeriesImages(series) {
  const images = Array.isArray(series.images) ? series.images : [];
  const cover = images.find((image) => image.coverType === 'poster') || images[0] || {};
  const backdrop = images.find((image) => image.coverType === 'fanart') || images.find((image) => image.coverType === 'banner') || cover;

  return {
    poster: sonarrImageUrl(cover.remoteUrl || cover.url),
    backdrop: sonarrImageUrl(backdrop.remoteUrl || backdrop.url)
  };
}

function getSeriesStatus(series) {
  if (series.ended) {
    return 'Ended';
  }

  if (series.status) {
    return String(series.status).replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return 'Continuing';
}

function mapSeries(series) {
  const images = getSeriesImages(series);
  const seasons = Array.isArray(series.seasons) ? series.seasons.filter((season) => season.seasonNumber > 0) : [];

  return {
    id: series.id,
    title: series.title,
    sortTitle: series.sortTitle || series.title,
    year: series.year,
    overview: series.overview || '',
    genres: Array.isArray(series.genres) ? series.genres : [],
    network: series.network || '',
    status: getSeriesStatus(series),
    monitored: Boolean(series.monitored),
    seasonCount: seasons.length,
    episodeCount: series.statistics?.episodeCount || 0,
    episodeFileCount: series.statistics?.episodeFileCount || 0,
    nextAiring: series.nextAiring || null,
    previousAiring: series.previousAiring || null,
    rating: Number(series.ratings?.value || 0),
    certification: series.certification || '',
    path: series.path || '',
    poster: images.poster,
    backdrop: images.backdrop
  };
}

function mapEpisode(episode) {
  return {
    id: episode.id,
    seriesId: episode.seriesId,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    title: episode.title || `Episode ${episode.episodeNumber}`,
    overview: episode.overview || '',
    airDate: episode.airDate || '',
    airDateUtc: episode.airDateUtc || '',
    hasFile: Boolean(episode.hasFile),
    episodeFileId: episode.episodeFileId || null,
    absoluteEpisodeNumber: episode.absoluteEpisodeNumber || null,
    runtime: episode.runtime || 0
  };
}

function groupCategories(series) {
  const categories = new Map();
  const add = (name, predicate) => {
    const items = series.filter(predicate);
    if (items.length > 0) {
      categories.set(name, items);
    }
  };

  add('Recently Added', (item) => item.episodeFileCount > 0);
  add('Continuing', (item) => item.status !== 'Ended');
  add('Ended Series', (item) => item.status === 'Ended');
  add('Unwatched Library', (item) => item.episodeCount > item.episodeFileCount);

  for (const item of series) {
    for (const genre of item.genres) {
      if (!categories.has(genre)) {
        categories.set(genre, []);
      }
      categories.get(genre).push(item);
    }
  }

  return [...categories.entries()].map(([name, items]) => ({
    name,
    items: items
      .slice()
      .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle))
      .slice(0, 30)
  }));
}

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

app.use(express.static(PUBLIC_DIR));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    sonarrConfigured: Boolean(SONARR_URL && SONARR_API_KEY.trim()),
    sonarrUrl: SONARR_URL
  });
});

app.get('/api/series', async (_req, res) => {
  try {
    const series = (await sonarrFetch('series'))
      .map(mapSeries)
      .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle));

    res.json({
      series,
      categories: groupCategories(series)
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get('/api/series/:seriesId/episodes', async (req, res) => {
  try {
    const seriesId = Number(req.params.seriesId);
    const episodes = (await sonarrFetch(`episode?seriesId=${seriesId}`))
      .map(mapEpisode)
      .sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber);

    const seasons = episodes.reduce((accumulator, episode) => {
      const key = String(episode.seasonNumber);
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(episode);
      return accumulator;
    }, {});

    res.json({ episodes, seasons });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get('/api/image', async (req, res) => {
  try {
    requireSonarrConfig();
    const imagePath = String(req.query.path || '');
    if (!imagePath) {
      res.status(400).json({ error: 'Missing image path.' });
      return;
    }

    const imageUrl = /^https?:\/\//i.test(imagePath)
      ? imagePath
      : `${SONARR_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
    const response = await fetch(imageUrl, {
      headers: {
        'X-Api-Key': SONARR_API_KEY
      }
    });

    if (!response.ok) {
      res.status(response.status).end();
      return;
    }

    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get('/watch/:episodeId', async (req, res) => {
  try {
    const episode = await sonarrFetch(`episode/${Number(req.params.episodeId)}`);
    if (!episode.hasFile || !episode.episodeFileId) {
      res.status(404).json({ error: 'This episode does not have a file in Sonarr.' });
      return;
    }

    const episodeFile = await sonarrFetch(`episodefile/${episode.episodeFileId}`);
    if (!episodeFile.path) {
      res.status(404).json({ error: 'Sonarr did not return a file path for this episode.' });
      return;
    }

    streamVideo(req, res, episodeFile.path);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stream catalog running on http://localhost:${PORT}`);
});
