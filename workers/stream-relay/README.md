# Argus Web Stream Relay (Cloudflare Worker)

Lightweight CORS & HLS playlist-rewriting edge relay for Argus Web.

## Deploy

```bash
cd workers/stream-relay
npx wrangler deploy
```

Then configure Argus Web with the deployed Worker URL via `VITE_ARGUS_STREAM_RELAY_URL` at build time or `localStorage.setItem("argus.webStreamRelayUrl", "https://your-worker.workers.dev")` at runtime.
