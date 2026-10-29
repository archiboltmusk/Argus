#!/usr/bin/env node

/**
 * Argus Cross-Platform Ecosystem Orchestrator
 *
 * Coordinates targets, configurations, and specialized video engines across:
 * - Apple: iOS, iPadOS, tvOS (Apple TV), visionOS (Apple Vision Pro), macOS
 * - Android: Phone, Tablet, Android TV, Google TV, Android Smart Projectors (XGIMI, Nebula, etc.)
 * - Google: ChromeOS / Chromebooks
 * - Microsoft: Windows 10/11 Desktop, Windows Handhelds (ROG Ally, Legion Go, Steam Deck)
 * - Smart TVs: Samsung Tizen OS (5.5+), LG webOS (5.0+)
 * - Web: Progressive Web App (PWA) with 10-foot Big Picture surface
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

export const ECOSYSTEM_MATRIX = [
  {
    id: "macos",
    name: "Apple macOS (Apple Silicon & Intel)",
    family: "apple",
    targetEngine: "mpv (with AVPlayer fallback)",
    buildCmd: "pnpm build:mac",
    outputExt: ".dmg / .app",
  },
  {
    id: "ios",
    name: "Apple iOS (iPhone) & iPadOS (iPad)",
    family: "apple",
    targetEngine: "avplayer (AVKit + Picture-in-Picture + AirPlay 2)",
    buildCmd: "pnpm tauri ios build --config src-tauri/tauri.ios.conf.json",
    outputExt: ".ipa / Xcode archive",
  },
  {
    id: "tvos",
    name: "Apple tvOS (Apple TV 4K)",
    family: "apple",
    targetEngine: "avplayer (4K Dolby Vision + Siri Remote D-Pad + Top Shelf)",
    buildCmd: "pnpm tauri build --config src-tauri/tauri.tvos.conf.json",
    outputExt: ".app (tvOS)",
  },
  {
    id: "visionos",
    name: "Apple visionOS (Apple Vision Pro)",
    family: "apple",
    targetEngine: "avplayer (RealityKit Spatial Cinema + Eye/Pinch gestures)",
    buildCmd: "pnpm tauri build --config src-tauri/tauri.visionos.conf.json",
    outputExt: ".app (visionOS)",
  },
  {
    id: "android-mobile",
    name: "Android Mobile & Tablet",
    family: "android",
    targetEngine: "exoplayer (Media3 + MediaCodec HW Acceleration)",
    buildCmd: "pnpm tauri android build --apk --target aarch64",
    outputExt: "-arm64-v8a.apk",
  },
  {
    id: "android-tv",
    name: "Android TV, Google TV & Smart Projectors (Portronics Beem 470, Egate, Wanbo, XGIMI)",
    family: "android",
    targetEngine: "exoplayer (MediaCodec Tunneling + Atmos Bitstreaming + Leanback + Projector Mode)",
    buildCmd: "pnpm tauri android build --apk --config src-tauri/tauri.android.conf.json",
    outputExt: "-tv-universal.apk",
  },
  {
    id: "linux",
    name: "Linux Desktop (Ubuntu/Debian, Fedora, Arch, Steam Deck)",
    family: "linux",
    targetEngine: "mpv (VAAPI / VDPAU / NVDEC HW Acceleration + PipeWire audio)",
    buildCmd: "pnpm tauri:build:linux-system",
    outputExt: ".deb / .rpm / .AppImage",
  },
  {
    id: "chromeos",
    name: "Google ChromeOS / Chromebook",
    family: "android / web",
    targetEngine: "html5 / exoplayer (PWA or Android ARC container)",
    buildCmd: "pnpm build:web",
    outputExt: "PWA Manifest + Service Worker",
  },
  {
    id: "windows",
    name: "Microsoft Windows 10/11 & Handhelds (ROG Ally, Legion Go)",
    family: "windows",
    targetEngine: "mpv (Direct3D 11 + RTX VSR/HDR + Anime4K Shaders)",
    buildCmd: "pnpm tauri build --config src-tauri/tauri.windows.conf.json",
    outputExt: "-setup.exe / .msi",
  },
  {
    id: "tizen",
    name: "Samsung Smart TV (Tizen OS 5.5+)",
    family: "smarttv",
    targetEngine: "tizen-avplay (Samsung webapis.avplay 4K HDR10+)",
    buildCmd: "pnpm build:tv && tizen package -t wgt -- smart-tv/tizen",
    outputExt: ".wgt",
  },
  {
    id: "webos",
    name: "LG Smart TV (webOS 5.0+)",
    family: "smarttv",
    targetEngine: "webos-media (com.webos.media pipeline + Magic Remote)",
    buildCmd: "pnpm build:tv && ares-package smart-tv/webos",
    outputExt: ".ipk",
  },
];

console.log("=================================================");
console.log("  Argus Cross-Platform Ecosystem Build Matrix    ");
console.log("=================================================");
console.table(
  ECOSYSTEM_MATRIX.map((m) => ({
    Platform: m.name,
    Engine: m.targetEngine,
    Format: m.outputExt,
  }))
);
