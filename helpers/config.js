const path = require('path');

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

const config = {
  port: Number(process.env.PORT || 3000),
  publicDir: path.join(__dirname, '..', 'public'),
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
