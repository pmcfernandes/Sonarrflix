const express = require('express');
const { getSettings } = require('../helpers/database');

const router = express.Router();

router.get('/health', (_req, res) => {
  const settings = getSettings();

  res.json({
    ok: true,
    sonarrConfigured: settings.configured,
    sonarrUrl: settings.sonarrUrl
  });
});

module.exports = router;
