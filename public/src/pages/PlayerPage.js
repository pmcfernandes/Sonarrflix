import React from 'react';
import Plyr from 'plyr';
import { fetchPlayer } from '../helpers/api.js';
import { episodeCode } from '../helpers/format.js';
import { h } from '../helpers/react.js';

export function PlayerPage({ episodeId }) {
  const playerRef = React.useRef(null);
  const [captionScale, setCaptionScale] = React.useState(1);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [playerData, setPlayerData] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchPlayer(episodeId)
      .then((payload) => {
        if (!cancelled) {
          setPlayerData(payload);
          setLoading(false);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [episodeId]);

  React.useEffect(() => {
    if (!playerRef.current || !playerData) {
      return undefined;
    }

    const storageKey = `sonarr-stream-position:${episodeId}`;
    const player = new Plyr(playerRef.current, {
      captions: {
        active: false,
        language: 'auto',
        update: true
      },
      controls: [
        'play-large',
        'rewind',
        'play',
        'fast-forward',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'captions',
        'settings',
        'pip',
        'airplay',
        'fullscreen'
      ],
      keyboard: {
        focused: true,
        global: true
      },
      seekTime: 10,
      settings: ['captions', 'speed']
    });

    player.on('loadedmetadata', () => {
      const savedTime = Number(localStorage.getItem(storageKey) || 0);
      if (savedTime > 5 && savedTime < player.duration - 10) {
        player.currentTime = savedTime;
      }
    });

    player.on('timeupdate', () => {
      if (player.currentTime > 0) {
        localStorage.setItem(storageKey, String(Math.floor(player.currentTime)));
      }
    });

    player.on('ended', () => {
      localStorage.removeItem(storageKey);
    });

    return () => {
      player.destroy();
    };
  }, [episodeId, playerData]);

  if (loading) {
    return h('main', { className: 'player-page' }, h('div', { className: 'player-status' }, 'Loading player...'));
  }

  if (error) {
    return h('main', { className: 'player-page' }, h('div', { className: 'player-status' }, error));
  }

  const { episode, seasonEpisodes = [], series, suggestedSeries = [], subtitles = [] } = playerData;
  const title = `${episodeCode(episode)} / ${episode.title}`;

  function openEpisode(nextEpisode) {
    window.location.assign(`/player/${nextEpisode.id}`);
  }

  function openSeries(nextSeries) {
    window.location.assign(`/?seriesId=${nextSeries.id}`);
  }

  function changeCaptionSize(step) {
    setCaptionScale((currentScale) => Math.min(1.8, Math.max(0.7, Number((currentScale + step).toFixed(1)))));
  }

  return h(
    'main',
    { className: 'player-page', style: { '--caption-scale': captionScale } },
    h(
      'div',
      { className: 'player-topbar' },
      h(
        'button',
        {
          className: 'back-button icon-button',
          type: 'button',
          onClick: () => history.back(),
          'aria-label': 'Go back'
        },
        h('span', { 'aria-hidden': 'true' }, '\u2039')
      ),
      h(
        'div',
        null,
        h('p', { className: 'eyebrow' }, series?.title || 'Now Playing'),
        h('h1', null, title)
      )
    ),
    h(
      'section',
      { className: 'player-stage' },
      h(
        'div',
        { className: 'player-layout' },
        h(
          'div',
          { className: 'player-shell' },
          h(
            'video',
            {
              ref: playerRef,
              className: 'player-video',
              src: `/watch/${episodeId}`,
              controls: true,
              playsInline: true,
              autoPlay: true,
              preload: 'auto'
            },
            subtitles.map((subtitle, index) =>
              h('track', {
                key: subtitle.id,
                kind: 'subtitles',
                label: subtitle.label,
                src: subtitle.src,
                srcLang: subtitle.srclang || 'en',
                default: index === 0
              })
            )
          )
        ),
        h(
          'div',
          { className: 'subtitle-controls', 'aria-label': 'Subtitle size controls' },
          h('span', null, 'Subtitles'),
          h('button', { type: 'button', onClick: () => changeCaptionSize(-0.1), 'aria-label': 'Decrease subtitle size' }, 'A-'),
          h('button', { type: 'button', onClick: () => changeCaptionSize(0.1), 'aria-label': 'Increase subtitle size' }, 'A+')
        ),
        seasonEpisodes.length
          ? h(
              'aside',
              { className: 'player-sidebar' },
              h('h2', null, 'Season Episodes'),
              h(
                'div',
                { className: 'player-season-list' },
                seasonEpisodes.map((seasonEpisode) =>
                  h(
                    'button',
                    {
                      key: seasonEpisode.id,
                      className: `player-season-item ${String(seasonEpisode.id) === String(episode.id) ? 'active' : ''} ${seasonEpisode.hasFile ? '' : 'locked'}`,
                      type: 'button',
                      disabled: !seasonEpisode.hasFile,
                      onClick: () => openEpisode(seasonEpisode)
                    },
                    h('span', { className: 'player-season-code' }, episodeCode(seasonEpisode)),
                    h('strong', { className: 'player-season-title' }, seasonEpisode.title),
                    h(
                      'span',
                      { className: 'player-season-description' },
                      seasonEpisode.overview || seasonEpisode.airDate || (seasonEpisode.hasFile ? 'Ready to play.' : 'Missing episode file.')
                    )
                  )
                )
              )
            )
          : null,
        suggestedSeries.length
          ? h(
              'section',
              { className: 'player-suggestions' },
              h('p', { className: 'eyebrow' }, 'Based on categories'),
              h('h2', null, 'Suggested series'),
              h(
                'div',
                { className: 'player-suggestion-list' },
                suggestedSeries.map((suggestion) => h(SuggestionCard, {
                  key: suggestion.id,
                  series: suggestion,
                  onOpen: openSeries
                }))
              )
            )
          : null
      )
    )
  );
}

function SuggestionCard({ series, onOpen }) {
  return h(
    'button',
    {
      className: 'player-suggestion-card',
      type: 'button',
      onClick: () => onOpen(series)
    },
    h(
      'div',
      { className: 'player-suggestion-thumb' },
      series.backdrop || series.poster
        ? h('img', { src: series.backdrop || series.poster, alt: `${series.title} thumbnail` })
        : h('span', { className: 'player-suggestion-fallback' }, series.title)
    ),
    h(
      'div',
      { className: 'player-suggestion-copy' },
      h('span', { className: 'player-suggestion-code' }, series.genres.slice(0, 3).join(' / ') || 'Series'),
      h('strong', null, series.title),
      h('span', null, series.overview || `${series.episodeFileCount} episodes available.`)
    )
  );
}
