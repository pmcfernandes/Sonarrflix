const express = require('express');
const { mapEpisode, mapSeries } = require('../helpers/catalog');
const { sonarrFetch } = require('../helpers/sonarr');
const { listSubtitleTracks, streamSubtitle } = require('../helpers/video');

const router = express.Router();

async function getPlayableEpisode(episodeId) {
  const episode = await sonarrFetch(`episode/${Number(episodeId)}`);
  if (!episode.hasFile || !episode.episodeFileId) {
    const error = new Error('This episode does not have a file in Sonarr.');
    error.statusCode = 404;
    throw error;
  }

  const episodeFile = await sonarrFetch(`episodefile/${episode.episodeFileId}`);
  if (!episodeFile.path) {
    const error = new Error('Sonarr did not return a file path for this episode.');
    error.statusCode = 404;
    throw error;
  }

  return { episode, episodeFile };
}

router.get('/player/:episodeId', async (req, res) => {
  try {
    const { episode, episodeFile } = await getPlayableEpisode(req.params.episodeId);
    const [series, episodes, allSeries] = await Promise.all([
      sonarrFetch(`series/${episode.seriesId}`),
      sonarrFetch(`episode?seriesId=${episode.seriesId}`),
      sonarrFetch('series')
    ]);
    const mappedEpisode = mapEpisode(episode);
    const mappedSeries = mapSeries(series);
    const mappedEpisodes = episodes
      .map(mapEpisode)
      .sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber);
    const seasonEpisodes = mappedEpisodes
      .filter((item) => item.seasonNumber === mappedEpisode.seasonNumber)
      .sort((a, b) => b.episodeNumber - a.episodeNumber);
    const currentGenres = new Set(mappedSeries.genres);
    const suggestedSeries = allSeries
      .map(mapSeries)
      .filter((item) => item.id !== mappedSeries.id && item.genres.some((genre) => currentGenres.has(genre)))
      .map((item) => ({
        ...item,
        sharedGenreCount: item.genres.filter((genre) => currentGenres.has(genre)).length
      }))
      .sort((a, b) => {
        return b.sharedGenreCount - a.sharedGenreCount
          || b.episodeFileCount - a.episodeFileCount
          || a.sortTitle.localeCompare(b.sortTitle);
      })
      .slice(0, 10);

    res.json({
      episode: mappedEpisode,
      seasonEpisodes,
      series: mappedSeries,
      suggestedSeries,
      subtitles: listSubtitleTracks(episodeFile.path, mappedEpisode.id)
    });
  } catch (error) {
    res.status(error.statusCode || 502).json({ error: error.message });
  }
});

router.get('/player/:episodeId/subtitles/:subtitleId', async (req, res) => {
  try {
    const { episodeFile } = await getPlayableEpisode(req.params.episodeId);
    streamSubtitle(req, res, episodeFile.path, req.params.subtitleId);
  } catch (error) {
    res.status(error.statusCode || 502).json({ error: error.message });
  }
});

module.exports = router;
