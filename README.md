# Argus

**One view of every stream you have.**

[![Release](https://img.shields.io/github/v/release/archiboltmusk/Argus?style=flat-square&color=blue)](https://github.com/archiboltmusk/Argus/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![CI Status](https://img.shields.io/github/actions/workflow/status/archiboltmusk/Argus/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/archiboltmusk/Argus/actions)

In Greek myth, *Argus Panoptes* was the hundred-eyed giant who saw everything at once.
Argus the app does the same for your media. It unifies Stremio-compatible addons, direct indexer scrapers (Prowlarr / Jackett Torznab), debrid clouds, Plex/Jellyfin servers, local libraries and IPTV playlists in one blazing-fast player with intelligent fallback and zero buffering.

Argus ships with **no content and no built-in sources**. You connect the addons, accounts, indexers, servers and playlists you already use and have rights to.

Platforms: **macOS** (Apple Silicon & Intel, signed `.dmg`), **Windows** (`.msi` / `.exe`), **Linux** (`.AppImage` / `.deb`), **Android** (`.apk`), and **Web**.

---

## Why Argus?

Traditional streaming hubs break when an addon fails, streams stall, or links mismatch. Argus solves the core frustrations of decentralized media streaming:

| Frustration | Argus Solution |
| --- | --- |
| **"Streaming server offline"** | Zero separate background daemons. High-performance torrent and HTTP streaming run embedded inside the Rust core. |
| **Dead / 0-Seeder links** | **Automatic zero-seeder filtering** hides dead torrents; dead-link purge applies permanent score penalties. |
| **Wrong / Mismatched stream chosen** | **Verified Working Link Marker (Thumbs-Up)** gives streams a permanent **+150 score boost** across future episode searches. |
| **Stalls & Mid-play buffering** | Multi-CDN prewarming and dynamic standby links. Stall detection offers one-click seamless stream switching. |
| **Lost context when resuming** | **Smart Resume 5-second micro-rewind** gently rolls back dialogue position so you never miss a beat. |
| **Muffled dialogue or harsh audio** | **10-Band Graphic Equalizer**, Neural Whisper vocal isolation, and dynamic dialogue auto-ducking. |
| **Scrubbing blindly** | **Audio & Action Energy Heatmap** overlaid right on the seekbar reveals dialog, action, and quiet moments at a glance. |
| **External Indexer Independence** | Direct **Prowlarr & Jackett Torznab scrapers** built right in, so you aren't reliant on public Stremio addons. |

---

## Shipped Capabilities & Key Features

### 🎯 Intelligent Stream Curation & Anti-Dead Link System
- **Verified Correct Link Marking (Thumbs-Up)**: User-voted correct streams receive an instant **+150 score boost**, pinning the working link to the top of subsequent episodes.
- **Dead Link Demotion (Skull Purge)**: Instantly demote broken or non-functioning links with a **-200 score penalty**.
- **Auto-Filter 0-Seeder Torrents**: Toggle to automatically purge dead torrent links with 0 seeders from candidate lists.
- **Title Disambiguation Engine**: Filters out mismatched shows or movies returned by third-party plugins.
- **Direct Torznab Scrapers**: One-click local indexer integration for Prowlarr (`localhost:9696`) and Jackett (`localhost:9117`).
- **Parallel Speed & Availability Probing**: Probes candidate links in the background before playback to ensure instantaneous start times.

### 🎬 Player & Audio Experience (libmpv Core)
- **Smart Resume 5s Micro-Rewind**: Rewinds 5 seconds upon resume to restore conversation context without manual scrubbing.
- **10-Band Graphic Equalizer**: Fine-tune 32 Hz to 16 kHz audio bands with persistent profiles for bass boost, vocal clarity, and night mode.
- **Seekbar Energy Heatmap**: Visualizes audio peaks, dialogue density, and high-action sequences directly on the timeline.
- **3D Spatial Binauralizer**: Immersive spatial audio processing for standard headphones.
- **Neural Dialogue Isolation**: Real-time vocal extraction and dialogue auto-ducking sidechain so whispered lines are crisp and loud effects don't overpower.
- **Native HDR10 & Dolby Vision**: Passthrough and tone-mapping powered by libmpv natively outside the webview.
- **AniSkip / IntroDB Integration**: Seamlessly skip anime openings, endings, and recap segments.

### 🌐 Universal Sources & Debrid Cloud
- **Debrid Providers**: Real-Debrid, AllDebrid, Premiumize, TorBox, and Debrid-Link with parallel cache verification.
- **Stremio Addon Ecosystem**: Full support for `stremio://` and HTTPS addon manifests with non-blocking async queries (6 s per-addon deadline).
- **Local Media & Media Servers**: Plex, Jellyfin, and local folder scanning with instant metadata matching.
- **IPTV & Live TV**: M3U, Xtream codes, and XMLTV EPG grid with DVR capabilities.

### 🔄 Sync, Profiles & Privacy
- **Multi-Tracker Scrobbling**: Trakt, Simkl, MyAnimeList, and AniList two-way history sync.
- **Multi-Profile Support**: Up to 8 isolated profiles with dedicated PIN protection, kids mode, and separate preferences.
- **Zero Telemetry**: No tracking, analytics, or background call-homes. Debrid API keys and credentials are saved securely in local storage / OS Keychain.

---

## Performance Targets

- **Cold Start**: < 1.5 s to interactive home screen.
- **Time to First Frame**: < 2.0 s on cached debrid, < 3.0 s on direct HTTP.
- **Memory Footprint**: < 250 MB idle, < 600 MB during full 4K playback.
- **Binary Footprint**: Lean native binary without bundled Chromium.

---

## Tech Stack

| Layer | Technology | Role |
| --- | --- | --- |
| **Core** | Rust (`argus-core`) | In-process torrent client, stream ranking, cache verification, and SQLite library |
| **Shell** | Tauri 2 (`src-tauri`) | Lightweight cross-platform desktop & mobile wrapper |
| **Frontend** | React 19 + TypeScript + Vite (`src`) | High-performance, responsive UI shared across Desktop, Mobile, and Web |
| **Player Engine** | libmpv | Multi-codec hardware decoding, HDR/DV passthrough, and shader support |
| **Database** | SQLite (WAL mode) | Local caching, library metadata, stream markers, and watch progress |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v22+)
- [pnpm](https://pnpm.io/) (the version pinned in `package.json`, currently 11.9.0)
- [Rust](https://www.rust-lang.org/) (Stable toolchain)
- *Linux only*: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `librsvg2-dev`
- *macOS*: Xcode command-line tools and system libmpv (`brew install mpv pkg-config`).

### Development

```sh
# Clone repository
git clone https://github.com/archiboltmusk/Argus.git
cd Argus

# Install dependencies
pnpm install

# Run in desktop development mode (Tauri + Vite)
pnpm tauri dev

# Frontend only (without the native desktop shell)
pnpm dev

# Run unit and integration tests
pnpm test

# Run Rust core tests
cargo test --manifest-path argus-core/Cargo.toml
```

### Packaging Builds

```sh
# On Windows
pnpm tauri build --bundles nsis,msi
# On Linux with the system dependencies installed
pnpm tauri:build:linux-system
```

For macOS release builds, first stage libmpv and its dependent libraries with
`scripts/macos-bundle-libmpv.py prepare`. Set `ARGUS_MACOS_LIB_DIR` to the reported
link directory, set `ARGUS_MACOS_FRAMEWORKS_DIR` to the staged frameworks directory,
and pass the generated configuration to `pnpm tauri build`. The complete prepare,
build, and verification sequence is in `.github/workflows/ci.yml`. Build each
architecture with its matching toolchain and libraries.

`pnpm test` runs a pretest hook that fills missing translation fallback strings
and can modify `src/lib/i18n/locales/ui-fallback.ts`. Review those changes before
committing. To run a focused test without that hook, invoke the Node test runner
with the environment and loader options from the `test` script in `package.json`.

---

## Responsibility & Legal

Argus ships with **no streaming sources, scrapers, catalogs, or media content of any kind**. Addons, plugins, and custom indexers are installed and configured exclusively by the end user. Users are entirely responsible for the sources they configure and for adhering to the applicable laws in their jurisdiction. Peer-to-peer uploading (seeding) is disabled by default. See [LEGAL.md](LEGAL.md).

## License

Argus is released under the [MIT License](LICENSE). Third-party software notices and attribution can be found in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
