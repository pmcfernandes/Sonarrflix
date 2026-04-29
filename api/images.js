const express = require('express');
const { config, requireSonarrConfig } = require('../helpers/config');
const { buildSonarrAssetUrl } = require('../helpers/sonarr');

const router = express.Router();

router.get('/image', async (req, res) => {
  try {
    requireSonarrConfig();

    const imagePath = String(req.query.path || '');
    if (!imagePath) {
      res.status(400).json({ error: 'Missing image path.' });
      return;
    }

    const response = await fetch(buildSonarrAssetUrl(imagePath), {
      headers: {
        'X-Api-Key': config.sonarrApiKey
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
