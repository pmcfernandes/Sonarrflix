import { h } from '../helpers/react.js';

export function MoviesPage({ movies, onOpenMovie }) {
  return h(
    'div',
    { className: 'series-grid' },
    movies.map((movie) => h(MovieCard, { key: movie.id, movie, onOpenMovie }))
  );
}

function MovieCard({ movie, onOpenMovie }) {
  return h(
    'button',
    { className: 'poster-card', type: 'button', onClick: () => onOpenMovie(movie) },
    h(
      'div',
      { className: 'poster' },
      movie.poster
        ? h('img', {
            src: movie.poster,
            alt: `${movie.title} poster`,
            loading: 'lazy',
            onError: (event) => event.currentTarget.remove()
          })
        : h('span', { className: 'poster-fallback' }, movie.title)
    ),
    h('div', { className: 'poster-title' }, movie.title),
    h('div', { className: 'poster-meta' }, `${movie.year || 'Unknown'} / ${movie.hasFile ? 'Ready' : 'Missing'}`)
  );
}
