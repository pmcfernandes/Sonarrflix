const state = {
  series: [],
  categories: [],
  activeCategory: 'All Series',
  activeView: 'home',
  selectedSeries: null,
  search: ''
};

const els = {
  hero: document.getElementById('hero'),
  heroMeta: document.getElementById('heroMeta'),
  heroTitle: document.getElementById('heroTitle'),
  heroOverview: document.getElementById('heroOverview'),
  heroOpen: document.getElementById('heroOpen'),
  refreshButton: document.getElementById('refreshButton'),
  notice: document.getElementById('notice'),
  categoryList: document.getElementById('categoryList'),
  rows: document.getElementById('rows'),
  seriesGrid: document.getElementById('seriesGrid'),
  episodeView: document.getElementById('episodeView'),
  viewMeta: document.getElementById('viewMeta'),
  viewTitle: document.getElementById('viewTitle'),
  counter: document.getElementById('counter'),
  searchInput: document.getElementById('searchInput'),
  playerDialog: document.getElementById('playerDialog'),
  videoPlayer: document.getElementById('videoPlayer'),
  playerTitle: document.getElementById('playerTitle'),
  closePlayer: document.getElementById('closePlayer')
};

function showNotice(message) {
  els.notice.textContent = message;
  els.notice.classList.toggle('hidden', !message);
}

function setView(view) {
  state.activeView = view;
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });
  render();
}

function filteredSeries() {
  const query = state.search.trim().toLowerCase();
  const category = state.activeCategory;

  return state.series.filter((series) => {
    const inCategory = category === 'All Series'
      || (category === 'Available to Watch' && series.episodeFileCount > 0)
      || series.genres.includes(category)
      || series.status === category
      || state.categories.find((item) => item.name === category)?.items.some((item) => item.id === series.id);

    const matchesSearch = !query
      || series.title.toLowerCase().includes(query)
      || series.genres.some((genre) => genre.toLowerCase().includes(query));

    return inCategory && matchesSearch;
  });
}

