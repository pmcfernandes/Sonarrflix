const { requireSonarrConfig } = require('./config');
const { getSettings } = require('./database');

function getSonarrSettings() {
  const settings = getSettings();
  requireSonarrConfig(settings);
  return settings;
}

async function sonarrFetch(route, options = {}) {
  const settings = getSonarrSettings();

  const response = await fetch(`${settings.sonarrUrl}/api/v3/${route.replace(/^\/+/, '')}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'X-Api-Key': settings.sonarrApiKey,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Sonarr returned HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  return response.json();
}

function sonarrImageProxyUrl(imagePath) {
  if (!imagePath) {
    return '';
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  return `/api/image?source=sonarr&path=${encodeURIComponent(imagePath)}`;
}

function buildSonarrAssetUrl(assetPath) {
  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  const settings = getSonarrSettings();
  return `${settings.sonarrUrl}${assetPath.startsWith('/') ? '' : '/'}${assetPath}`;
}

module.exports = {
  buildSonarrAssetUrl,
  getSonarrSettings,
  sonarrFetch,
  sonarrImageProxyUrl
};
