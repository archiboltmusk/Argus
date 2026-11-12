# Native Android media interface

Android now launches `app.argus.player.NativeTvActivity`. Home, search, catalogs,
title details, seasons/episodes, source selection, the device library, resume
history, add-on management, and playback preferences are Android views. Media3
owns playback, audio focus, media-button handling, tracks, and the video surface.
Opening these screens does not initialize Tauri or a WebView. This removes the
old System WebView startup dependency on budget projectors.

The interface retains Argus's wordmark, dark canvas, warm accent, poster cards,
rounded surfaces, and remote-focus outlines. Artwork is decoded off the main
thread with bounded image sizes and cache memory. Nuvio's native Android approach
is a reference; its GPLv3 application source has not been imported into Argus's
MIT-licensed code. Android's media components are reused directly.

The native client supports Stremio HTTP catalog, metadata, and stream resources.
Install a catalog such as Cinemeta and configure streaming add-ons using their
manifest links. Playback accepts direct HTTP/HTTPS sources, including links
provided by configured streaming/debrid add-ons. Embedded tracks and subtitles
provided with a stream are available in the native player.

## Migration boundaries

The earlier interface remains internal and can be opened explicitly from native
Settings. It still requires a recent Android System WebView. Its data is retained;
the native interface uses a separate `argus_native_media_v1` private preferences
store. Sessions and device-only data from the earlier interface are not silently
transferred. Connecting Accounts pulls that provider's cloud data into a separate
native account/profile store.

The native interface starts the existing Rust torrent engine only when a torrent
source is selected. Metadata and peer transfer run off the UI thread; the loopback
stream goes directly to Media3. A single worker bounds engine operations. Leaving
playback stops the engine, and the dedicated temporary torrent cache is reset on
the next session. Saved offline downloads use separate storage. Invalid hashes,
missing files, unavailable peers and insufficient storage have recovery paths.

Native Accounts supports Nuvio profiles (including PIN verification), Stremio,
and the configured Argus Supabase project. Each provider/user/profile has its own
local store and offline journal. Successful sync acknowledges only the revisions
actually sent; newer edits and failed writes stay queued. Nuvio and Stremio use
the same library/progress/add-on contracts as the Mac client. Supabase native
media sync uses `argus_media_sync`, separately from the desktop's aggregate taste
sync. Sessions use Android Keystore encryption; passwords are not persisted.
Existing device-only and previous-interface data are retained when switching
accounts. Sign in to pull cloud data; local stores are not silently uploaded into
another account.

Player More offers source switching, next-episode access for series, speed,
picture fit, sleep timer, diagnostics, external players and supported offline
downloads. Source changes retain position and selected track languages. Android
DownloadManager handles direct HTTPS file downloads; completed files play from
their local content URI. Live HLS/DASH and torrent background downloads are not
offered. Download lists are isolated by account/profile and remain device-local.
Big Picture is the default wide-screen layout, with an explicit compact-layout
switch and narrower-screen navigation. Library pages and catalog/search poster
counts are bounded to protect older devices' memory.

Advanced desktop/Lab features remain in the previous interface. Chromecast/DLNA
control, watch parties, external tracker integrations and full desktop feature
parity are not claimed by this native preview.
The native preview's interface is English; the Mac localization catalog has not
yet been transferred. Android lint still checks compatibility and correctness;
optional KTX/localization style advice and newer-version suggestions for the
tested dependency pins are excluded from that gate.

No user data is deleted by the launcher migration. Returning to the older APK or
opening the previous interface leaves its original storage available. Retain the
same production signing key for APK updates; emulator test keys are not release
keys.

## Reproduce Android 9 acceptance tests

Use a dedicated emulator with ADB and an installed Argus APK. The local fixture
requires ffmpeg and serves synthetic video with English/Hindi audio, a subtitle,
movie/series catalogs, and a broken source. It does not download media.

```sh
python3 scripts/android-native-fixture.py --port 8766
adb -s emulator-5556 reverse tcp:8766 tcp:8766
python3 scripts/android-native-smoke.py --serial emulator-5556
```

