const express = require('express');
const { buildSonarrAssetUrl, getSonarrSettings } = require('../helpers/sonarr');
const { buildRadarrAssetUrl, getRadarrSettings } = require('../helpers/radarr');

const router = express.Router();

router.get('/image', async (req, res) => {
  try {
    const source = String(req.query.source || 'sonarr');
    const isRadarr = source === 'radarr';
    const settings = isRadarr ? getRadarrSettings() : getSonarrSettings();

    const imagePath = String(req.query.path || '');
    if (!imagePath) {
      res.status(400).json({ error: 'Missing image path.' });
      return;
    }

    const response = await fetch(isRadarr ? buildRadarrAssetUrl(imagePath) : buildSonarrAssetUrl(imagePath), {
      headers: {
        'X-Api-Key': isRadarr ? settings.radarrApiKey : settings.sonarrApiKey
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

module.exports = router;
