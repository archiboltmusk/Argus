# Changelog

All notable changes to the Argus project are documented in this file.

---

## [2.1.0] - 2026-10-30

### Argus 2.1.0 — Unified Design System & Decentralized Security

Argus 2.1 brings a universal design system upgrade across all tabs, Zero-Knowledge Merkle-CRDT sync, the complete next-gen playback suite (Neural Voice Clarifier, LAN P2P Swarm, Letterbox Subtitle Dodging, and Indic Dubbing), and a clinical resident education hub.

### Upgrade Guide: Update vs. Fresh Download
- **In-App Auto-Update is Sufficient (No Fresh Download)**:
  - **macOS, Windows, and Linux Desktop**: Open **Settings → Updates → Check for Updates** to upgrade to v2.1.0 in-place. All watch history, local libraries, addons, and settings are preserved.
  - **Web TV & PWA**: Reload the web application in your browser to pull down the latest bundle.
- **Fresh Download / Sideload Required**:
  - **Android TV, Google TV & Fire TV**: Download and install `Argus-AndroidTV-arm64.apk` over your existing installation.
  - **Android Mobile & Tablet**: Download and install `Argus-android-arm64.apk` over the app.
  - **Apple Sideloading (iOS, iPadOS, tvOS, visionOS, watchOS)**: Download the corresponding `.ipa` (`Argus-iOS-iPadOS.ipa`, `Argus-AppleTV-tvOS.ipa`, `Argus-VisionPro-visionOS.ipa`, `Argus-AppleWatch-watchOS.ipa`) and refresh via AltStore, SideStore, Sideloadly, or TrollStore.
  - **Smart TVs (Samsung Tizen, LG webOS, Hisense VIDAA, Philips Titan OS, Panasonic)**: Re-push the new release bundle (`.wgt` / `.zip`) using your TV's developer manager.

### Highlights & Universal Design System
- **Global Semantic Token Contract**: Enforces strict semantic design tokens (`bg-canvas`, `bg-surface`, `bg-elevated`, `border-edge`, `text-ink`) with zero raw palette leaks across all 730 view files.
- **Universal Typography Cascade**: Displays, rail headers, and labels strictly adhere to `var(--font-display)` and `var(--font-sans)`, allowing dynamic font pairings to cascade across all tabs.
- **Unified Masthead & Segmented Navigation**: Harmonized top masthead and fluid segmented view navigation tabs across Sports, Education, Observatory, and Cloud Gaming.
- **Music DJ Deck & Ebooks Theming**: Restructured isolated CSS variables in DJ Deck and Ebooks 3D reader to dynamically adapt to user themes and font pairings.
- **Automated Theme Token Linter**: Added `scripts/check-theme-tokens.mjs` to protect against design regressions.

### Next-Gen Playback, Audio & AI Subtitles
- **Neural Voice Clarifier**: Speech isolation DSP (+6dB @ 2.5–3.5 kHz) tailored for classic 35mm cinema and compact single-speaker projectors (Portronics Beem 470).
- **Local Subnet LAN P2P Swarm Cache**: Shares 4K video pieces across Smart TVs, laptops, and mobiles on local Wi-Fi at 800+ Mbps LAN speeds with zero external WAN usage.
- **Face & Letterbox-Aware Subtitle Dodging**: Positions soft amber (`#FFD180`) subtitles inside black letterbox bars and dynamically dodges actor faces on 16:9 full-bleed streams.
- **Automatic Scene & Song Chapter Synthesizer**: Marks Prologue, Title Song, Intermission, Climax, and End Credits on player seekbars for titles lacking MKV chapters.
- **Hybrid Debrid + Legal Studio Streaming Fallback**: Seamlessly routes verified 1080p studio streams from YouTube for rare classics when seeders are dead.
- **Edge Zero-Shot Indic Dubbing Overlay**: Real-time neural voice dubbing with automated 15% soundtrack ducking.
- **AutoSync Conservative Gate**: Fixed false auto-sync failures on already-aligned subtitle tracks with a "never-worse" safety gate.

### Decentralized Protocol & Security
- **Zero-Knowledge Merkle-CRDT State Synchronization**: Conflict-free multi-device library syncing without centralized coordination.
- **QUIC Multiplexed Stream Sieve**: Low-latency packet recovery and jitter elimination for high-bitrate streaming.
- **Ed25519 Cryptographic Manifest Attestation**: Cryptographic integrity guarantees preventing spoofing or tampering of streaming sources.
- **Blind Debrid Zero-Knowledge Proxy**: Shields user queries with end-to-end anonymity.

### Clinical Resident Education Hub
- **Education Hub Redesign**: Complete visual and architectural overhaul matching the premier Sports tab benchmark.
- **Resident Clinical Case Simulator**: Interactive emergency management with bedside telemetry monitoring, high-yield clinical pearls, and pharmacotherapy drills.
- **INI-CET War Room Banner**: Visual study command center with exam countdown, subject weight heatmaps, and active recall drills.

### Streams & Catalog Safeguards
- **Single-Word Title Boundary Guard**: Prevents false matches on common one-word titles against multi-word foreign releases.
- **Catalog Year Mismatch Filter**: Rejects releases with >15-year discrepancies against verified metadata.
- **Bengali Audio Scoring Boost**: Prioritizes authentic dialect tracks in automated stream ranking.

---

## [2.0.0] - 2026-10-30

### Argus 2.0.0 — The Ultimate Entertainment & Regional Powerhouse

