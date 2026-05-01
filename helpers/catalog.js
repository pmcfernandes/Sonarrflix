const { sonarrImageProxyUrl } = require('./sonarr');
const { radarrImageProxyUrl } = require('./radarr');

function getSeriesImages(series) {
  const images = Array.isArray(series.images) ? series.images : [];
  const cover = images.find((image) => image.coverType === 'poster') || images[0] || {};
  const backdrop = images.find((image) => image.coverType === 'fanart') || images.find((image) => image.coverType === 'banner') || cover;

  return {
    poster: sonarrImageProxyUrl(cover.remoteUrl || cover.url),
    backdrop: sonarrImageProxyUrl(backdrop.remoteUrl || backdrop.url)
  };
}

function getSeriesStatus(series) {
  if (series.ended) {
    return 'Ended';
  }

  if (series.status) {
    return String(series.status).replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return 'Continuing';
}

function mapSeries(series) {
  const images = getSeriesImages(series);
  const seasons = Array.isArray(series.seasons) ? series.seasons.filter((season) => season.seasonNumber > 0) : [];

  return {
    id: series.id,
    title: series.title,
    sortTitle: series.sortTitle || series.title,
    year: series.year,
    overview: series.overview || '',
    genres: Array.isArray(series.genres) ? series.genres : [],
    network: series.network || '',
    status: getSeriesStatus(series),
    monitored: Boolean(series.monitored),
    seasonCount: seasons.length,
    episodeCount: series.statistics?.episodeCount || 0,
    episodeFileCount: series.statistics?.episodeFileCount || 0,
    nextAiring: series.nextAiring || null,
    previousAiring: series.previousAiring || null,
    rating: Number(series.ratings?.value || 0),
    certification: series.certification || '',
    tvdbId: series.tvdbId || null,
    path: series.path || '',
    poster: images.poster,
    backdrop: images.backdrop
  };
}

function mapEpisode(episode) {
  return {
    id: episode.id,
    seriesId: episode.seriesId,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    title: episode.title || `Episode ${episode.episodeNumber}`,
    overview: episode.overview || '',
    airDate: episode.airDate || '',
    airDateUtc: episode.airDateUtc || '',
    hasFile: Boolean(episode.hasFile),
    episodeFileId: episode.episodeFileId || null,
    absoluteEpisodeNumber: episode.absoluteEpisodeNumber || null,
    runtime: episode.runtime || 0
  };
}

function groupCategories(series) {
  const categories = new Map();
  const add = (name, predicate) => {
    const items = series.filter(predicate);
    if (items.length > 0) {
      categories.set(name, items);
    }
  };

  add('Recently Added', (item) => item.episodeFileCount > 0);
  add('Continuing', (item) => item.status !== 'Ended');
  add('Ended Series', (item) => item.status === 'Ended');
  add('Unwatched Library', (item) => item.episodeCount > item.episodeFileCount);

  for (const item of series) {
    for (const genre of item.genres) {
      if (!categories.has(genre)) {
        categories.set(genre, []);
      }
      categories.get(genre).push(item);
    }
  }

  return [...categories.entries()].map(([name, items]) => ({
    name,
    count: items.length,
    items: items
      .slice()
      .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle))
      .slice(0, 30)
  }));
}

function groupEpisodesBySeason(episodes) {
  return episodes.reduce((accumulator, episode) => {
    const key = String(episode.seasonNumber);
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(episode);
    return accumulator;
  }, {});
}

function parseRunTime(runTime) {
  if (!runTime) return 0;
  const parts = String(runTime).split(':');
  if (parts.length === 3) {
    return (parseFloat(parts[0]) * 3600) + (parseFloat(parts[1]) * 60) + parseFloat(parts[2]);
  }
  return 0;
}

function getMovieImages(movie) {
  const images = Array.isArray(movie.images) ? movie.images : [];
  const cover = images.find((image) => image.coverType === 'poster') || images[0] || {};
  const backdrop = images.find((image) => image.coverType === 'fanart') || images.find((image) => image.coverType === 'banner') || cover;

  return {
    poster: radarrImageProxyUrl(cover.remoteUrl || cover.url),
    backdrop: radarrImageProxyUrl(backdrop.remoteUrl || backdrop.url)
  };
}

function mapMovie(movie) {
  const images = getMovieImages(movie);

  return {
    id: movie.id,
    title: movie.title,
    sortTitle: movie.sortTitle || movie.title,
    year: movie.year,
    overview: movie.overview || '',
    genres: Array.isArray(movie.genres) ? movie.genres : [],
    status: movie.status || '',
    monitored: Boolean(movie.monitored),
    hasFile: Boolean(movie.hasFile || movie.movieFile),
    movieFileId: movie.movieFile?.id || movie.movieFileId || null,
    runtime: movie.runtime || 0,
    fileRuntime: parseRunTime(movie.movieFile?.mediaInfo?.runTime) || movie.runtime * 60 || 0,
    rating: Number(movie.ratings?.value || 0),
    certification: movie.certification || '',
    tmdbId: movie.tmdbId || null,
    imdbId: movie.imdbId || '',
    tvdbId: movie.tvdbId || null,
    path: movie.path || '',
    poster: images.poster,
    backdrop: images.backdrop
  };
}

function groupMovieCategories(movies) {
  const categories = new Map();
  const add = (name, predicate) => {
    const items = movies.filter(predicate);
    if (items.length > 0) {
      categories.set(name, items);
    }
  };

  add('Available to Watch', (item) => item.hasFile);
  add('Missing', (item) => !item.hasFile);

  for (const item of movies) {
    for (const genre of item.genres) {
      if (!categories.has(genre)) {
        categories.set(genre, []);
      }
      categories.get(genre).push(item);
    }
  }

  return [...categories.entries()].map(([name, items]) => ({
    name,
    count: items.length,
    items: items
      .slice()
      .sort((a, b) => a.sortTitle.localeCompare(b.sortTitle))
      .slice(0, 30)
  }));
}

module.exports = {
  groupCategories,
  groupEpisodesBySeason,
  groupMovieCategories,
  mapEpisode,
  mapMovie,
  mapSeries
};
