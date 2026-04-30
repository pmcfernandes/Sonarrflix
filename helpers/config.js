const path = require('path');

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

const config = {
  port: Number(process.env.PORT || 3000),
  databasePath: path.join(__dirname, '..', 'data', 'app.sqlite'),
  publicDir: path.join(__dirname, '..', 'public'),
  mediaPathMappings: String(process.env.MEDIA_PATH_MAPPINGS || '/media=Z:/')
    .split(';')
    .map((mapping) => mapping.trim())
    .filter(Boolean)
    .map((mapping) => {
      const [from, to] = mapping.split('=');
      return {
        from: String(from || '').trim().replace(/[\\/]+$/, ''),
        to: String(to || '').trim().replace(/[\\/]+$/, '')
      };
    })
    .filter((mapping) => mapping.from && mapping.to),
  defaultSonarrUrl: 'http://localhost:8989',
  defaultRadarrUrl: 'http://localhost:7878'
};

function requireAppConfig(settings, urlKey, apiKeyKey, label) {
  if (!settings[urlKey] || !settings[apiKeyKey].trim()) {
    const missing = [];
    if (!settings[urlKey]) missing.push(`${label} URL`);
    if (!settings[apiKeyKey].trim()) missing.push(`${label} API key`);
    throw new Error(`Missing ${label} configuration: ${missing.join(', ')}`);
  }
}

function requireSonarrConfig(settings) {
  requireAppConfig(settings, 'sonarrUrl', 'sonarrApiKey', 'Sonarr');
}

function requireRadarrConfig(settings) {
  requireAppConfig(settings, 'radarrUrl', 'radarrApiKey', 'Radarr');
}

module.exports = {
  config,
  normalizeBaseUrl,
  requireRadarrConfig,
  requireSonarrConfig
};