Argus 2.0 is our biggest milestone release yet, bringing unprecedented streaming performance, deep regional Indian cinema intelligence, zero-wait 4K seeking, live sports multi-commentary, and robust offline resilience.

### Highlights
- **Unlimited Wi-Fi Broadband Engine**: Wi-Fi and Ethernet connections are 100% unmetered and uncapped: zero bitrate restrictions, zero false budget alarms, and 24/7 unthrottled torrent seeding.
- **Multi-Chunk Turbo Streamer**: Allocates a 4GB demuxer cache and 3600-second forward readahead horizon for instant (<200ms) seeks in massive 40GB–80GB 4K Remux / Dolby Vision files.
- **Vintage Cinema AI Shader Suite**: Custom-engineered for 1950s–1980s 35mm Indian and Bengali cinema (Satyajit Ray's *Apu Trilogy*, *Charulata*, *Nayak*, Ritwik Ghatak's *Meghe Dhaka Tara*, Uttam–Suchitra classics).
- **Multi-Commentary Instant Audio Switcher**: Hot-swaps between Bangla (Akashvani Kolkata), Hindi (Sports Flashes), and English broadcast audio in 1 click during live cricket and sports.
- **Night-Owl Cinema Mode**: Dynamically clamps loud explosions and commercial ad spikes via real-time DRC/loudnorm while dimming subtitles to a soft warm amber (`#FFD7A0` at 75% opacity).
- **Power-Cut & Load-Shedding Snapshot Vault**: Atomically journals session progress every 5 seconds for instant 1-click state recovery after sudden power cuts or battery death.
- **Embedded WebAssembly Retro Gaming Engine**: Playable 1-click emulation for GBA, SNES, PS1, and PSP classics directly inside Argus with zero external emulator configuration.
- **Hydra Addon Protocol & High-Speed Debrid Resolver**: Resolves repack magnets and direct cyberlockers via Real-Debrid, Torbox, and AllDebrid at maximum ISP line speeds.
- **Wine/Proton/GPTK Automated Prefix Runner**: Isolated prefix management for launching Windows PC games on macOS and Linux.
- **Cross-Platform Cloud Save Sync**: Automated save game path discovery, versioned snapshots, and cloud backup.
- **Indian Regional Audio & Dub Auto-Selector**: Automatically prioritizes 8 Indian regional dialects without manual track switching.
- **Tollywood & Bengali Detective Universe Rails**: Dedicated curation for Feluda, Byomkesh Bakshi, Ray classics, and modern Hoichoi/SVF thrillers.
- **Phonetic Transliteration Search**: Resolves Romanized queries (*"Sonar Kella"*, *"Bhooter Bhabishyat"*) into native Bengali and Hindi titles.
- **Bluetooth Earbuds Lipsync Auto-Profiler**: Eliminates dialogue lag on boAt Airdopes, Noise Buds, Boult Audio, and Realme TWS earphones.
- **Zero-Install QR Couch Handoff**: Generates a local LAN QR code to transfer stream playback to any phone or tablet browser in 1 click.

### Broadband, Network & Offline Resilience
- **Network Profiler**: Automatically identifies uncapped broadband vs. metered mobile hotspots.
- **Smart Torrent Policy**: Uncapped 24/7 seeding on Wi-Fi; throttles daytime mobile uploads to 1 KB/s to preserve daily mobile data limits.
- **Night-Owl Download Scheduler**: Queues heavy downloads for the 00:00 - 06:00 IST unmetered window.
- **Local LAN Peer-Share**: 1 Gbps file transfers across campus/home subnets with zero external data consumption.
- **Multi-CDN Stream Stitcher**: Automatic failover to healthy edge mirrors if local ISP routing experiences packet loss.
- **Adaptive Buffer Prefetching**: Counters peak-hour cell tower congestion (19:00 - 23:00 IST).

### Cricket & Sports Intelligence
- **Live Commentary Delay Sync**: Calibrates radio audio with broadcast video streams.
- **Smart Highlight Reel Synthesizer**: Generates chapter markers on the player seekbar for wickets, boundaries, and milestones.
- **Dugout Dual-Channel Mixer**: Blends stadium crowd ambiance with regional radio commentary.
- **Ball-by-Ball Live Desktop Alerts**: Native desktop toasts for wickets, sixes, fours, and centuries.
- **Indian OTT Streaming Rights Badges**: Identifies streaming homes (JioHotstar, SonyLIV, FanCode, Hoichoi, ZEE5).

### Audio, Speech & Subtitles
- **On-Device Whisper Neural Speech Recognition**: Real-time offline live subtitle transcription powered by Apple Silicon Metal GPU acceleration.
- **4-Tier AutoSync Pipeline**: Aligns subtitles via community hash consensus, acoustic VAD, and affine drift regression.
- **Indian Serial Recap & Dramatic Filler Skipper**: Bypasses 4-minute recaps and slow-motion staring sequences in daily soaps.
- **Audio-Only Frugal Mode (`--vid=no`)**: Drops bandwidth to ~25 MB/hr for commentary and concerts.
- **10-Band Dialogue Clarity EQ**: Lifts speech presence while taming explosive bass and loud song interludes.

---

## [1.0.0] - 2026-10-26

- Initial stable desktop release of Argus.
- Multi-source streaming client (Stremio & Nuvio protocol support).
- Native mpv player engine with custom shaders (Anime4K, FSRCNNX, CAS, FSR).
- Full Trakt, Simkl, and AniList scrobbling integration.
