const path = require('path');

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

const config = {
  port: Number(process.env.PORT || 3000),
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
  sonarrUrl: normalizeBaseUrl(process.env.SONARR_URL || 'http://localhost:8989'),
  sonarrApiKey: process.env.SONARR_API_KEY || ''
};

function requireSonarrConfig() {
  if (!config.sonarrUrl || !config.sonarrApiKey.trim()) {
    const missing = [];
    if (!config.sonarrUrl) missing.push('SONARR_URL');
    if (!config.sonarrApiKey.trim()) missing.push('SONARR_API_KEY');
    throw new Error(`Missing Sonarr configuration: ${missing.join(', ')}`);
  }
}

module.exports = {
  config,
  requireSonarrConfig
};
