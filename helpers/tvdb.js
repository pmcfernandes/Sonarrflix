const TVDB_BASE = 'https://api4.thetvdb.com/v4';

let cachedToken = null;
let tokenExpiry = 0;

async function tvdbLogin(apiKey) {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch(`${TVDB_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: apiKey })
  });

  if (!response.ok) {
    throw new Error(`TVDB login failed: HTTP ${response.status}`);
  }

  const payload = await response.json();
  cachedToken = payload.data?.token;

  if (!cachedToken) {
    throw new Error('TVDB login did not return a token.');
  }

  // Token valid for 1 month; refresh after 25 days to be safe
  tokenExpiry = Date.now() + 25 * 24 * 60 * 60 * 1000;
  return cachedToken;
}

async function tvdbFetch(route, apiKey) {
  const token = await tvdbLogin(apiKey);

  const response = await fetch(`${TVDB_BASE}/${route.replace(/^\/+/, '')}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    // If unauthorized, clear cached token and retry once
    if (response.status === 401 && cachedToken) {
      cachedToken = null;
      tokenExpiry = 0;
      return tvdbFetch(route, apiKey);
    }

    throw new Error(`TVDB returned HTTP ${response.status}`);
  }

  return response.json();
}

function mapCharacter(character) {
  return {
    id: character.id,
    name: character.name || '',
    personName: character.personName || '',
    image: character.image || '',
    personImage: character.personImgURL || '',
    peopleType: character.peopleType || 'Actor',
    peopleId: character.peopleId || null,
    isFeatured: Boolean(character.isFeatured),
    sort: character.sort || 0
  };
}

function groupPeople(characters) {
  const actors = [];
  const directors = [];
  const producers = [];
  const writers = [];
  const creators = [];
  const other = [];

  for (const character of characters) {
    const mapped = mapCharacter(character);
    const type = String(mapped.peopleType).toLowerCase();

    if (type === 'actor' || type === 'guest star') {
      actors.push(mapped);
    } else if (type === 'director') {
      directors.push(mapped);
    } else if (type === 'producer' || type === 'executive producer') {
      producers.push(mapped);
    } else if (type === 'writer') {
      writers.push(mapped);
    } else if (type === 'creator' || type === 'showrunner') {
      creators.push(mapped);
    } else {
      other.push(mapped);
    }
  }

  // Sort: featured first, then by sort field
  const sortFn = (a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.sort - b.sort;
  actors.sort(sortFn);
  directors.sort(sortFn);
  producers.sort(sortFn);
  writers.sort(sortFn);
  creators.sort(sortFn);

  return { actors, directors, producers, writers, creators };
}

async function getSeriesPeople(tvdbId, apiKey) {
  const payload = await tvdbFetch(`series/${tvdbId}/extended`, apiKey);
  const characters = Array.isArray(payload.data?.characters) ? payload.data.characters : [];
  return groupPeople(characters);
}

async function getMoviePeople(tvdbId, apiKey) {
  const payload = await tvdbFetch(`movies/${tvdbId}/extended`, apiKey);
  const characters = Array.isArray(payload.data?.characters) ? payload.data.characters : [];
  return groupPeople(characters);
}

async function getTvdbIdByRemoteId(remoteId, apiKey) {
  try {
    const payload = await tvdbFetch(`search/remoteid/${remoteId}`, apiKey);
    const result = Array.isArray(payload.data) ? payload.data[0] : null;
    return result?.series?.id || result?.movie?.id || null;
  } catch (error) {
    console.error(`TVDB remote ID lookup failed for ${remoteId}:`, error.message);
    return null;
  }
}

async function testTvdbConnection(apiKey) {
  try {
    // A simple endpoint to verify the key is valid
    await tvdbFetch('genres', apiKey);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function clearTokenCache() {
  cachedToken = null;
  tokenExpiry = 0;
}

module.exports = {
  clearTokenCache,
  getMoviePeople,
  getSeriesPeople,
  getTvdbIdByRemoteId,
  testTvdbConnection,
  tvdbFetch
};
