async function requestJson(url) {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || `Request failed for ${url}`);
  }

  return payload;
}

async function sendJson(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Request failed for ${url}`);
  }

  return payload;
}

export function fetchCatalog() {
  return requestJson('/api/series');
}

export function fetchEpisodes(seriesId) {
  return requestJson(`/api/series/${seriesId}/episodes`);
}

export function fetchPlayer(episodeId) {
  return requestJson(`/api/player/${episodeId}`);
}

export function fetchSettings() {
  return requestJson('/api/settings');
}

export function saveSettings(settings) {
  return sendJson('/api/settings', 'PUT', settings);
}

export function testSettings(settings) {
  return sendJson('/api/settings/test', 'POST', settings);
}
