const { requireRadarrConfig } = require('./config');
const { getSettings } = require('./database');

function getRadarrSettings() {
  const settings = getSettings();
  requireRadarrConfig(settings);
  return settings;
}

async function radarrFetch(route, options = {}) {
  const settings = getRadarrSettings();

  const response = await fetch(`${settings.radarrUrl}/api/v3/${route.replace(/^\/+/, '')}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'X-Api-Key': settings.radarrApiKey,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Radarr returned HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  return response.json();
}

function radarrImageProxyUrl(imagePath) {
  if (!imagePath) {
    return '';
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  return `/api/image?source=radarr&path=${encodeURIComponent(imagePath)}`;
}

function buildRadarrAssetUrl(assetPath) {
  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  const settings = getRadarrSettings();
  return `${settings.radarrUrl}${assetPath.startsWith('/') ? '' : '/'}${assetPath}`;
}

module.exports = {
  buildRadarrAssetUrl,
  getRadarrSettings,
  radarrFetch,
  radarrImageProxyUrl
};
