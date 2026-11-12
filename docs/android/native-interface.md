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
store. Existing cloud accounts, library data, and add-on configurations are not
automatically imported or synchronized into the native store in this phase.

The native launcher does not start the Rust torrent engine. Torrent-only sources
show an explanatory message rather than pretending to play. Configure an add-on
that supplies a playable link. Advanced desktop/Lab features remain in the
previous interface. This is a native migration of the main media flow, not full
feature parity with the previous interface.

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
