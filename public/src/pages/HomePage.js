import { h } from '../helpers/react.js';
import { PosterCard } from '../components/PosterCard.js';

export function HomePage({ categories, series, onOpenSeries }) {
  const rows = categories.length > 0 ? categories : [{ name: 'All Series', items: series }];

  return h(
    'div',
    { className: 'rows' },
    rows.map((row) => h(
      'section',
      { className: 'row', key: row.name },
      h('h3', null, row.name),
      h(
        'div',
        { className: 'rail' },
        row.items.map((item) => h(PosterCard, { key: item.id, series: item, onOpen: onOpenSeries }))
      )
    ))
  );
}
