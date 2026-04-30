const express = require('express');
    const { mapMovie, mapEpisode } = require('../helpers/catalog');
const { radarrFetch } = require('../helpers/radarr');
const { sonarrFetch } = require('../helpers/sonarr');
const { streamVideo } = require('../helpers/video');

const router = express.Router();

router.get('/watch/:episodeId', async (req, res) => {
  try {
    const episode = await sonarrFetch(`episode/${Number(req.params.episodeId)}`);
    if (!episode.hasFile || !episode.episodeFileId) {
      res.status(404).json({ error: 'This episode does not have a file in Sonarr.' });
      return;
    }

    const episodeFile = await sonarrFetch(`episodefile/${episode.episodeFileId}`);
    if (!episodeFile.path) {
      res.status(404).json({ error: 'Sonarr did not return a file path for this episode.' });
      return;
    }

    const mappedEpisode = mapEpisode(episode);
    if (episodeFile && episodeFile.mediaInfo && episodeFile.mediaInfo.runTime) {
      const parts = String(episodeFile.mediaInfo.runTime).split(':');
      if (parts.length === 3) {
        mappedEpisode.fileRuntime = (parseFloat(parts[0]) * 3600) + (parseFloat(parts[1]) * 60) + parseFloat(parts[2]);
      }
    }
    streamVideo(req, res, episodeFile.path, mappedEpisode.fileRuntime || mappedEpisode.runtime * 60 || 0);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

router.get('/watch/movie/:movieId', async (req, res) => {
  try {
    const movie = await radarrFetch(`movie/${Number(req.params.movieId)}`);
    const movieFile = movie.movieFile || (movie.movieFileId ? await radarrFetch(`moviefile/${movie.movieFileId}`) : null);

    if (!movieFile?.path) {
      res.status(404).json({ error: 'This movie does not have a file in Radarr.' });
      return;
    }

    const mappedMovie = mapMovie(movie);
    if (movieFile && movieFile.mediaInfo && movieFile.mediaInfo.runTime) {
      const parts = String(movieFile.mediaInfo.runTime).split(':');
      if (parts.length === 3) {
        mappedMovie.fileRuntime = (parseFloat(parts[0]) * 3600) + (parseFloat(parts[1]) * 60) + parseFloat(parts[2]);
      }
    }
    streamVideo(req, res, movieFile.path, mappedMovie.fileRuntime || mappedMovie.runtime * 60 || 0);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

module.exports = router;
