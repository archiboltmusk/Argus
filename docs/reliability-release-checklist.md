# Reliability release acceptance

Preserve existing features. Reuse the implementations below; release only after the changed paths pass regression checks.

| Upgrade | Implementation and acceptance |
| --- | --- |
| One release entry | Dispatch CI with one stable `release_tag`; Mac publication triggers matching Windows/Linux builds. Signed feeds must match the release version. |
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
