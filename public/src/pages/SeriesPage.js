import { h } from '../helpers/react.js';
import { PosterCard } from '../components/PosterCard.js';

export function SeriesPage({ series, onOpenSeries }) {
  return h(
    'div',
    { className: 'series-grid' },
    series.map((item) => h(PosterCard, { key: item.id, series: item, onOpen: onOpenSeries }))
  );
}
