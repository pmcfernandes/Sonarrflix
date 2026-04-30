const express = require('express');
const { groupMovieCategories, mapMovie } = require('../helpers/catalog');
const { radarrFetch } = require('../helpers/radarr');

const router = express.Router();

router.get('/movies', async (_req, res) => {
  try {
    const movies = (await radarrFetch('movie'))
      .map(mapMovie)
      .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle));

    res.json({
      movies,
      categories: groupMovieCategories(movies)
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

module.exports = router;
