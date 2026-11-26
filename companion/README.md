# Argus Web Companion Server

Self-hosted stream proxy and real-time `ffmpeg` H.264/AAC remux & transcode server for **Argus Web**, enabling MKV, HEVC, AC3, EAC3, and DTS movie playback in standard browsers.

## Run with Docker

```bash
cd companion
docker build -t argus-companion .
docker run --rm -p 8787:8787 argus-companion
```

Or directly with Node.js + `ffmpeg` installed:

```bash
node companion/server.mjs
```

Configure Argus Web via `VITE_ARGUS_COMPANION_URL=http://localhost:8787` or at runtime with `localStorage.setItem("argus.webCompanionUrl", "http://localhost:8787")`.
