const express = require('express');
const { getSettings } = require('../helpers/database');
const { getSeriesPeople, getMoviePeople } = require('../helpers/tvdb');

const router = express.Router();

const EMPTY_RESULT = { actors: [], directors: [], producers: [], writers: [], creators: [] };

function getTvdbApiKey() {
  const settings = getSettings();
  const apiKey = (settings.tvdbApiKey || '').trim();
  return apiKey || null;
}

router.get('/tvdb/series/:tvdbId/people', async (req, res) => {
  try {
    const apiKey = getTvdbApiKey();
    if (!apiKey) {
      return res.json(EMPTY_RESULT);
    }

    let tvdbId = req.params.tvdbId;
    
    // If it's not a number, it might be a remote ID (e.g. IMDB ID)
    if (isNaN(tvdbId)) {
      const { getTvdbIdByRemoteId } = require('../helpers/tvdb');
      tvdbId = await getTvdbIdByRemoteId(tvdbId, apiKey);
    } else {
      tvdbId = Number(tvdbId);
    }

    if (!tvdbId) {
      return res.json(EMPTY_RESULT);
    }

    const people = await getSeriesPeople(tvdbId, apiKey);
    res.json(people);
  } catch (error) {
    console.error('TVDB series people error:', error.message);
    res.json(EMPTY_RESULT);
  }
});

router.get('/tvdb/movie/:id/people', async (req, res) => {
  try {
    const apiKey = getTvdbApiKey();
    if (!apiKey) {
      return res.json(EMPTY_RESULT);
    }

    let tvdbId = req.params.id;
    
    // If it's not a number, it's a remote ID (e.g. tt12345 or tmdb:123)
    if (isNaN(tvdbId)) {
      const { getTvdbIdByRemoteId } = require('../helpers/tvdb');
      tvdbId = await getTvdbIdByRemoteId(tvdbId, apiKey);
    } else {
      tvdbId = Number(tvdbId);
    }

    if (!tvdbId) {
      return res.json(EMPTY_RESULT);
    }

    const people = await getMoviePeople(tvdbId, apiKey);
    res.json(people);
  } catch (error) {
    console.error('TVDB movie people error:', error.message);
    res.json(EMPTY_RESULT);
  }
});

module.exports = router;
