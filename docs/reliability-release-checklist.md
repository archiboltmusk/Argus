# Reliability release acceptance

Preserve existing features. Reuse the implementations below; release only after the changed paths pass regression checks.

| Upgrade | Implementation and acceptance |
| --- | --- |
| One release entry | Dispatch CI with one stable `release_tag`; CI stages the verified Mac package, calls matching Windows/Linux builds, and promotes the draft only when all three signed platform entries are valid. Failed builds leave the previous stable feed in place. |
| Clear downloads | `docs/downloads.js` selects an exact installer from one stable release. Never mix preview assets, phone/TV/watch packages or release versions. Release notes list uploaded installers only. |
| Safer updates | Every native install saves a recovery backup. Signature, backup or channel-change failures prevent installation. Existing rollback and backup-import controls remain available. |
| Playback health | Existing playback traces and copied diagnostics retain source-resolution, load and first-frame timings. Existing host health and stall reporting remain in use. |
| Source recovery | `stream-transition.ts` waits for decoded playback, preserves position and semantic audio/subtitle choices, bounds failures and restores the original source. Cancellation cannot reload over a newer owner. |
| Connection status | Existing Settings connection-health tests cover installed add-ons, media servers and authentication state. Do not describe an unreachable service as connected. |
| Artwork | Existing Poster caching/fallback remains shared. Music surfaces reuse MusicArtwork's bounded equivalent-cover retry and neutral local placeholder. |
| Device defaults | Existing Big Picture/projector startup, touch/native layouts and desktop shortcuts remain intact. Native projector full parity is a separate outstanding release requirement. |
| Navigation | Existing navigation customization preserves ordering, hiding, labels and parental restrictions. More/Lab keep secondary tools reachable. |
| Release checks | Full `pnpm test`, typecheck, changed-file formatting/lint, production build and web smoke must pass. Smoke rejects uncaught application errors. Desktop preflight uses the same Node version as CI and gates installer jobs. |

## Focused regression suites

- Update signatures, failed backup, channel races: `tests/updater-experimental.test.ts`.
- Stream rollback, changed track IDs, subtitles off, timeout and cancellation: `tests/stream-transition.test.ts`.
- Playback position/history, stall handling and source scoring: `tests/actual-playback.test.ts`, `tests/stall-fallback.test.ts`, `tests/quality-upgrade.test.ts`, `tests/playback-trace.test.ts`.
- Download/release presentation: `tests/release-download-selection.test.mjs`, `tests/release-publishing.test.mjs`.
- Artwork: `tests/music-artwork-fallback.test.mjs`, `tests/card-artwork-state.test.mjs`.
- Account sync and device layouts: `tests/unified-cloud-sync.test.ts`, `tests/native-projector-playback.test.ts`, `tests/projector-launcher.test.ts`.

These tests do not prove every third-party account, external source or physical device works. Real-account and physical-device checks must state which environment was exercised; never label untested flows flawless.


## Playback sample and device evidence

`public/demo/argus-playback.mp4` is an original Argus test fixture generated with FFmpeg from a solid color, a grid, title text, and a synthetic 440 Hz tone. It contains no third-party footage or recordings and is distributed with the project under its MIT license. The welcome screen deliberately opens invalid media to exercise the demo’s recovery state. It runs in the webview. Sample SHA-256 is `d23306d6cf0147752ff6c6ffca7e93959a9055a7469d2de977b0f331bc42c033`. Stable desktop publishing attaches `SHA256SUMS.txt` for the downloaded release installers and Mac updater archive.

For each release, link the exact tag and installer checksum to the device test results. Record OS, device model, first-frame time, first-pick playback at 30 seconds, and recovery time. Use the same authorized sources and filters for a comparison and record cold and warm starts separately.
