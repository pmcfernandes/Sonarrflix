const { sonarrImageProxyUrl } = require('./sonarr');

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

module.exports = {
  groupCategories,
  groupEpisodesBySeason,
  mapEpisode,
  mapSeries
};
