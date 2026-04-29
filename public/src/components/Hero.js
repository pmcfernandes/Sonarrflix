import { h } from '../helpers/react.js';
import { joinMeta, plural } from '../helpers/format.js';

export function Hero({ series, onOpenSeries, onRefresh }) {
  const backgroundImage = series?.backdrop || series?.poster;
  const style = backgroundImage
    ? {
        backgroundImage: `
          linear-gradient(90deg, rgba(8, 9, 13, 0.94), rgba(8, 9, 13, 0.62) 42%, rgba(8, 9, 13, 0.2)),
          linear-gradient(0deg, var(--bg), rgba(8, 9, 13, 0.18) 42%),
          url("${backgroundImage}")
        `
      }
    : {};

  return h(
    'section',
    { className: 'hero', style },
    h('div', { className: 'hero-shade' }),
    h(
      'div',
      { className: 'hero-content' },
      h('p', { className: 'eyebrow' }, series ? joinMeta([series.year, series.status, plural(series.episodeFileCount, 'episode')]) : 'Sonarr catalog'),
      h('h1', null, series?.title || 'Sonarr Stream'),
      h(
        'p',
        null,
        series?.overview || 'Add your Sonarr URL and API key, then refresh the app.'
      ),
      h(
        'div',
        { className: 'hero-actions' },
        h(
          'button',
          {
            className: 'primary-button',
            type: 'button',
            disabled: !series,
            onClick: () => series && onOpenSeries(series.id)
          },
          'Open Series'
        ),
        h('button', { className: 'secondary-button', type: 'button', onClick: onRefresh }, 'Refresh')
      )
    )
  );
}
