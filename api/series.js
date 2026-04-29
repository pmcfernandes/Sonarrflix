const express = require('express');
const {
  groupCategories,
  groupEpisodesBySeason,
  mapEpisode,
  mapSeries
} = require('../helpers/catalog');
const { sonarrFetch } = require('../helpers/sonarr');

const router = express.Router();

router.get('/series', async (_req, res) => {
  try {
    const series = (await sonarrFetch('series'))
      .map(mapSeries)
      .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle));

    res.json({
      series,
      categories: groupCategories(series)
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

router.get('/series/:seriesId/episodes', async (req, res) => {
  try {
    const seriesId = Number(req.params.seriesId);
    const episodes = (await sonarrFetch(`episode?seriesId=${seriesId}`))
      .map(mapEpisode)
      .sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber);

    res.json({
      episodes,
      seasons: groupEpisodesBySeason(episodes)
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

module.exports = router;
