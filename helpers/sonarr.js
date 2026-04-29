const { config, requireSonarrConfig } = require('./config');

async function sonarrFetch(route, options = {}) {
  requireSonarrConfig();

  const response = await fetch(`${config.sonarrUrl}/api/v3/${route.replace(/^\/+/, '')}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'X-Api-Key': config.sonarrApiKey,
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

  return `/api/image?path=${encodeURIComponent(imagePath)}`;
}

function buildSonarrAssetUrl(assetPath) {
  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  return `${config.sonarrUrl}${assetPath.startsWith('/') ? '' : '/'}${assetPath}`;
}

module.exports = {
  buildSonarrAssetUrl,
  sonarrFetch,
  sonarrImageProxyUrl
};
