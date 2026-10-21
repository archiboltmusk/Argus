# Argus

**One view of every stream you have.**

In Greek myth, *Argus Panoptes* was the hundred-eyed giant who saw everything at once.
Argus the app does the same for your media. It shows Stremio-compatible addons, debrid
accounts, Plex/Jellyfin servers, local files and IPTV playlists in one fast,
unified library, and it plays all of them in one high-quality player.

Argus ships with **no content and no built-in sources**. You connect the addons,
accounts, servers and playlists you already use and have rights to.

Platforms: **macOS first** (Apple Silicon, signed `.dmg`), then Windows, Linux, web, Android/iOS and TV
(Android TV/Fire TV, tvOS, webOS, Tizen).

---

## Why another streaming hub?

Stremio, Nuvio and Argus all speak the same addon protocol, so addons alone don't set a
hub apart. The difference is whether things keep working. Argus is built around the bugs
users hit most in those apps:

| Common problem | Argus approach |
| --- | --- |
| "Streaming server offline" | No separate server process. Torrent and HTTP streaming run inside the Rust core |
| Infinite buffering | If playback stalls for more than 8 s, Argus offers the next-ranked stream. One key switches and resumes at the same position |
| Washed-out colors / broken HDR on Mac | libmpv renders natively, not inside the WebView |
| Wrong audio track, silent DTS, drifting subtitles | Audio and subtitle choices remembered per show, sync offsets saved per file, codec shown before you press play |
| Unsigned builds, revoked certificates, slow fixes | Signed and notarized builds, signed delta auto-updates, weekly release train |
| One slow addon blocks everything | Every addon queried in parallel with its own 6 s deadline |

---

## Features

Status: ✅ done · 🚧 in progress · 📋 planned. Every 🔌 feature is a **toggle** you can
switch off in Settings, and it can be removed from the build entirely if it proves buggy or slow.

### Mac v1

| # | Feature | Status |
| --- | --- | --- |
| 1 | Stremio addon client: install by URL or `stremio://` link, plus catalogs, meta, streams and subtitles. Slow addons never block | ✅ |
| 2 | Stream ranking: cached-on-debrid first, then resolution, HDR/Dolby Vision, codec, release type, size and seeders. Audio codec and channels on every card. Pinned filters | ✅ |
| 3 | Debrid: Real-Debrid, AllDebrid, Premiumize, TorBox. Device-code/PIN sign-in, batch cache check | 🚧 |
| 4 | libmpv player: HDR10/DV passthrough, SDR tonemap, trickplay, skip intro/credits, native PiP, remappable hotkeys | 📋 |
| 5 | Stall fallback to the next stream, resuming at the same position | 📋 |
| 6 | Subtitles: addon, embedded and local files. Forced tracks, ±50 ms sync saved per file, dual subtitles, style presets | 🚧 |
| 7 | Audio: language remembered per show, stereo downmix, DTS/TrueHD with no silent failures | 📋 |
| 8 | Trakt + Simkl: scrobble at 80%, two-way history sync | 📋 |
| 9 | Profiles: up to 8, optional PIN, separate addons/history/preferences | 🚧 |
| 10 | Continue watching, next-episode queue, calendar of upcoming episodes | 🚧 |
| 11 | External players: IINA, VLC, Infuse, with resume position | 🚧 |
| 12 | Local folders, Plex and Jellyfin, with metadata matching | 🚧 |
| 13 | IPTV: M3U, Xtream, XMLTV EPG grid, favorites, catchup | 🚧 |
| 14 | Offline downloads: pause/resume, storage cap | 📋 |

### Optional extras (🔌 toggles, after v1)

- 🔌 Watch party with synced playback
- 🔌 Discord Rich Presence and Telegram notifications
- 🔌 Theme Studio: presets, custom colors and fonts
- 🔌 yt-dlp integration, using your own installed copy
- 🔌 Plugin system for user-installed extensions. No sources are bundled

### Roadmap (🔌 toggles, after v1)

