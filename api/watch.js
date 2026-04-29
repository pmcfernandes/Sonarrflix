const express = require('express');
const { sonarrFetch } = require('../helpers/sonarr');
const { streamVideo } = require('../helpers/video');

const router = express.Router();

router.get('/watch/:episodeId', async (req, res) => {
  try {
    const episode = await sonarrFetch(`episode/${Number(req.params.episodeId)}`);
    if (!episode.hasFile || !episode.episodeFileId) {
      res.status(404).json({ error: 'This episode does not have a file in Sonarr.' });
      return;
    }

    const episodeFile = await sonarrFetch(`episodefile/${episode.episodeFileId}`);
    if (!episodeFile.path) {
      res.status(404).json({ error: 'Sonarr did not return a file path for this episode.' });
      return;
    }

    streamVideo(req, res, episodeFile.path);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

module.exports = router;