function plural(count, singular, pluralText = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralText}`;
}

function imageOrFallback(series) {
  if (!series.poster) {
    return `<span class="poster-fallback">${escapeHtml(series.title)}</span>`;
  }

  return `<img src="${escapeAttribute(series.poster)}" alt="${escapeAttribute(series.title)} poster" loading="lazy" onerror="this.remove()">`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function renderPoster(series) {
  return `
    <button class="poster-card" type="button" data-series-id="${series.id}">
      <div class="poster">
        ${imageOrFallback(series)}
      </div>
      <div class="poster-title">${escapeHtml(series.title)}</div>
      <div class="poster-meta">${series.year || 'Unknown'} · ${plural(series.seasonCount, 'season')}</div>
    </button>
  `;
}

function pickHeroSeries() {
  const candidates = state.series
    .filter((series) => series.backdrop || series.poster)
    .sort((a, b) => b.episodeFileCount - a.episodeFileCount || b.rating - a.rating);

  return candidates[0] || state.series[0] || null;
}

function renderHero() {
  const heroSeries = state.selectedSeries || pickHeroSeries();
  if (!heroSeries) {
    els.hero.style.backgroundImage = '';
    els.heroMeta.textContent = 'Sonarr catalog';
    els.heroTitle.textContent = 'Sonarr Stream';
    els.heroOverview.textContent = 'Add your Sonarr URL and API key, then refresh the app.';
    return;
  }

  if (heroSeries.backdrop || heroSeries.poster) {
    const image = heroSeries.backdrop || heroSeries.poster;
    els.hero.style.backgroundImage = `
      linear-gradient(90deg, rgba(8, 9, 13, 0.94), rgba(8, 9, 13, 0.62) 42%, rgba(8, 9, 13, 0.2)),
      linear-gradient(0deg, var(--bg), rgba(8, 9, 13, 0.18) 42%),
      url("${image}")
    `;
  }

  els.heroMeta.textContent = [
    heroSeries.year,
    heroSeries.status,
    plural(heroSeries.episodeFileCount, 'episode')
  ].filter(Boolean).join(' · ');
  els.heroTitle.textContent = heroSeries.title;
  els.heroOverview.textContent = heroSeries.overview || 'No overview is available for this series.';
  els.heroOpen.dataset.seriesId = heroSeries.id;
}

function renderCategories() {
  const categories = [
    { name: 'All Series', count: state.series.length },
    { name: 'Available to Watch', count: state.series.filter((series) => series.episodeFileCount > 0).length },
    ...state.categories.map((category) => ({ name: category.name, count: category.items.length }))
  ].filter((category, index, self) => self.findIndex((item) => item.name === category.name) === index);

  els.categoryList.innerHTML = categories.map((category) => `
    <button class="category-button ${category.name === state.activeCategory ? 'active' : ''}" type="button" data-category="${escapeAttribute(category.name)}">
      <span>${escapeHtml(category.name)}</span>
      <span>${category.count}</span>
    </button>
  `).join('');
}

function renderRows() {
  const rows = state.categories.length > 0
    ? state.categories
    : [{ name: 'All Series', items: state.series }];

  els.rows.innerHTML = rows.map((row) => `
    <section class="row">
      <h3>${escapeHtml(row.name)}</h3>
      <div class="rail">${row.items.map(renderPoster).join('')}</div>
    </section>
  `).join('');
}

function renderSeriesGrid() {
  const series = filteredSeries();
  els.seriesGrid.innerHTML = series.map(renderPoster).join('');
  els.counter.textContent = plural(series.length, 'series', 'series');
}

function renderShell() {
  const isHome = state.activeView === 'home';
  const isSeries = state.activeView === 'series';
  const isEpisodes = state.activeView === 'episodes';

  els.rows.classList.toggle('hidden', !isHome);
  els.seriesGrid.classList.toggle('hidden', !isSeries);
  els.episodeView.classList.toggle('hidden', !isEpisodes);

  els.viewMeta.textContent = state.activeCategory;
  els.viewTitle.textContent = isEpisodes && state.selectedSeries ? state.selectedSeries.title : isHome ? 'Browse' : 'Series';
  els.counter.textContent = plural(filteredSeries().length, 'series', 'series');
}

function render() {
  renderHero();
  renderCategories();
  renderShell();

  if (state.activeView === 'home') {
    renderRows();
  }

  if (state.activeView === 'series') {
    renderSeriesGrid();
  }
}

async function loadCatalog() {
  showNotice('');
  els.counter.textContent = 'Loading';

  try {
    const response = await fetch('/api/series');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Could not load Sonarr catalog.');
    }

    state.series = payload.series || [];
    state.categories = payload.categories || [];
    state.selectedSeries = pickHeroSeries();
    render();
  } catch (error) {
    showNotice(`${error.message} Check SONARR_URL and SONARR_API_KEY in your .env file.`);
    state.series = [];
    state.categories = [];
    render();
  }
}

async function openSeries(seriesId) {
  const series = state.series.find((item) => item.id === Number(seriesId));
  if (!series) {
    return;
  }

  state.selectedSeries = series;
  setView('episodes');
  els.episodeView.innerHTML = '<div class="notice">Loading episodes...</div>';

  try {
    const response = await fetch(`/api/series/${series.id}/episodes`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Could not load episodes.');
    }

    renderEpisodes(series, payload.seasons || {});
  } catch (error) {
    els.episodeView.innerHTML = `<div class="notice">${escapeHtml(error.message)}</div>`;
  }
}

function renderEpisodes(series, seasons) {
  const seasonNumbers = Object.keys(seasons)
    .map(Number)
    .sort((a, b) => a - b);

  els.counter.textContent = plural(series.episodeFileCount, 'available episode');
  els.episodeView.innerHTML = `
    <section class="series-detail">
      <div class="poster">${imageOrFallback(series)}</div>
      <div class="detail-copy">
        <div class="pills">
          <span class="pill">${escapeHtml(series.status)}</span>
          <span class="pill">${plural(series.seasonCount, 'season')}</span>
          <span class="pill">${plural(series.episodeFileCount, 'episode')}</span>
          ${series.network ? `<span class="pill">${escapeHtml(series.network)}</span>` : ''}
        </div>
        <h2>${escapeHtml(series.title)}</h2>
        <p>${escapeHtml(series.overview || 'No overview is available for this series.')}</p>
      </div>
    </section>
    ${seasonNumbers.map((seasonNumber) => renderSeason(seasonNumber, seasons[String(seasonNumber)])).join('')}
  `;
}

function renderSeason(seasonNumber, episodes) {
  return `
    <section class="season">
      <h3>Season ${seasonNumber}</h3>
      <div class="episode-list">
        ${episodes.map(renderEpisode).join('')}
      </div>
    </section>
  `;
}

function renderEpisode(episode) {
  const number = `S${String(episode.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}`;
  const disabled = !episode.hasFile;

  return `
    <article class="episode ${disabled ? 'locked' : ''}">
      <div class="episode-number">${number}</div>
      <div>
        <h4>${escapeHtml(episode.title)}</h4>
        <p>${escapeHtml(episode.overview || episode.airDate || 'No episode details available.')}</p>
      </div>
      <button class="play-button" type="button" data-episode-id="${episode.id}" data-title="${escapeAttribute(`${number} · ${episode.title}`)}" ${disabled ? 'disabled' : ''}>
        ${disabled ? 'Missing' : 'Play'}
      </button>
    </article>
  `;
}

function openPlayer(episodeId, title) {
  els.videoPlayer.src = `/watch/${episodeId}`;
  els.playerTitle.textContent = title;
  els.playerDialog.showModal();
  els.videoPlayer.play().catch(() => {});
}

function closePlayer() {
  if (!els.playerDialog.open) {
    return;
  }

  els.videoPlayer.pause();
  els.videoPlayer.removeAttribute('src');
  els.videoPlayer.load();
  els.playerDialog.close();
}

document.addEventListener('click', (event) => {
  const tab = event.target.closest('.tab');
  const category = event.target.closest('.category-button');
  const poster = event.target.closest('.poster-card');
  const play = event.target.closest('.play-button');

  if (tab) {
    setView(tab.dataset.view);
  }

  if (category) {
    state.activeCategory = category.dataset.category;
    state.activeView = 'series';
    setView('series');
  }

  if (poster) {
    openSeries(poster.dataset.seriesId);
  }

  if (play && !play.disabled) {
    openPlayer(play.dataset.episodeId, play.dataset.title);
  }

  if (event.target.closest('[data-action="home"]')) {
    setView('home');
  }
});

els.searchInput.addEventListener('input', (event) => {
  state.search = event.target.value;
  if (state.activeView === 'home') {
    state.activeView = 'series';
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === 'series'));
  }
  render();
});

els.heroOpen.addEventListener('click', () => openSeries(els.heroOpen.dataset.seriesId));
els.refreshButton.addEventListener('click', loadCatalog);
els.closePlayer.addEventListener('click', closePlayer);
els.playerDialog.addEventListener('close', () => {
  els.videoPlayer.pause();
  els.videoPlayer.removeAttribute('src');
  els.videoPlayer.load();
});

loadCatalog();
