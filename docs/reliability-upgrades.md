# Reliability upgrade verification

This change preserves installed features and existing navigation customizations.

| Upgrade             | Implementation                                                                                                                                                                                                               | Verification                                                                                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playback acceptance | `scripts/playback-acceptance.mjs` uses the real HTML5 bridge and a generated local VP8/WebM fixture. Twenty runs decode, seek, force a broken source, roll back, persist progress and reload.                                | Web CI publishes `playback-acceptance.json`. This is bridge integration, not an end-to-end account setup test or native-device certification.                                                                                                       |
| Platform evidence   | `scripts/platform-support.mjs` accepts one published stable release, validates exact asset URLs and emits availability/status per target.                                                                                    | Release workflow uploads a support matrix. Device-tested requires separate evidence for the exact tag and installer. No device evidence is supplied by this change.                                                                                 |
| Episode corrections | Settings → Advanced → Repair exposes per-profile Kitsu episode → IMDb season/episode corrections. Provider merges and franchise cache keys reuse them; Kitsu entry-relative tracker numbering remains unchanged.             | Tests cover specials, profile separation, removal and invalid input. Reopen a title after editing. This does not remap a Kitsu entry to a different AniList/MAL entry or rewrite past history.                                                      |
| Sync reliability    | Stable React snapshots, deduplicated sync, real Stremio queue flush/library refresh, account/profile-scoped timestamps and stale completion guards. Strict Nuvio refresh does not call cached fallback a successful refresh. | Isolated tests exercise offline recovery, account switches, competing remote edits and failed durable writes. Existing adapter conflict policies remain in use.                                                                                     |
| Live Observatory    | Last 20 session attempts expose source-class timing, allowlisted score factors and counts, plus source-switch rollback outcomes.                                                                                             | Unit tests verify bounded retention, detached snapshots and removal of unrecognized/private ranking strings. No URLs, media titles or credentials are collected. Reports are memory-only.                                                           |
| Performance budgets | Removes the fixed 1.8-second splash floor. Web smoke records navigation-to-shell-reveal and gates 1.5 seconds. Controlled playback gates first frame at 3 seconds.                                                           | Web CI artifacts retain measurements. `ARGUS_STARTUP_BUDGET_MS` and `ARGUS_FIRST_FRAME_BUDGET_MS` can set budgets for a defined test environment. Native process RSS, 4K decoding and third-party network timings still require device measurement. |
| Focused navigation  | Fresh settings start with Home, Discover, Library and Settings. The theme navigation editor offers the same explicit preset and Reset restores all sections.                                                                 | Existing profiles retain custom order, labels, visibility, parental rules and hotkeys. Child navigation keeps its Kids entry. Optional sections remain installed and can be shown in the editor.                                                    |

## Music and privacy changes

The Studio theme adds shared surfaces and typography with a rose accent. Existing custom themes remain selectable. Listening controls expose audio settings, profile-scoped mix-seed exclusions, familiar/discovery radio ordering, and saving the current song plus upcoming queue to a playlist. Current playback and the explicitly selected Play Next track retain their positions.

Queue saving uses one SQLite transaction for playlist creation, tracks and membership dates. Duplicate track IDs retain their first position. Any write failure rolls back the playlist. Direct HTTPS audio URLs are explicit user input; provider search pages are never treated as audio endpoints. Resolution failures keep the chosen recording's identity rather than substituting a search result from another provider.

Direct streams use opaque IDs. Query-bearing direct endpoints are transient and must be reopened after restart. Migration 8 replaces legacy query-bearing IDs, preserves likes/history/queue/playlist references and clears query-bearing cached direct endpoints. This is logical database cleanup; it does not erase old backups or guarantee forensic deletion. Run `python scripts/test-music-privacy-migration.py` to check the migration SQL against a legacy SQLite fixture and verify that a repeated run is safe.

Pending Stremio writes identify their owning account with a digest reference rather than duplicating its authentication key. This does not replace the application's primary credential store. Host-health records expire after 24 hours; stream ratings expire after seven days. Closing playback normally does not penalize a source.

Apple Music account playback and universal music-source availability are not implemented by this change. Installer availability and physical-device testing remain separate claims.

## Local checks

Use the repository's normal typecheck, changed-file lint, production build and targeted tests. Unit tests now reject unmocked network requests; data/blob fixtures are allowed. Supply explicit transport fixtures rather than using live credentials. Test workers are bounded to four and individual test files have a 60-second timeout.

For browser decoding, install Playwright Chromium and ffmpeg, start `pnpm dev --host 127.0.0.1`, then run:

```sh
node scripts/playback-acceptance.mjs http://127.0.0.1:1420
```

`PLAYWRIGHT_DIR` can point at an existing Playwright install, and `CHROMIUM_PATH` can select an installed executable. The harness only accepts localhost and removes its generated media fixture on exit.

## Physical release gate

Before claiming device compatibility, run the full UI journey on each claimed device: launch, configure a controlled source, select the correct episode, decode, seek, interrupt the source, recover, close and reopen, then confirm resume within five seconds. Record the exact release, installer, OS/device, outcomes and measurements. A built installer or unit test is not evidence of this gate passing.
