export function pickHeroSeries(series, selectedSeries) {
  if (selectedSeries) {
    return selectedSeries;
  }

  const candidates = series
    .filter((item) => item.backdrop || item.poster)
    .sort((a, b) => b.episodeFileCount - a.episodeFileCount || b.rating - a.rating);

  return candidates[0] || series[0] || null;
}

export function buildCategoryList(series, categories) {
  return [
    { name: 'All Series', count: series.length },
    { name: 'Available to Watch', count: series.filter((item) => item.episodeFileCount > 0).length },
    ...categories.map((category) => ({ name: category.name, count: category.items.length }))
  ].filter((category, index, list) => list.findIndex((item) => item.name === category.name) === index);
}

export function filterSeries(series, categories, activeCategory, search) {
  const query = search.trim().toLowerCase();
  const categoryItems = categories.find((item) => item.name === activeCategory)?.items || [];

  return series.filter((item) => {
    const inCategory = activeCategory === 'All Series'
      || (activeCategory === 'Available to Watch' && item.episodeFileCount > 0)
      || item.genres.includes(activeCategory)
      || item.status === activeCategory
      || categoryItems.some((categoryItem) => categoryItem.id === item.id);

    const matchesSearch = !query
      || item.title.toLowerCase().includes(query)
      || item.genres.some((genre) => genre.toLowerCase().includes(query));

    return inCategory && matchesSearch;
  });
}
