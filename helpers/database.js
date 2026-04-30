const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { config, normalizeBaseUrl } = require('./config');

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

const database = new DatabaseSync(config.databasePath);
database.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

const getSettingStatement = database.prepare('SELECT value FROM settings WHERE key = ?');
const upsertSettingStatement = database.prepare(`
  INSERT INTO settings (key, value)
  VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);

function getSetting(key) {
  return getSettingStatement.get(key)?.value || '';
}

function setSetting(key, value) {
  upsertSettingStatement.run(key, String(value || ''));
}

function getSettings() {
  const sonarrUrl = normalizeBaseUrl(getSetting('sonarrUrl'));
  const sonarrApiKey = getSetting('sonarrApiKey');
  const radarrUrl = normalizeBaseUrl(getSetting('radarrUrl'));
  const radarrApiKey = getSetting('radarrApiKey');

  return {
    configured: Boolean((sonarrUrl && sonarrApiKey.trim()) || (radarrUrl && radarrApiKey.trim())),
    sonarrUrl,
    sonarrApiKey,
    radarrUrl,
    radarrApiKey
  };
}

function saveSettings(settings) {
  setSetting('sonarrUrl', normalizeBaseUrl(settings.sonarrUrl));
  setSetting('sonarrApiKey', settings.sonarrApiKey);
  setSetting('radarrUrl', normalizeBaseUrl(settings.radarrUrl));
  setSetting('radarrApiKey', settings.radarrApiKey);
  return getSettings();
}

module.exports = {
  getSettings,
  saveSettings
};
