import { h } from '../helpers/react.js';

export function Sidebar({ categories, activeCategory, onCategoryChange }) {
  return h(
    'aside',
    { className: 'sidebar', 'aria-label': 'Categories' },
    h('h2', null, 'Categories'),
    h(
      'div',
      { className: 'category-list' },
      categories.map((category) => h(
        'button',
        {
          key: category.name,
          className: `category-button ${category.name === activeCategory ? 'active' : ''}`,
          type: 'button',
          onClick: () => onCategoryChange(category.name)
        },
        h('span', null, category.name),
        h('span', null, category.count)
      ))
    )
  );
}
