# Sonarrflix

Local Node.js app for browsing and play Sonarr and Radarr catalogs in a Netflix-style interface.

## Features

- Home view with category rails.
- Series grid with search.
- Movies grid with search.
- Series detail view grouped by season and episode.
- Radarr movie playback through the same web player.
- React frontend organized into pages, components, and helpers.
- Sonarr poster/fanart image proxy.
- Optional episode playback through `/watch/:episodeId` when the Sonarr file path is readable by this machine and the browser supports the video format.

## Setup

Create `.env` from `.env.example`:

```env
PORT=3000
MEDIA_PATH_MAPPINGS=/media=Z:/
```

Sonarr and Radarr URLs/API keys are configured in the app Settings page and saved to SQLite at `data/app.sqlite`.

Find the API key in Sonarr:

```text
Settings > General > Security > API Key
```

Install and run:

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

On first run, or when neither Sonarr nor Radarr can be reached with the saved settings, the app opens Settings instead of Home.

## Frontend Structure

The browser app lives in `public/src`:

```text
public/src/App.js
public/src/components/
public/src/helpers/
public/src/pages/
```

React is loaded through the import map in `public/index.html`, so the app does not need a local frontend build step yet. A later move to Vite can keep the same folder structure.

## Playback Notes

Sonarr is a catalog manager, not a streaming server. This app can stream a file only if:

- Sonarr returns an episode file path.
- The Node app runs on a machine that can read that path.
- The file extension is a browser-friendly video type such as `.mp4` or `.webm`.
