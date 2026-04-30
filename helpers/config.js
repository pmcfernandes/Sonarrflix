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
  defaultSonarrUrl: 'http://localhost:8989'
};

function requireSonarrConfig(settings) {
  if (!settings.sonarrUrl || !settings.sonarrApiKey.trim()) {
    const missing = [];
    if (!settings.sonarrUrl) missing.push('Sonarr URL');
    if (!settings.sonarrApiKey.trim()) missing.push('Sonarr API key');
    throw new Error(`Missing Sonarr configuration: ${missing.join(', ')}`);
  }
}

module.exports = {
  config,
  normalizeBaseUrl,
  requireSonarrConfig
};
