# Argus

**One view of every stream you have.**

[![Release](https://img.shields.io/github/v/release/archiboltmusk/Argus?style=flat-square&color=blue)](https://github.com/archiboltmusk/Argus/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![CI Status](https://img.shields.io/github/actions/workflow/status/archiboltmusk/Argus/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/archiboltmusk/Argus/actions)

In Greek myth, *Argus Panoptes* was the hundred-eyed giant who saw everything at once.
Argus the app does the same for your media. It unifies Stremio-compatible addons, direct indexer scrapers (Prowlarr / Jackett Torznab), debrid clouds, Plex/Jellyfin servers, local libraries and IPTV playlists in one blazing-fast player with intelligent fallback and zero buffering.

Argus ships with **no content and no built-in sources**. You connect the addons, accounts, indexers, servers and playlists you already use and have rights to.

Platforms: **Apple** (iOS, iPadOS, macOS, watchOS, tvOS, visionOS), **Android** (Google TV, Fire TV, Projectors, Mobile), **Smart TVs** (Samsung Tizen, LG webOS, Hisense VIDAA, Philips Titan OS, Panasonic, Roku), **Windows**, **Linux**, and **Web TV**.

---

## Supported Platforms & Download Matrix

| Platform / Ecosystem | Target Devices | Build / Download Format | Install / Sideload Method |
| --- | --- | --- | --- |
| **Apple iOS** | iPhone (iOS 16.0+) | `Argus-iOS-iPadOS.ipa` | Sideload via AltStore / SideStore / Sideloadly / TrollStore |
| **Apple iPadOS** | iPad, iPad Pro, iPad Air, iPad mini (iPadOS 16.0+) | `Argus-iOS-iPadOS.ipa` | Sideload via AltStore / SideStore / Sideloadly / TrollStore |
| **Apple macOS** | Apple Silicon (M1–M4) & Intel Macs | `Argus-aarch64.dmg` | Mount and drag to `/Applications` |
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
- [pnpm](https://pnpm.io/) (v10+)
- [Rust](https://www.rust-lang.org/) (Stable toolchain)
- *Linux only*: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `librsvg2-dev`

### Development

```sh
# Clone repository
git clone https://github.com/archiboltmusk/Argus.git
cd Argus

# Install dependencies
pnpm install

# Run in desktop development mode (Tauri + Vite)
pnpm dev

# Run unit and integration tests
pnpm test

# Run Rust core tests
cargo test -p argus-core -- --ignored
```

### Packaging Builds

```sh
# Desktop builds
pnpm build:mac          # Package macOS .dmg (Apple Silicon & Intel)
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

Argus ships with **no streaming sources, scrapers, catalogs, or media content of any kind**. Addons, plugins, and custom indexers are installed and configured exclusively by the end user. Users are entirely responsible for the sources they configure and for adhering to the applicable laws in their jurisdiction. Peer-to-peer uploading (seeding) is disabled by default. See [LEGAL.md](LEGAL.md).

## License

Argus is released under the [MIT License](LICENSE). Third-party software notices and attribution can be found in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
