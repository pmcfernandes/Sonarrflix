import React from 'react';
import { h } from './helpers/react.js';
import { fetchCatalog, fetchEpisodes, fetchMovies, fetchSettings } from './helpers/api.js';
import { buildCategoryList, filterMovies, filterSeries } from './helpers/catalog.js';
import { plural } from './helpers/format.js';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { Spinner } from './components/Spinner.js';
import { EpisodesPage } from './pages/EpisodesPage.js';
import { HomePage } from './pages/HomePage.js';
import { MoviesPage } from './pages/MoviesPage.js';
import { PlayerPage } from './pages/PlayerPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { SeriesPage } from './pages/SeriesPage.js';

function getPlayerRoute() {
  const movieMatch = window.location.pathname.match(/^\/movie-player\/(\d+)/);
  if (movieMatch) {
    return {
      movieId: movieMatch[1],
      type: 'movie'
    };
  }

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
    seriesId,
    type: 'episode'
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
  const [movieCatalog, setMovieCatalog] = React.useState({ movies: [], categories: [] });
  const [episodeState, setEpisodeState] = React.useState({ loading: false, error: '', seasons: {} });
  const [catalogLoading, setCatalogLoading] = React.useState(true);
  const [notice, setNotice] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [selectedSeries, setSelectedSeries] = React.useState(null);
  const [settings, setSettings] = React.useState(null);

  const filtered = React.useMemo(
    () => filterSeries(catalog.series, catalog.categories, activeCategory, search),
    [activeCategory, catalog, search]
  );
  const filteredMovies = React.useMemo(
    () => filterMovies(movieCatalog.movies, movieCatalog.categories, activeCategory, search),
    [activeCategory, movieCatalog, search]
  );
  const categoryList = React.useMemo(
    () => activeView === 'movies'
      ? [
        { name: 'All Movies', count: movieCatalog.movies.length },
        { name: 'Available to Watch', count: movieCatalog.movies.filter((item) => item.hasFile).length },
        ...movieCatalog.categories.map((category) => ({ name: category.name, count: category.count || category.items.length }))
      ].filter((category, index, list) => list.findIndex((item) => item.name === category.name) === index)
      : buildCategoryList(catalog.series, catalog.categories),
    [activeView, catalog, movieCatalog]
  );

  React.useEffect(() => {
    loadSettingsAndCatalog();
  }, []);

  async function loadSettingsAndCatalog() {
    setCatalogLoading(true);
    setNotice('');

    try {
      const loadedSettings = await fetchSettings();
      setSettings(loadedSettings);

      if (!loadedSettings.configured || !loadedSettings.connectionOk) {
        setActiveView('settings');
        setCatalog({ series: [], categories: [] });
        setSelectedSeries(null);
        setCatalogLoading(false);
        return;
      }

      const [payload, moviePayload] = await Promise.all([
        loadedSettings.sonarrConnectionOk ? fetchCatalog().catch(() => ({ series: [], categories: [] })) : Promise.resolve({ series: [], categories: [] }),
        loadedSettings.radarrConnectionOk ? fetchMovies().catch(() => ({ movies: [], categories: [] })) : Promise.resolve({ movies: [], categories: [] })
      ]);
      const nextCatalog = {
        series: payload.series || [],
        categories: payload.categories || []
      };

      setCatalog(nextCatalog);
      setMovieCatalog({
        movies: moviePayload.movies || [],
        categories: moviePayload.categories || []
      });
      setCatalogLoading(false);
      if (!loadedSettings.sonarrConnectionOk && loadedSettings.radarrConnectionOk) {
        setActiveView('movies');
        setActiveCategory('All Movies');
      }
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
      setActiveView('settings');
      setNotice(error.message);
      setCatalogLoading(false);
    }
  }

  function handleSettingsSaved(savedSettings) {
    setSettings(savedSettings);
    setActiveView('home');
    loadSettingsAndCatalog();
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
    setActiveView(activeView === 'movies' ? 'movies' : 'series');
  }

  function handleSearch(value) {
    setSearch(value);
    if (activeView === 'home') {
      setActiveView('series');
    }
  }

  function handleViewChange(view) {
    setActiveView(view);
    if (view === 'movies') {
      setActiveCategory('All Movies');
    }
    if (view === 'series' || view === 'home') {
      setActiveCategory('All Series');
    }
  }

  function openPlayerPage(episode) {
    const params = new URLSearchParams({
      title: episode.title,
      seriesId: String(episode.seriesId)
    });
    window.location.assign(`/player/${episode.id}?${params.toString()}`);
  }

  function openMoviePlayer(movie) {
    if (!movie.hasFile) {
      return;
    }

    window.location.assign(`/movie-player/${movie.id}`);
  }

  function renderPage() {
    if (activeView === 'settings') {
      return h(SettingsPage, {
        initialSettings: settings,
        onSaved: handleSettingsSaved
      });
    }

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

    if (activeView === 'movies') {
      return h(MoviesPage, { movies: filteredMovies, onOpenMovie: openMoviePlayer });
    }

    if (catalogLoading) {
      return h(Spinner, { label: 'Loading catalog' });
    }

    return h(HomePage, {
      categories: catalog.categories,
      series: catalog.series,
      onOpenSeries: openSeries
    });
  }

  const counter = activeView === 'episodes' && selectedSeries
    ? plural(selectedSeries.episodeFileCount, 'available episode')
    : activeView === 'movies'
      ? plural(filteredMovies.length, 'movie')
      : plural(filtered.length, 'series', 'series');

  return h(
    React.Fragment,
    null,
    h(Header, {
      activeView,
      search,
      onHome: () => handleViewChange('home'),
      onSearch: handleSearch,
      onViewChange: handleViewChange
    }),
    h(
      'main',
      null,
      notice ? h('section', { className: 'notice', role: 'status' }, notice) : null,
      h(
        'section',
        { className: `layout ${activeView === 'settings' ? 'settings-layout' : ''}` },
        activeView === 'settings'
          ? null
          : h(Sidebar, {
            categories: categoryList,
            activeCategory,
            onCategoryChange: handleCategoryChange
          }),
        h(
          'section',
          { className: 'content' },
          activeView === 'settings'
            ? null
            : h(
              'div',
              { className: 'section-heading' },
              h(
                'div',
                null,
                h('p', { className: 'eyebrow' }, activeCategory),
                h('h2', null, activeView === 'episodes' && selectedSeries ? selectedSeries.title : activeView === 'movies' ? 'Movies' : activeView === 'home' ? 'Browse' : 'Series')
              ),
              h('div', { className: 'counter' }, counter)
            ),
          renderPage()
        )
      )
    )
  );
}
