const express = require('express');
const { config } = require('../helpers/config');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    sonarrConfigured: Boolean(config.sonarrUrl && config.sonarrApiKey.trim()),
    sonarrUrl: config.sonarrUrl
  });
});

module.exports = router;
