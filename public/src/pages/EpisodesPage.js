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
    .sort((a, b) => a - b);

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
  return h(
    'section',
    { className: 'series-detail' },
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
      episodes.map((episode) => h(EpisodeRow, { key: episode.id, episode, onPlay }))
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
        onClick: () => onPlay({ id: episode.id, title })
      },
      episode.hasFile ? 'Play' : 'Missing'
    )
  );
}
