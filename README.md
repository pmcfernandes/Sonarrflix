# Sonarr Stream Catalog

Local Node.js app for browsing a Sonarr catalog in a Netflix-style interface.

## Features

- Home view with category rails.
- Series grid with search.
- Series detail view grouped by season and episode.
- React frontend organized into pages, components, and helpers.
- Sonarr poster/fanart image proxy.
- Optional episode playback through `/watch/:episodeId` when the Sonarr file path is readable by this machine and the browser supports the video format.

## Setup

Create `.env` from `.env.example`:

```env
PORT=3000
SONARR_URL=http://localhost:8989
SONARR_API_KEY=your_sonarr_api_key
```

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

Many `.mkv` files will not play directly in some browsers. For a stronger media server experience, use this as the catalog layer and pair playback with Jellyfin, Plex, or transcoding later.