**Playback**
- Skip intro/credits via IntroDB / AniSkip
- Auto-next episode with a "still watching?" prompt
- Anime4K / FSR upscaling shaders
- HDR→SDR tone mapping, Dolby Vision profile 5 color fix
- Audio normalization and night mode
- Picture-in-picture, mini player, always on top
- Remember speed and tracks per show

**Subtitles**
- OpenSubtitles and SubDL search
- Local Whisper subtitle generation
- AI subtitle translation
- Sync slider and style editor
- Dual subtitles

**Streams**
- Auto-pick the best stream by your rules (prefer cached on debrid)
- Mid-play fallback to the next stream
- Debrid-Link support
- Usenet via TorBox / NZB

**Discovery**
- Unified search across every source
- AI recommendations and "more like this"
- Trailers and cast pages
- IMDb, Rotten Tomatoes and Letterboxd ratings
- Upcoming-episode calendar with alerts
- Watchlist import from Letterboxd, IMDb and Simkl

**Sync and devices**
- MyAnimeList, AniList, Simkl and Letterboxd scrobbling
- Self-hostable cloud sync of settings and addons
- Chromecast, AirPlay and DLNA casting
- Phone as a remote
- Cross-device playback handoff

**Library and offline**
- Smart collections and custom lists
- Download queue with quality choice and a Wi-Fi-only option
- Local media scanner with metadata matching

**Social**
- Profiles with kids mode and PIN
- Shared lists
- Watch stats and a yearly "Wrapped"

**Speed and reliability**
- Instant resume, next-episode prefetch
- Player in its own process, so a crash never takes down the app
- One-click diagnostics and log export (tokens redacted)

**Customization**
- Shortcut editor
- Gamepad and TV-remote navigation
- Plugin SDK

### Performance budgets

- Cold start to interactive home: < 1.5 s (M1)
- Click Play to first frame: < 2 s on cached debrid, < 3 s on direct HTTP
- RAM: < 250 MB idle, < 600 MB during 4K playback
- `.dmg` < 60 MB, with no Node runtime bundled
- No telemetry by default. Crash reports are opt-in. API keys live in the macOS Keychain

---

## Plan

1. **Foundation** ✅: Rust core, desktop shell, CI building a `.dmg`
2. **Mac v1** 🚧: the 14 features above, then the optional extras
3. **Hardening and release**: tests, crash reporting, signing and notarization, auto-update, a review of which features to cut
4. **Every other platform**: Windows/Linux, then web, Android/iOS, then TV

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Core | Rust (`crates/argus-core`) | One implementation of sources, ranking, library and sync for every platform, so a bug is fixed once |
| Desktop shell | Tauri 2 (`apps/desktop/src-tauri`) | Small native binary with no bundled Chromium. The shell holds no business logic |
| UI | React 19 + TypeScript + Vite (`apps/desktop/src`) | Reused by web, desktop and (later) mobile shells |
| Player | libmpv | Plays every codec, handles HDR/DV and has accurate subtitles |
| Storage | SQLite (WAL), versioned migrations | Fast local library, works offline |
| Torrent streaming | In-process engine in the core | No separate server process to go offline |

## Repository layout

| Path | What |
| --- | --- |
| `crates/argus-core/src/sources` | Addon protocol, debrid providers, Jellyfin, local files, IPTV |
| `crates/argus-core/src/ranking.rs` | Stream label parsing, filters and ranking |
| `crates/argus-core/src/library.rs` | Profiles, addons, progress, settings |
| `apps/desktop` | React UI and Tauri shell |

## Develop

Requirements: Rust (stable), Node 22, pnpm. On Linux, the Tauri system packages are also needed
(`libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev`).

```sh
pnpm install
pnpm dev                                  # run the desktop app
pnpm test                                 # core unit tests
cargo test -p argus-core -- --ignored     # live tests against public addons
pnpm build:mac                            # build a .dmg (on macOS)
```

Every push builds an unsigned Apple Silicon `.dmg` in GitHub Actions (CI → artifacts).
To open an unsigned build the first time, right-click the app and choose Open.

---

## Lineage

Argus is built on [Harbor](https://github.com/harborstremio/harbor) (MIT) with its own
branding, updater and packaging. Harbor-hosted services and artwork are not used.
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
