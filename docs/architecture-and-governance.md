# Argus: Architecture, Continuity & Governance Charter

This charter defines the engineering, legal, and operational principles that ensure Argus remains a resilient, decentralized, and user-owned media platform.

---

## 1. No Critical Cloud Dependency (Local-First Resilience)

Argus is engineered to remain 100% operational even if all project-operated infrastructure disappears tomorrow:

* **Zero Mandatory Cloud Accounts**: Core discovery, search aggregation, link scoring, and playback require no Argus account, registration, or authentication server.
* **In-Process Torrent & Streaming Core**: Rather than depending on external streaming daemons, torrent parsing and streaming engines run directly inside the embedded native core (`argus-core`).
* **Direct Point-to-Point Connections**: All network requests for streams, metadata, and subtitles travel directly between the user's device and the configured third-party services (Debrid providers, Plex/Jellyfin instances, or open Stremio addons).
* **Local SQLite Database**: Watch history, library entries, custom lists, saved searches, and stream ratings are persisted locally in SQLite WAL mode on the user's device.
* **Offline-Capable Functionality**: Cached library metadata, downloaded media, local audio equalizer profiles, and on-device Whisper ASR speech recognition run fully offline without network connectivity.

---

## 2. Legal-First Integration Model

Argus operates strictly as a neutral technology layer, maintaining clear boundaries between the software client and third-party media sources:

* **Strict Client-Content Separation**: Argus ships with zero bundled streams, scrapers, indexers, or proprietary scraping scripts.
* **Neutral Protocol Conformance**: Integrations conform to open standards (such as the open Stremio Addon Protocol and standard HLS/M3U8 playlists).
* **Decentralized Third-Party Ecosystem**: All add-ons and providers are selected, configured, and authenticated directly by the user. Argus acts solely as an orchestrator and player.
* **Credential Isolation**: Secrets, Debrid tokens, and API keys are stored in secure local storage and are never uploaded to central servers or included in diagnostic exports.
* **See [LEGAL.md](../LEGAL.md)** for our full compliance documentation and dual-use client safeguards.

---

## 3. Reproducible Builds & Independent Verification

Users and contributors must be able to independently compile, verify, and package Argus without reliance on proprietary CI pipelines:

### Build Environment Requirements
* **Node.js**: v22+
* **Package Manager**: `pnpm` (v10+)
* **Rust**: 1.80+ (Stable toolchain)
* **Tauri CLI**: v2 (`@tauri-apps/cli`)
* **libmpv**: Native library headers for target OS

### Step-by-Step Compilation

```bash
# 1. Clone repository
git clone https://github.com/archiboltmusk/Argus.git
cd Argus

# 2. Install dependencies & compile native bindings
pnpm install
pnpm run setup:all

# 3. Validate TypeScript & feature inventory
pnpm run check:inventory
pnpm run typecheck

# 4. Run test suites
pnpm test
cargo test -p argus-core -- --ignored

# 5. Package desktop application
pnpm run build:mac      # macOS Universal .dmg
pnpm run build:desktop  # Windows/Linux native packages
```

### Checksum Verification
Every official release publishes SHA-256 checksums (`SHA256SUMS.txt`) signed with GPG to allow users to verify that binary downloads match compiled source code.

---

## 4. Community Continuity & Forking Guide

If the original maintainers become unavailable or the upstream repository ceases operation, the project is designed for seamless community continuity:

### Clean Architecture Map
* `argus-core/`: Rust library handling stream ranking, cache verification, and torrent streaming.
* `src-tauri/`: Tauri 2 backend managing windowing, IPC commands, and libmpv / Whisper ASR bridges.
* `src/`: React 19 + TypeScript frontend containing the playback UI, settings panels, and link picker.
* `src/lib/addon-health/`: Local reliability tracking and test runner for community add-ons.
* `src/lib/streams/scoring/`: Multi-signal stream ranking and two-stage selection algorithms.

### How to Maintain an Independent Fork
1. **Fork the Repository**: Clone your fork and establish an independent remote.
2. **Decouple Remote Identifiers**: Update `tauri.conf.json` with your unique bundle identifier and update URL.
3. **Preserve Third-Party Compatibility**: Maintain conformance with standard Stremio Addon manifest specifications to retain compatibility with all existing community add-ons.
4. **License Integrity**: Argus is distributed under the [MIT License](../LICENSE); forks must preserve copyright notices and third-party license attributions in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

---

## 5. A Free, Sustainable Core

* **Permanent Free-Core Guarantee**: The core client, player engine, stream ranking algorithms, subtitle synchronization, and add-on management features will never be locked behind a paywall.
* **No Artificial Limitations**: Argus will not throttle playback speed, limit the number of configured sources, or artificially restrict resolution based on a subscription tier.
* **No Monetization Through User Surveillance**: Argus contains zero tracking pixels, ad frameworks, or telemetry auctions.
* **Voluntary Support Model**: Project maintenance, infrastructure for community documentation, and binary signing certificates are funded through transparent, voluntary community sponsorships and open bounties.
