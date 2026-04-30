import React from 'react';
import { h } from './helpers/react.js';
import { fetchCatalog, fetchEpisodes } from './helpers/api.js';
import { buildCategoryList, filterSeries } from './helpers/catalog.js';
import { plural } from './helpers/format.js';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { EpisodesPage } from './pages/EpisodesPage.js';
import { HomePage } from './pages/HomePage.js';
import { PlayerPage } from './pages/PlayerPage.js';
import { SeriesPage } from './pages/SeriesPage.js';

function getPlayerRoute() {
  const match = window.location.pathname.match(/^\/player\/(\d+)/);
  if (!match) {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const title = params.get('title') || '';
  const seriesId = params.get('seriesId') || '';
  return {
    episodeId: match[1],
    title,
    seriesId
  };
}

export function App() {
  const playerRoute = getPlayerRoute();
  if (playerRoute) {
    return h(PlayerPage, playerRoute);
  }

  const [activeCategory, setActiveCategory] = React.useState('All Series');
  const [activeView, setActiveView] = React.useState('home');
  const [catalog, setCatalog] = React.useState({ series: [], categories: [] });
  const [episodeState, setEpisodeState] = React.useState({ loading: false, error: '', seasons: {} });
  const [notice, setNotice] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [selectedSeries, setSelectedSeries] = React.useState(null);

  const filtered = React.useMemo(
    () => filterSeries(catalog.series, catalog.categories, activeCategory, search),
    [activeCategory, catalog, search]
  );
  const categoryList = React.useMemo(
    () => buildCategoryList(catalog.series, catalog.categories),
    [catalog]
  );

  React.useEffect(() => {
    loadCatalog();
  }, []);

  async function loadCatalog() {
    setNotice('');

    try {
      const payload = await fetchCatalog();
      const nextCatalog = {
        series: payload.series || [],
        categories: payload.categories || []
      };

      setCatalog(nextCatalog);
      const initialSeriesId = new URLSearchParams(window.location.search).get('seriesId');
      const initialSeries = nextCatalog.series.find((item) => String(item.id) === String(initialSeriesId));

      if (initialSeries) {
        setSelectedSeries(initialSeries);
        setActiveView('episodes');
        setEpisodeState({ loading: true, error: '', seasons: {} });

        try {
          const episodePayload = await fetchEpisodes(initialSeries.id);
          setEpisodeState({
            loading: false,
            error: '',
            seasons: episodePayload.seasons || {}
          });
        } catch (episodeError) {
          setEpisodeState({ loading: false, error: episodeError.message, seasons: {} });
        }
      } else {
        setSelectedSeries(null);
      }
    } catch (error) {
      setCatalog({ series: [], categories: [] });
      setSelectedSeries(null);
      setNotice(`${error.message} Check SONARR_URL and SONARR_API_KEY in your .env file.`);
    }
  }

  async function openSeries(seriesId) {
    const series = catalog.series.find((item) => item.id === Number(seriesId));
    if (!series) {
      return;
    }

    setSelectedSeries(series);
    setActiveView('episodes');
    setEpisodeState({ loading: true, error: '', seasons: {} });

    try {
      const payload = await fetchEpisodes(series.id);
      setEpisodeState({
        loading: false,
        error: '',
        seasons: payload.seasons || {}
      });
    } catch (error) {
      setEpisodeState({ loading: false, error: error.message, seasons: {} });
    }
  }

  function handleCategoryChange(category) {
    setActiveCategory(category);
    setActiveView('series');
  }

  function handleSearch(value) {
    setSearch(value);
    if (activeView === 'home') {
      setActiveView('series');
    }
  }

  function openPlayerPage(episode) {
    const params = new URLSearchParams({
      title: episode.title,
      seriesId: String(episode.seriesId)
    });
    window.location.assign(`/player/${episode.id}?${params.toString()}`);
  }

  function renderPage() {
    if (activeView === 'episodes') {
      return h(EpisodesPage, {
        ...episodeState,
        series: selectedSeries,
        onPlay: openPlayerPage
      });
    }

    if (activeView === 'series') {
      return h(SeriesPage, { series: filtered, onOpenSeries: openSeries });
    }

    return h(HomePage, {
      categories: catalog.categories,
      series: catalog.series,
      onOpenSeries: openSeries
    });
  }

  const counter = activeView === 'episodes' && selectedSeries
    ? plural(selectedSeries.episodeFileCount, 'available episode')
    : plural(filtered.length, 'series', 'series');

  return h(
    React.Fragment,
    null,
    h(Header, {
      activeView,
      search,
      onHome: () => setActiveView('home'),
      onSearch: handleSearch,
      onViewChange: setActiveView
    }),
    h(
      'main',
      null,
      notice ? h('section', { className: 'notice', role: 'status' }, notice) : null,
      h(
        'section',
        { className: 'layout' },
        h(Sidebar, {
          categories: categoryList,
          activeCategory,
          onCategoryChange: handleCategoryChange
        }),
        h(
          'section',
          { className: 'content' },
          h(
            'div',
            { className: 'section-heading' },
            h(
              'div',
              null,
              h('p', { className: 'eyebrow' }, activeCategory),
              h('h2', null, activeView === 'episodes' && selectedSeries ? selectedSeries.title : activeView === 'home' ? 'Browse' : 'Series')
            ),
            h('div', { className: 'counter' }, counter)
          ),
          renderPage()
        )
      )
    )
  );
}
