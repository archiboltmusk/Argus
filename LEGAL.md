# Legal-First Integration Policy & Disclaimers

Argus is designed, developed, and distributed as a **pure client application and neutral media player engine**.

---

## 1. Zero Content & Separation of Layers

* **No Bundled Media or Scraping Sources**: Argus ships with zero bundled media files, streams, playlists, scrapers, indexers, or proprietary scraping scripts.
* **Neutral Protocol Engine**: The software acts strictly as a multi-protocol player and interface conforming to open specifications (such as the open Stremio Addon Protocol, mDNS/Bonjour LAN discovery, and standard m3u/HLS streams).
* **User Agency & Configuration**: All third-party add-ons, personal media servers (Plex, Jellyfin), Debrid provider accounts, and IPTV playlists are configured and authenticated exclusively by the end user.
* **No Cloud Relay of Streams**: Video streams and media packets flow directly between the user's client and their configured endpoints. Argus operates no centralized proxy, caching server, or media relay infrastructure.

---

## 2. Dual-Use Technology & Legal Neutrality

Argus is a general-purpose, dual-use client with substantial non-infringing uses, including:
1. Playing personal, home-recorded, and locally ripped media collections across home local area networks (LAN).
2. Streaming content from openly licensed public catalogs, such as the Internet Archive, Creative Commons repositories, and public-domain historical archives.
3. Managing authorized personal subscriptions via official provider credentials.
4. Viewing personal IPTV and open broadcast feeds.

The developers of Argus do not endorse, promote, or encourage unauthorized reproduction or distribution of copyrighted works.

---

## 3. Credential & Privacy Safeguards

* **Zero Centralized Surveillance**: Argus contains no telemetry, user tracking, or centralized viewing-history databases.
* **On-Device Storage**: User credentials, API keys, tokens, and preferences are stored exclusively on the user's local device (using OS-level secure storage where available, such as Apple Keychain or Windows Credential Manager).
* **Sanitized Diagnostics**: All exportable diagnostic bundles automatically scrub sensitive tokens, user passwords, private URLs, and directory paths.

---

## 4. Add-on Developers & Integration Standards

Developers authoring community integrations must adhere to the following standards:
* Integrations must declare transparent capability manifests and clear endpoint destinations.
* Add-ons must respect user permission boundaries and must not execute unverified binary code or obfuscated scripts inside the client.
* Add-ons that fail security checks or engage in malicious behavior (e.g. credential harvesting or cryptocurrency mining) will be quarantined and demoted within the client.

---

## 5. DMCA & Inquiries

Argus hosts no copyrighted material. Because the developers operate no servers hosting or transmitting infringing files, requests to remove content should be directed to the third-party hosts or network providers hosting the relevant media.

For technical, security, or licensing inquiries regarding the client software itself, contact the repository maintainers through official GitHub repository issues.
