require('dotenv').config();

const path = require('path');
const express = require('express');

const appRoutes = require('./api/app');
const healthRoutes = require('./api/health');
const imageRoutes = require('./api/images');
const playerRoutes = require('./api/player');
const seriesRoutes = require('./api/series');
const settingsRoutes = require('./api/settings');
const watchRoutes = require('./api/watch');
const { config } = require('./helpers/config');

const app = express();

app.use(express.json());
app.use(express.static(config.publicDir));
app.use('/api', appRoutes);
app.use('/api', healthRoutes);
app.use('/api', imageRoutes);
app.use('/api', playerRoutes);
app.use('/api', seriesRoutes);
app.use('/api', settingsRoutes);
app.use(watchRoutes);

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(config.publicDir, 'index.html'));
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Stream catalog running on http://localhost:${config.port}`);
});
