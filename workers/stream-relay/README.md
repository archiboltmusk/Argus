# Argus Web Stream Relay (Cloudflare Worker)

Lightweight CORS & HLS playlist-rewriting edge relay for Argus Web.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/archiboltmusk/Argus/tree/main/workers/stream-relay)

## Manual Deploy

```bash
cd workers/stream-relay
npx wrangler deploy
```

## CI Auto-Deploy

Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to your GitHub repository Secrets, then run the **Deploy Web Stream Relay** workflow (`.github/workflows/relay-worker.yml`).

Then configure Argus Web with the deployed Worker URL via `VITE_ARGUS_STREAM_RELAY_URL` at build time or in **Settings → Player → Web stream relay & transcode**.
