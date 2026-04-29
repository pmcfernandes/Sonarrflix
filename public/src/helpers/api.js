async function requestJson(url) {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || `Request failed for ${url}`);
  }

  return payload;
}

export function fetchCatalog() {
  return requestJson('/api/series');
}

export function fetchEpisodes(seriesId) {
  return requestJson(`/api/series/${seriesId}/episodes`);
}
