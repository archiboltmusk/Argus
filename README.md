# Argus

A fast streaming hub for sources you already have: Stremio-compatible addons,
debrid accounts, Jellyfin/Plex servers, local files and IPTV playlists.
Argus ships with no content of its own.

macOS first, then Windows, Linux, web, Android/iOS and TV.

## Layout

| Path | What |
| --- | --- |
| `crates/argus-core` | Rust core shared by every platform: sources, library (SQLite), playback resolution |
| `apps/desktop` | React UI + Tauri shell (`src-tauri`) for macOS / Windows / Linux |

Business logic lives in the core so every device behaves the same and a bug is fixed once.

## Develop

Requirements: Rust (stable), Node 22, pnpm.

```sh
pnpm install
pnpm dev            # run the desktop app
pnpm test           # core unit tests
cargo test -p argus-core -- --ignored   # live tests against public addons
pnpm build:mac      # build a .dmg (on macOS)
```

Every push builds an unsigned universal `.dmg` in GitHub Actions (CI → artifacts).
First launch of an unsigned build: right-click the app → Open.

## Status

Step 1 of the plan (foundation) is in. Playback currently hands off to an
external player (IINA/VLC/system default); the built-in libmpv player is next.
