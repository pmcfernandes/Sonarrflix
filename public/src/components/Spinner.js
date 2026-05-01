import { h } from '../helpers/react.js';

export function Spinner({ label = 'Loading...' }) {
  return h(
    'div',
    { className: 'spinner-overlay', role: 'status', 'aria-label': label },
    h(
      'div',
      { className: 'spinner-container' },
      h(
        'svg',
        {
          className: 'spinner-circle',
          viewBox: '0 0 50 50',
          width: '56',
          height: '56',
          'aria-hidden': 'true'
        },
        h('circle', {
          className: 'spinner-track',
          cx: '25',
          cy: '25',
          r: '20',
          fill: 'none',
          strokeWidth: '3'
        }),
        h('circle', {
          className: 'spinner-arc',
          cx: '25',
          cy: '25',
          r: '20',
          fill: 'none',
          strokeWidth: '3',
          strokeLinecap: 'round'
        })
      ),
      label ? h('span', { className: 'spinner-label' }, label) : null
    )
  );
}
