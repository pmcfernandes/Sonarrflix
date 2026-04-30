const express = require('express');
const { config, normalizeBaseUrl } = require('../helpers/config');
const { getSettings, saveSettings } = require('../helpers/database');

const router = express.Router();

async function testSonarrConnection(settings) {
  const sonarrUrl = normalizeBaseUrl(settings.sonarrUrl);
  const sonarrApiKey = String(settings.sonarrApiKey || '').trim();

  if (!sonarrUrl || !sonarrApiKey) {
    return {
      ok: false,
      error: 'Sonarr URL and API key are required.'
    };
  }

  try {
    const response = await fetch(`${sonarrUrl}/api/v3/system/status`, {
      signal: AbortSignal.timeout(5000),
      headers: {
        Accept: 'application/json',
        'X-Api-Key': sonarrApiKey
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Sonarr returned HTTP ${response.status}.`
      };
    }

    return {
      ok: true,
      status: await response.json()
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

router.get('/settings', async (_req, res) => {
  const settings = getSettings();
  const connection = settings.configured
    ? await testSonarrConnection(settings)
    : { ok: false, error: 'Sonarr is not configured.' };

  res.json({
    ...settings,
    sonarrUrl: settings.sonarrUrl || config.defaultSonarrUrl,
    connectionOk: connection.ok,
    connectionError: connection.ok ? '' : connection.error
  });
});

router.put('/settings', async (req, res) => {
  const settings = {
    sonarrUrl: String(req.body?.sonarrUrl || '').trim(),
    sonarrApiKey: String(req.body?.sonarrApiKey || '').trim()
  };
  const connection = await testSonarrConnection(settings);

  if (!connection.ok) {
    res.status(400).json({
      error: connection.error || 'Could not connect to Sonarr with these settings.'
    });
    return;
  }

  res.json({
    ...saveSettings(settings),
    connectionOk: true,
    connectionError: ''
  });
});

router.post('/settings/test', async (req, res) => {
  const connection = await testSonarrConnection({
    sonarrUrl: String(req.body?.sonarrUrl || '').trim(),
    sonarrApiKey: String(req.body?.sonarrApiKey || '').trim()
  });

  res.status(connection.ok ? 200 : 400).json(connection);
});

module.exports = router;
