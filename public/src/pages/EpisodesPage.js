import { h } from '../helpers/react.js';
import { episodeCode, plural } from '../helpers/format.js';

export function EpisodesPage({ error, loading, seasons, series, onPlay }) {
  if (!series) {
    return h('div', { className: 'notice' }, 'Select a series to view episodes.');
  }

  if (loading) {
    return h('div', { className: 'notice' }, 'Loading episodes...');
  }

  if (error) {
    return h('div', { className: 'notice' }, error);
  }

  const seasonNumbers = Object.keys(seasons)
    .map(Number)
    .sort((a, b) => b - a);

  return h(
    'div',
    { className: 'episode-view' },
    h(SeriesDetail, { series }),
    seasonNumbers.map((seasonNumber) => h(Season, {
      key: seasonNumber,
      seasonNumber,
      episodes: seasons[String(seasonNumber)],
      onPlay
    }))
  );
}

function SeriesDetail({ series }) {
  const backgroundImage = series.backdrop || series.poster;

  return h(
    'section',
    {
      className: 'series-detail',
      style: backgroundImage
        ? {
            backgroundImage: `
              linear-gradient(90deg, rgba(8, 9, 13, 0.98), rgba(8, 9, 13, 0.82) 48%, rgba(8, 9, 13, 0.58)),
              linear-gradient(0deg, rgba(8, 9, 13, 0.98), rgba(8, 9, 13, 0.38) 62%, rgba(8, 9, 13, 0.18)),
              url("${backgroundImage}")
            `
          }
        : undefined
    },
    h(
      'div',
      { className: 'poster' },
      series.poster
        ? h('img', { src: series.poster, alt: `${series.title} poster` })
        : h('span', { className: 'poster-fallback' }, series.title)
    ),
    h(
      'div',
      { className: 'detail-copy' },
      h(
        'div',
        { className: 'pills' },
        h('span', { className: 'pill' }, series.status),
        h('span', { className: 'pill' }, plural(series.seasonCount, 'season')),
        h('span', { className: 'pill' }, plural(series.episodeFileCount, 'episode')),
        series.network ? h('span', { className: 'pill' }, series.network) : null
      ),
      h('h2', null, series.title),
      h('p', null, series.overview || 'No overview is available for this series.')
    )
  );
}

function Season({ episodes, onPlay, seasonNumber }) {
  return h(
    'section',
    { className: 'season' },
    h('h3', null, `Season ${seasonNumber}`),
    h(
      'div',
      { className: 'episode-list' },
      episodes
        .slice()
        .sort((a, b) => b.episodeNumber - a.episodeNumber)
        .map((episode) => h(EpisodeRow, { key: episode.id, episode, onPlay }))
    )
  );
}

function EpisodeRow({ episode, onPlay }) {
  const code = episodeCode(episode);
  const title = `${code} / ${episode.title}`;

  return h(
    'article',
    { className: `episode ${episode.hasFile ? '' : 'locked'}` },
    h('div', { className: 'episode-number' }, code),
    h(
      'div',
      null,
      h('h4', null, episode.title),
      h('p', null, episode.overview || episode.airDate || 'No episode details available.')
    ),
    h(
      'button',
      {
        className: 'play-button',
        type: 'button',
        disabled: !episode.hasFile,
        'aria-label': episode.hasFile ? `Play ${title}` : `Missing ${title}`,
        onClick: () => onPlay({ id: episode.id, seriesId: episode.seriesId, title })
      },
      episode.hasFile ? 'Play' : 'Missing'
    )
  );
}
