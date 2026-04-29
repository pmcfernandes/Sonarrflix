import { h } from '../helpers/react.js';
import { plural } from '../helpers/format.js';

export function PosterCard({ series, onOpen }) {
  return h(
    'button',
    { className: 'poster-card', type: 'button', onClick: () => onOpen(series.id) },
    h(
      'div',
      { className: 'poster' },
      series.poster
        ? h('img', {
            src: series.poster,
            alt: `${series.title} poster`,
            loading: 'lazy',
            onError: (event) => event.currentTarget.remove()
          })
        : h('span', { className: 'poster-fallback' }, series.title)
    ),
    h('div', { className: 'poster-title' }, series.title),
    h('div', { className: 'poster-meta' }, `${series.year || 'Unknown'} / ${plural(series.seasonCount, 'season')}`)
  );
}
