import React from 'react';
import { h } from '../helpers/react.js';

export function PlayerDialog({ episode, onClose }) {
  const dialogRef = React.useRef(null);
  const videoRef = React.useRef(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    const video = videoRef.current;

    if (!dialog || !video) {
      return;
    }

    if (episode && !dialog.open) {
      dialog.showModal();
      video.play().catch(() => {});
    }

    if (!episode && dialog.open) {
      dialog.close();
    }
  }, [episode]);

  function handleClose() {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    onClose();
  }

  return h(
    'dialog',
    { className: 'player-dialog', ref: dialogRef, onClose: handleClose },
    h(
      'div',
      { className: 'player-shell' },
      h('button', { className: 'close-button', type: 'button', onClick: handleClose, 'aria-label': 'Close player' }, 'x'),
      h('video', {
        ref: videoRef,
        src: episode ? `/watch/${episode.id}` : undefined,
        controls: true,
        playsInline: true
      }),
      h('p', { id: 'playerTitle' }, episode?.title || '')
    )
  );
}
