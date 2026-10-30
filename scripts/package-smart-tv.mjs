#!/usr/bin/env node

/**
 * Argus Smart TV & 10-Foot Big Picture Packager
 *
 * Automatically generates sideloadable installation packages for:
 * 1. Samsung Smart TV (Tizen OS 5.5+ .wgt archive)
 * 2. LG Smart TV (webOS 5.0+ package directory & zip)
 * 3. Standalone Web TV (Self-hosted 10-foot Big Picture package for NAS / local servers)
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const outDir = path.join(root, "dist-smart-tv");

console.log("=== Argus Smart TV & 10-Foot Big Picture Packager ===");

if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, "index-tv.html"))) {
  console.log("dist/index-tv.html not found. Building TV assets first (pnpm build:tv)...");
  execSync("npm run build:tv", { cwd: root, stdio: "inherit" });
}

fs.mkdirSync(outDir, { recursive: true });

// 1. Samsung Tizen OS WGT Package
const tizenDir = path.join(outDir, "tizen-bundle");
fs.rmSync(tizenDir, { recursive: true, force: true });
fs.mkdirSync(tizenDir, { recursive: true });

// Copy all dist contents into tizen bundle
fs.cpSync(distDir, tizenDir, { recursive: true });
// Copy Tizen config.xml to root of bundle
fs.copyFileSync(path.join(root, "smart-tv", "tizen", "config.xml"), path.join(tizenDir, "config.xml"));

// Copy app icon
const iconSrc = path.join(root, "public", "icons", "icon.png");
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(tizenDir, "icon.png"));
} else if (fs.existsSync(path.join(root, "src-tauri", "icons", "128x128.png"))) {
  fs.copyFileSync(path.join(root, "src-tauri", "icons", "128x128.png"), path.join(tizenDir, "icon.png"));
}

// Ensure index.html in Tizen bundle points to index-tv.html
fs.copyFileSync(path.join(distDir, "index-tv.html"), path.join(tizenDir, "index-tv.html"));

const tizenWgtPath = path.join(outDir, "Argus-Samsung-Tizen.wgt");
fs.rmSync(tizenWgtPath, { force: true });
execSync(`cd "${tizenDir}" && zip -r -9 "${tizenWgtPath}" ./*`, { stdio: "pipe" });
console.log(`✓ Generated Samsung Tizen WGT: ${tizenWgtPath} (${(fs.statSync(tizenWgtPath).size / (1024 * 1024)).toFixed(2)} MB)`);

// 2. LG webOS Package Bundle
const webosDir = path.join(outDir, "webos-bundle");
fs.rmSync(webosDir, { recursive: true, force: true });
fs.mkdirSync(webosDir, { recursive: true });

fs.cpSync(distDir, webosDir, { recursive: true });
fs.copyFileSync(path.join(root, "smart-tv", "webos", "appinfo.json"), path.join(webosDir, "appinfo.json"));
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(webosDir, "icon.png"));
  fs.copyFileSync(iconSrc, path.join(webosDir, "largeIcon.png"));
} else if (fs.existsSync(path.join(root, "src-tauri", "icons", "128x128.png"))) {
  fs.copyFileSync(path.join(root, "src-tauri", "icons", "128x128.png"), path.join(webosDir, "icon.png"));
  fs.copyFileSync(path.join(root, "src-tauri", "icons", "128x128.png"), path.join(webosDir, "largeIcon.png"));
}

// In webOS, main entry is index-tv.html
fs.copyFileSync(path.join(distDir, "index-tv.html"), path.join(webosDir, "index-tv.html"));

const webosZipPath = path.join(outDir, "Argus-LG-webOS.zip");
fs.rmSync(webosZipPath, { force: true });
execSync(`cd "${webosDir}" && zip -r -9 "${webosZipPath}" ./*`, { stdio: "pipe" });
console.log(`✓ Generated LG webOS Bundle: ${webosZipPath} (${(fs.statSync(webosZipPath).size / (1024 * 1024)).toFixed(2)} MB)`);

// 3. Standalone Web TV Package (for Self-hosting / Raspberry Pi / NAS)
const webTvZipPath = path.join(outDir, "Argus-WebTV-10foot-standalone.zip");
fs.rmSync(webTvZipPath, { force: true });
execSync(`cd "${distDir}" && zip -r -9 "${webTvZipPath}" ./*`, { stdio: "pipe" });
console.log(`✓ Generated Standalone Web TV Bundle: ${webTvZipPath} (${(fs.statSync(webTvZipPath).size / (1024 * 1024)).toFixed(2)} MB)`);

// Clean intermediate staging dirs
fs.rmSync(tizenDir, { recursive: true, force: true });
fs.rmSync(webosDir, { recursive: true, force: true });

console.log("\nAll Smart TV packages built successfully in dist-smart-tv/!\n");
