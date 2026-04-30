const express = require('express');
const { mapMovie } = require('../helpers/catalog');
const { radarrFetch } = require('../helpers/radarr');
const { listSubtitleTracks, streamSubtitle } = require('../helpers/video');

const router = express.Router();

async function getPlayableMovie(movieId) {
  const movie = await radarrFetch(`movie/${Number(movieId)}`);
  const movieFile = movie.movieFile || (movie.movieFileId ? await radarrFetch(`moviefile/${movie.movieFileId}`) : null);

  if (!movieFile?.path) {
    const error = new Error('This movie does not have a playable file in Radarr.');
    error.statusCode = 404;
    throw error;
  }

  return { movie, movieFile };
}

router.get('/movie-player/:movieId', async (req, res) => {
  try {
    const { movie, movieFile } = await getPlayableMovie(req.params.movieId);
    const allMovies = await radarrFetch('movie');
    const mappedMovie = mapMovie(movie);
    if (movieFile && movieFile.mediaInfo && movieFile.mediaInfo.runTime) {
      const parts = String(movieFile.mediaInfo.runTime).split(':');
      if (parts.length === 3) {
        mappedMovie.fileRuntime = (parseFloat(parts[0]) * 3600) + (parseFloat(parts[1]) * 60) + parseFloat(parts[2]);
      }
    }
    const path = require('path');
    mappedMovie.canDirectPlay = ['.m4v', '.mp4', '.webm'].includes(path.extname(movieFile.path).toLowerCase());
    const currentGenres = new Set(mappedMovie.genres);
    const suggestedMovies = allMovies
      .map(mapMovie)
      .filter((item) => item.id !== mappedMovie.id && item.genres.some((genre) => currentGenres.has(genre)))
      .map((item) => ({
        ...item,
        sharedGenreCount: item.genres.filter((genre) => currentGenres.has(genre)).length
      }))
      .sort((a, b) => {
        return b.sharedGenreCount - a.sharedGenreCount
          || Number(b.hasFile) - Number(a.hasFile)
          || a.sortTitle.localeCompare(b.sortTitle);
      })
      .slice(0, 10);

    res.json({
      movie: mappedMovie,
      suggestedMovies,
      subtitles: listSubtitleTracks(movieFile.path, `movie-${mappedMovie.id}`).map((subtitle) => ({
        ...subtitle,
        src: `/api/movie-player/${mappedMovie.id}/subtitles/${subtitle.id}`
      }))
    });
  } catch (error) {
    res.status(error.statusCode || 502).json({ error: error.message });
  }
});

router.get('/movie-player/:movieId/subtitles/:subtitleId', async (req, res) => {
  try {
    const { movieFile } = await getPlayableMovie(req.params.movieId);
    req.params.episodeId = `movie-${req.params.movieId}`;
    streamSubtitle(req, res, movieFile.path, req.params.subtitleId);
  } catch (error) {
    res.status(error.statusCode || 502).json({ error: error.message });
  }
});

module.exports = router;
