import React from 'react';
import { createRoot } from 'react-dom/client';
import { h } from './helpers/react.js';
import { App } from './App.js';

createRoot(document.getElementById('root')).render(
  h(React.StrictMode, null, h(App))
);
