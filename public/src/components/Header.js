import { h } from '../helpers/react.js';

export function Header({ activeView, search, onHome, onSearch, onViewChange }) {
  const tabs = [
    ['home', 'Home'],
    ['series', 'Series'],
    ['movies', 'Movies'],
    ['settings', 'Settings']
  ];

  return h(
    'header',
    { className: 'topbar' },
    h(
      'button',
      { className: 'brand', type: 'button', onClick: onHome, 'aria-label': 'Home' },
      h('span', { className: 'brand-mark' }, 'S'),
      h('span', null, 'Sonarrflix')
    ),
    h(
      'nav',
      { className: 'tabs', 'aria-label': 'Catalog views' },
      tabs.map(([view, label]) => h(
        'button',
        {
          key: view,
          className: `tab ${activeView === view ? 'active' : ''}`,
          type: 'button',
          onClick: () => onViewChange(view)
        },
        label
      ))
    ),
    h(
      'label',
      { className: 'search' },
      h('span', { className: 'search-icon', 'aria-hidden': true }, '/'),
      h('input', {
        type: 'search',
        placeholder: 'Search series or movies',
        autoComplete: 'off',
        value: search,
        onChange: (event) => onSearch(event.target.value)
      })
    )
  );
}
