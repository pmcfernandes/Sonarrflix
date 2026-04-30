const express = require('express');
const { config, normalizeBaseUrl } = require('../helpers/config');
const { getSettings, saveSettings } = require('../helpers/database');

const router = express.Router();

async function testAppConnection(settings, appName, urlKey, apiKeyKey) {
  const appUrl = normalizeBaseUrl(settings[urlKey]);
  const appApiKey = String(settings[apiKeyKey] || '').trim();

  if (!appUrl && !appApiKey) {
    return { configured: false, ok: false, error: `${appName} is not configured.` };
  }

  if (!appUrl || !appApiKey) {
    return {
      configured: false,
      ok: false,
      error: `${appName} URL and API key are required.`
    };
  }

  try {
    const response = await fetch(`${appUrl}/api/v3/system/status`, {
      signal: AbortSignal.timeout(5000),
      headers: {
        Accept: 'application/json',
        'X-Api-Key': appApiKey
      }
    });

    if (!response.ok) {
      return {
        configured: true,
        ok: false,
        error: `${appName} returned HTTP ${response.status}.`
      };
    }

    return {
      configured: true,
      ok: true,
      status: await response.json()
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      error: error.message
    };
  }
}

router.get('/settings', async (_req, res) => {
  const settings = getSettings();
  const [sonarrConnection, radarrConnection] = await Promise.all([
    testAppConnection(settings, 'Sonarr', 'sonarrUrl', 'sonarrApiKey'),
    testAppConnection(settings, 'Radarr', 'radarrUrl', 'radarrApiKey')
  ]);
  const connectionOk = sonarrConnection.ok || radarrConnection.ok;

  res.json({
    ...settings,
    sonarrUrl: settings.sonarrUrl || config.defaultSonarrUrl,
    radarrUrl: settings.radarrUrl || config.defaultRadarrUrl,
    connectionOk,
    connectionError: connectionOk ? '' : 'Configure Sonarr or Radarr to continue.',
    sonarrConnectionOk: sonarrConnection.ok,
    sonarrConnectionError: sonarrConnection.ok ? '' : sonarrConnection.error,
    radarrConnectionOk: radarrConnection.ok,
    radarrConnectionError: radarrConnection.ok ? '' : radarrConnection.error
  });
});

router.put('/settings', async (req, res) => {
  const settings = {
    sonarrUrl: String(req.body?.sonarrUrl || '').trim(),
    sonarrApiKey: String(req.body?.sonarrApiKey || '').trim(),
    radarrUrl: String(req.body?.radarrUrl || '').trim(),
    radarrApiKey: String(req.body?.radarrApiKey || '').trim()
  };
  const [sonarrConnection, radarrConnection] = await Promise.all([
    testAppConnection(settings, 'Sonarr', 'sonarrUrl', 'sonarrApiKey'),
    testAppConnection(settings, 'Radarr', 'radarrUrl', 'radarrApiKey')
  ]);

  if (!sonarrConnection.ok && !radarrConnection.ok) {
    res.status(400).json({
      error: sonarrConnection.configured ? sonarrConnection.error : radarrConnection.error
    });
    return;
  }

  res.json({
    ...saveSettings(settings),
    connectionOk: true,
    connectionError: '',
    sonarrConnectionOk: sonarrConnection.ok,
    sonarrConnectionError: sonarrConnection.ok ? '' : sonarrConnection.error,
    radarrConnectionOk: radarrConnection.ok,
    radarrConnectionError: radarrConnection.ok ? '' : radarrConnection.error
  });
});

router.post('/settings/test', async (req, res) => {
  const settings = {
    sonarrUrl: String(req.body?.sonarrUrl || '').trim(),
    sonarrApiKey: String(req.body?.sonarrApiKey || '').trim(),
    radarrUrl: String(req.body?.radarrUrl || '').trim(),
    radarrApiKey: String(req.body?.radarrApiKey || '').trim()
  };
  const [sonarrConnection, radarrConnection] = await Promise.all([
    testAppConnection(settings, 'Sonarr', 'sonarrUrl', 'sonarrApiKey'),
    testAppConnection(settings, 'Radarr', 'radarrUrl', 'radarrApiKey')
  ]);
  const connection = {
    ok: sonarrConnection.ok || radarrConnection.ok,
    sonarrConnectionOk: sonarrConnection.ok,
    sonarrConnectionError: sonarrConnection.ok ? '' : sonarrConnection.error,
    radarrConnectionOk: radarrConnection.ok,
    radarrConnectionError: radarrConnection.ok ? '' : radarrConnection.error
  };

  res.status(connection.ok ? 200 : 400).json(connection);
});

module.exports = router;
