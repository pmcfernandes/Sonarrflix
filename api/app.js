const path = require('path');
const express = require('express');
const { config } = require('../helpers/config');

const router = express.Router();

router.get('/app', (_req, res) => {
  res.sendFile(path.join(config.publicDir, 'index.html'));
});

module.exports = router;