The smoke test adds the local test add-on and a test library entry without
clearing app data. It checks launcher resolution, absence of WebViews, D-pad
focus, add-on installation, preferences, browsing, details, playback and remote
pause, search, episodes, failed-source recovery, and resume/library persistence
after process restart. Screenshots are written to the system temporary directory
under `argus-native-proof`.

The component playback test also exercises rendered frames, Hindi audio and
subtitle selection, seeking, and a broken stream. Start another instance of
`android-native-fixture.py --port 8765` and forward that port with ADB. Run it after the full-app test,
not concurrently, because it takes foreground control of the emulator:

```sh
cd src-tauri/gen/android
./gradlew :tauri-plugin-native-player:connectedDebugAndroidTest
```

For account tests, start `scripts/android-cloud-fixture.py` and forward port 8770.
Its synthetic Nuvio, Stremio and Supabase contracts exercise round trips, failed
writes/retry, deletions, token refresh, PINs, account separation, in-flight edits
and encrypted session persistence without real user credentials. The download
test fetches Samplelib's public 5-second HTTPS test file and removes it afterward.

For actual peer-transfer acceptance, build `tools/android-p2p-probe`, then run
`scripts/android-torrent-fixture.py --seeder <probe-binary> --video <synthetic-mp4>`.
Forward ports 8879 and 16881 and run `scripts/android-torrent-smoke.py`. It installs
a local add-on, resolves a real torrent from a local seeder, renders it in the
shipping application, pauses with the media key and checks saved resume state.
Neither the fixture nor the smoke check needs public-media peers.

The acceptance environment is Android 9/API 28, ARM64, with System WebView
66.0.3359.158. Emulator success does not establish the Beem 470's exact firmware,
ABI, or hardware-decoder behaviour; physical-device validation is separate.

## Projector preview 3.17.2

The Android-only version override is 3.17.2 (version code 3017002). The universal
APK includes `arm64-v8a` and `armeabi-v7a`, with minimum Android API 24.
On 2026-11-12, the ten full-app smoke checks and both Android component tests
passed on the API 28 emulator. Typecheck, frontend build, Android packaging tests,
and scoped formatting/lint checks passed. The component playback test timed out
once during concurrent compilation and passed when rerun after compilation.
Repository-wide formatting still has existing failures; the Linux build target
was unavailable on this Mac. Neither is represented as a passing gate.

The downloadable projector preview uses a dedicated persistent signing key.
Older APKs signed with a different key cannot be updated in place. Back up/export
their data before uninstalling; uninstalling removes application data. Keep the
projector signing key outside Git and reuse it for subsequent projector releases.

## Projector preview 3.17.3 validation

ARM64 and ARMv7 universal release builds pass. On the same API 28 ARM64 emulator,
eight component tests pass, covering tracks/rendering, malformed data, concurrent
stores, magnet parsing, all three account contracts, PINs/retry/refresh/isolation,
unavailable add-ons and offline downloads/playback. All ten full-app checks pass.
The additional native player suite passes account screens, More actions, actual
1.5× playback, fit/sleep/diagnostics, source-switch resume and phone/tablet layouts.
Actual seeded torrent metadata/peer transfer, playback, pause and resume also pass
in the shipping application. Subtitles move above visible player controls.

Account tests use synthetic local providers, not real user credentials. The live
Supabase migration is applied; RLS is enabled, the three account-only policies are
verified, an attempted cross-account write is rejected in a rolled-back SQL proof,
and the public REST endpoint rejects anonymous reads. Real Nuvio/Stremio user
sign-in and physical projector decoder behaviour are not represented as tested.

Android compatibility lint, Android Rust check, scoped repository checks and
packaging tests pass. The Android Rust target retains the existing 112 warnings.
The Linux build gate remains unavailable because its target is not installed on
this Mac. No frontend TypeScript or Mac runtime paths are changed by this update.
