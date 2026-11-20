# Argus

**One view of every stream you have.**

**[Download the latest stable release](https://github.com/archiboltmusk/Argus/releases/latest)** · [Preview releases](https://github.com/archiboltmusk/Argus/releases)

[![Release](https://img.shields.io/github/v/release/archiboltmusk/Argus?style=flat-square&color=blue)](https://github.com/archiboltmusk/Argus/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![CI Status](https://img.shields.io/github/actions/workflow/status/archiboltmusk/Argus/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/archiboltmusk/Argus/actions)

Argus is an open-source media player and library for the sources you already use. Bring local files, Plex or Jellyfin libraries, Stremio-compatible add-ons, and IPTV playlists into one place. Argus ranks available streams and can offer an alternate source when playback stalls.

## Start watching

1. Open the [latest stable release](https://github.com/archiboltmusk/Argus/releases/latest) and download an installer listed for your platform. Use the [download matrix](#platform-build-targets--download-matrix) to identify the right asset. Apple Silicon Mac users should look for `Argus-aarch64.dmg`.
   * **macOS Turnkey Command** (automatically downloads, installs to `/Applications`, strips quarantine attributes, and resolves Gatekeeper warnings):
     ```bash
     curl -fsSL https://raw.githubusercontent.com/archiboltmusk/Argus/main/scripts/install-mac.sh | bash
     ```
   * *If you already have `Argus.app` installed and macOS blocks it*:
     ```bash
     curl -fsSL https://raw.githubusercontent.com/archiboltmusk/Argus/main/scripts/fix-gatekeeper.sh | bash
     ```
2. Start with a local video you own or an authorized direct media URL. Builds that include the [welcome-screen playback shortcut](https://github.com/archiboltmusk/Argus/pull/178) let you do this during setup. In earlier builds, finish setup and use the local library for your own files.
3. When you want to add more sources, connect the servers, accounts, playlists, or add-ons you use. Argus ships without streaming sources. The welcome screen includes a first-party playback sample on builds that bundle it.

[Build from source](#getting-started) · [Contribute](CONTRIBUTING.md) · [Report a bug](https://github.com/archiboltmusk/Argus/issues/new?template=bug_report.yml)

## Integration notes

### Education content

Practice Questions works with the included Argus starter set. Bring your own files and question packs if you have permission to use them. Third-party test papers and solution PDFs require files you supply. Argus's software license does not grant rights to third-party content.

Before adding educational content to a public build, record its author, source, license or written redistribution permission, and required attribution. Review those records for images and explanations as well as questions. For public videos, use the publisher's own page or their authorized embed.

### App identity on connected services

Argus identifies itself as Argus in the app and browser. Some default integrations use services hosted by Harbor. Their domain, consent screens and activity logs may show Harbor.

To ship with your own third-party app identity, register **Argus** in the provider's developer console and set the following public build variables. For GitHub builds, add them under **Settings → Secrets and variables → Actions → Variables**. Register the exact redirect URL with the provider and keep client secrets in the token proxy.

| Integration | Build variables |
| --- | --- |
| Trakt | `VITE_ARGUS_TRAKT_CLIENT_ID`, `VITE_ARGUS_TRAKT_BASE` |
| MyAnimeList | `VITE_ARGUS_MAL_CLIENT_ID`, `VITE_ARGUS_MAL_BASE`. The redirect path is `/mal/`. |
| TheTVDB | `VITE_ARGUS_TVDB_BASE` |
| Together | `VITE_ARGUS_PUBLIC_RELAY` for the WebSocket relay and `VITE_ARGUS_RELAY_BASE` for invite links |
| Argus account and rankings | `VITE_ARGUS_API_BASE` |

Verify the identity with a fresh sign-in on a build using your registered credentials. Existing service sessions can retain the identity under which they were originally authorized.

Build targets (availability varies by release; packaging does not establish device compatibility): **Apple** (iOS, iPadOS, macOS, watchOS, tvOS, visionOS), **Android** (Google TV, Fire TV, Projectors, Mobile), **Smart TVs** (Samsung Tizen, LG webOS, Hisense VIDAA, Philips Titan OS, Panasonic, Roku), **Windows**, **Linux**, and **Web TV**.

### Worldwide communities

**LifeMaxxing → Community & Public Discovery** (also available under
**Argus Observatory → Community**) supports live public web discovery for any place, worldwide
place search, and private improvement drafts, including offline place entry.
Web findings retain source links and retrieval times and start unverified.
Reviewed service adapters cover Purulia / Parishkar, New York City, and Slovakia's
municipal-service directory. Purulia's sourced district data is the first native
civic-data integration. Services without a reviewed adapter remain explicitly
unconnected. See [architecture and migration notes](docs/purulia-integration.md).

---

## Platform Build Targets & Download Matrix

Only assets present in the selected stable release are downloadable. Targets below are not a device-tested compatibility guarantee. Generate a release-specific evidence matrix with `node scripts/platform-support.mjs release.json support.md device-evidence.json`; device evidence must match the exact release and link to a test report. No physical-device certification is claimed by CI alone.

| Platform / Ecosystem | Target Devices | Build / Download Format | Install / Sideload Method |
| --- | --- | --- | --- |
| **Apple iOS** | iPhone (iOS 16.0+) | `Argus-iOS-iPadOS.ipa` | Sideload via AltStore / SideStore / Sideloadly / TrollStore |
| **Apple iPadOS** | iPad, iPad Pro, iPad Air, iPad mini (iPadOS 16.0+) | `Argus-iOS-iPadOS.ipa` | Sideload via AltStore / SideStore / Sideloadly / TrollStore |
| **Apple macOS** | Apple Silicon & Intel Mac | `Argus-aarch64.dmg` | Drag to `/Applications` or run turnkey curl installer (`scripts/install-mac.sh`) |
| **Apple watchOS** | Apple Watch Series 4+, SE, Ultra (watchOS 9.0+) | `Argus-AppleWatch-watchOS.ipa` | Sideload via Xcode / Apple Watch Companion |
| **Apple tvOS** | Apple TV 4K & Apple TV HD (tvOS 17.0+) | `Argus-AppleTV-tvOS.ipa` | Sideload via Xcode (over Wi-Fi) or Apple Configurator |
| **Apple visionOS** | Apple Vision Pro (visionOS 1.0+) | `Argus-VisionPro-visionOS.ipa` | Sideload via Xcode (over Wi-Fi) or Reality TestFlight |
| **Google TV / Android TV** | Sony, TCL, Xiaomi Mi TV, Chromecast with Google TV | `Argus-AndroidTV-arm64.apk` | `adb install Argus-AndroidTV-arm64.apk` or via *Downloader* app |
| **Amazon Fire TV** | Fire TV Stick 4K / Max, Fire TV Cube, Fire Edition TVs | `Argus-AndroidTV-arm64.apk` | Sideload via *Downloader* code or ADB |
| **Smart Projectors** | Portronics Beem 470, Wanbo, Egate, XGIMI, Nebula | Universal TV `.apk` (with Projector Mode) | Sideload via USB drive or ADB |
| **Samsung Smart TV (Tizen)** | Samsung Smart TVs (Tizen OS 5.5+) | `Argus-Samsung-Tizen.wgt` | Install via Tizen Studio / Device Manager |
| **LG Smart TV (webOS)** | LG OLED / QNED / NanoCell (webOS 5.0+) | `Argus-LG-webOS.zip` / `.ipk` | Sideload via webOS Dev Manager |
| **Hisense Smart TV (VIDAA / Home OS)** | Hisense & Toshiba Smart TVs (VIDAA U4+) | `Argus-Hisense-VIDAA.zip` | Sideload via USB / VIDAA Dev Mode |
| **Philips Smart TV (Titan OS)** | Philips Ambilight & TP Vision TVs | `Argus-Philips-TitanOS.zip` | Install via USB / Titan OS Dev Portal |
| **Panasonic Smart TV (My Home Screen)** | Panasonic OLED & 4K LED TVs | `Argus-Panasonic-MyHomeScreen.zip` | Sideload via USB / Firefox WebApp manager |
| **Roku OS** | Roku Streaming Stick, Ultra, Streambar, Roku TVs | `Argus-Roku-Channel.zip` | Sideload via Roku Developer Mode (`http://<roku-ip>`) |
| **10-Foot Standalone Web TV** | Self-hosted on local NAS, Raspberry Pi, Home Server | `Argus-WebTV-10foot-standalone.zip` | Extract and host via Nginx / Caddy / static HTTP |
| **Windows Desktop** | Windows 10/11 & Handhelds (ROG Ally, Legion Go) | `Argus-windows-x64-setup.exe` / `.msi` | Standard NSIS / MSI installer |
| **Linux Desktop** | Ubuntu/Debian, Fedora, Arch, Steam Deck | `Argus-linux-x64.AppImage` / `.deb` | `chmod +x *.AppImage && ./*.AppImage` |
| **Android Mobile & Tablet** | Android phones, tablets, foldables | `Argus-android-arm64.apk` | Direct sideload `.apk` |

### In-App Update vs. Fresh Download Rule

* **In-App Auto-Update is Sufficient (No Fresh Download)**:
  * **macOS, Windows, and Linux Desktop**: Existing users do not need to re-download installers. Argus updates itself in-place via **Settings → Updates**. Watch progress, addons, and settings are preserved.
  * **Self-Hosted Web TV & PWA**: Reload the browser page or refresh cache; updates apply immediately.
* **Fresh Download / Sideload Required**:
  * **Android TV, Google TV, Fire TV & Projectors**: Sideload the new `Argus-AndroidTV-arm64.apk` over your existing installation.
  * **Android Mobile & Tablet**: Sideload `Argus-android-arm64.apk` over the existing app.
  * **Apple Ecosystem (iOS, iPadOS, tvOS, visionOS, watchOS)**: Sideload the new `.ipa` via AltStore, SideStore, Sideloadly, or TrollStore.
  * **Smart TVs (Samsung Tizen, LG webOS, Hisense VIDAA, Philips Titan OS, Panasonic)**: Re-push the new `.wgt` or `.zip` bundle via developer mode / USB.

---

## Why Argus?

Traditional streaming hubs break when an addon fails, streams stall, or links mismatch. Argus solves the core frustrations of decentralized media streaming:

| Frustration | Argus Solution |
| --- | --- |
| **"Streaming server offline"** | Zero separate background daemons. High-performance torrent and HTTP streaming run embedded inside the Rust core. |
| **Dead / 0-Seeder links** | **Automatic zero-seeder filtering** hides dead torrents; dead-link purge applies permanent score penalties. |
| **Wrong / Mismatched stream chosen** | **Verified Working Link Marker (Thumbs-Up)** gives streams a permanent **+150 score boost** across future episode searches. |
| **Stalls & Mid-play buffering** | Multi-CDN prewarming and dynamic standby links. Stall detection offers an in-player option to switch sources. |
| **Lost context when resuming** | **Smart Resume 5-second micro-rewind** gently rolls back dialogue position to give dialogue more context. |
| **Muffled dialogue or harsh audio** | **10-Band Graphic Equalizer**, Neural Whisper vocal isolation, and dynamic dialogue auto-ducking. |
| **Scrubbing blindly** | **Audio & Action Energy Heatmap** overlaid right on the seekbar reveals dialog, action, and quiet moments at a glance. |
| **External Indexer Independence** | Direct **Prowlarr & Jackett Torznab scrapers** built right in, so you aren't reliant on public Stremio addons. |
| **Navbar Clutter / Cognitive Overload** | **1-Click Workspace Personas** (Academic, Theater, Studio, Omni) toggle your layout instantly. |

---

## Workspace Personas (Focus Modes)

Argus adapts to what you are doing without forcing an 18-tab clutter:

* 🎓 **Argus Academic (Medical & Higher Ed)**: Streamlines the UI to study essentials: Dual-Pane Workstation, 5-Tier Clinical Autopsy, FSRS Spaced Repetition, Lecture Chapters, and Notes.
* 🎬 **Argus Theater (Cinema & Media)**: Focuses exclusively on media catalogs, movies, series, anime, and live broadcast playback powered by the native `libmpv` hardware engine.
* 🎮 **Argus Studio & Gaming**: Dedicated to lossless high-fidelity music queues, game library tracking, and system lab performance telemetry.
* 🌐 **Omni Workspace**: Full multi-module suite for power users.

---

## Shipped Capabilities & Key Features

### 🎓 Academic Workstation & Medical Learning Engine
- **Dual-Pane Study Workstation**: Video lectures on the left, synchronized interactive digital companion notes or workbook slides on the right.
- **5-Tier Clinical Autopsy & Distractor Inversion**: Break down board-style questions with high-yield clinical rules, examiner trap radar, and differential comparison tables.
- **Interactive Socratic Challenge**: On-demand Socratic drill to examine why specific distractors fail and reinforce key discriminators.
- **Free Spaced Repetition (FSRS) & Anki Export**: Track daily retention with the built-in FSRS engine and export ready-to-import flashcard decks in one click.
- **Offline ASR Whisper Subtitles**: Generate real-time subtitles and search lecture transcripts completely offline with zero external cloud API dependencies.

### 🎯 Intelligent Stream Curation & Anti-Dead Link System
- **Verified Correct Link Marking (Thumbs-Up)**: User-voted correct streams receive an instant **+150 score boost**, pinning the working link to the top of subsequent episodes.
- **Dead Link Demotion (Skull Purge)**: Instantly demote broken or non-functioning links with a **-200 score penalty**.
- **Auto-Filter 0-Seeder Torrents**: Toggle to automatically purge dead torrent links with 0 seeders from candidate lists.
- **Title Disambiguation Engine**: Filters out mismatched shows or movies returned by third-party plugins.
- **Direct Torznab Scrapers**: One-click local indexer integration for Prowlarr (`localhost:9696`) and Jackett (`localhost:9117`).
- **Parallel Speed & Availability Probing**: Probes candidate links in the background before playback to ensure measured start times.

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

## Performance targets (unverified)

These are engineering goals. Measure them on a named device and release before reporting results.

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
- [Node.js 24](https://nodejs.org/), matching CI.
- [pnpm](https://pnpm.io/), using the version pinned in [package.json](package.json).
- [Rust](https://www.rust-lang.org/) (Stable toolchain)
- *Linux only*: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `librsvg2-dev`

### Development

```sh
# Clone repository
git clone https://github.com/archiboltmusk/Argus.git
cd Argus

# Install dependencies
pnpm install --frozen-lockfile

# Run the Vite frontend
pnpm dev

# Run the native desktop app after setting up its dependencies
pnpm tauri dev

# Run unit and integration tests
pnpm test

# Run Rust core tests
cargo test --manifest-path argus-core/Cargo.toml
```

### Packaging Builds

```sh
# Desktop builds
pnpm build:mac          # Package a macOS .dmg on Apple Silicon
pnpm build:windows      # Package Windows .msi / .exe
pnpm build:linux        # Package Linux .AppImage / .deb

# Mobile & Handheld
pnpm build:android      # Package Android Mobile APK (.apk)
pnpm build:ios          # Package Apple iOS & iPadOS archive (.ipa)

# Television, Projectors & Smart TV Ecosystem
pnpm build:android:tv   # Package Android TV & Fire TV APK (.apk)
pnpm package:smart-tv   # Package Samsung Tizen (.wgt), LG webOS (.zip), & Web TV
pnpm build:tvos         # Package Apple TV 4K (.app / .ipa)
pnpm build:visionos     # Package Apple Vision Pro (.app / .ipa)
pnpm build:watchos      # Package Apple Watch Companion (.app / .ipa)
pnpm build:web          # Package Progressive Web App (PWA)
```

---

## Responsibility & Legal

Argus is an open-source software application distributed under the [MIT License](LICENSE).
* **Media sources**: Argus includes an original synthetic playback sample. Viewers supply authorized media files, streams, and playlists. Peer-to-peer uploading is disabled by default.
* **Educational BYOC & Non-Medical Status**: The educational module provides a neutral study shell and synthetic mock drills. Argus is not a medical device and is not intended for clinical decision support or direct patient care.
* **Privacy & Local AI**: All transcription, speech processing, and educational aids execute locally on-device. No telemetry, watch logs, or personal voice data are stored on or sent to remote servers.
* For full policy details, see [LEGAL.md](LEGAL.md) and [SECURITY.md](SECURITY.md).

## Contributing

Follow the [contributor guide](CONTRIBUTING.md) for your first checkout, test commands, and the evidence to attach to a bug report or pull request.

## License

Argus is released under the [MIT License](LICENSE). Third-party software notices and attribution can be found in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
