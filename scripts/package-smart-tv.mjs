#!/usr/bin/env node

/**
 * Argus Comprehensive Smart TV Packager
 *
 * Automatically generates installation bundles across all major Smart TV operating systems:
 * 1. Samsung Tizen OS (5.5+ .wgt archive)
 * 2. LG webOS (5.0+ package directory & zip)
 * 3. Hisense VIDAA / Home OS (app bundle & zip)
 * 4. Philips Titan OS (manifest & web package)
 * 5. Panasonic My Home Screen (web app package)
 * 6. Roku OS (BrightScript channel package)
 * 7. Universal 10-Foot Standalone Web TV (for NAS / Raspberry Pi / Home Server self-hosting)
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const outDir = path.join(root, "dist-smart-tv");

console.log("=== Argus Universal Smart TV Packager ===");

if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, "index-tv.html"))) {
  console.log("dist/index-tv.html not found. Building TV assets first (pnpm build:tv)...");
  execSync("npm run build:tv", { cwd: root, stdio: "inherit" });
}

fs.mkdirSync(outDir, { recursive: true });

const iconSrc = path.join(root, "public", "icons", "icon.png");
const fallbackIcon = path.join(root, "src-tauri", "icons", "128x128.png");
function copyIcon(destPath) {
  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, destPath);
  } else if (fs.existsSync(fallbackIcon)) {
    fs.copyFileSync(fallbackIcon, destPath);
  }
}

// 1. Samsung Tizen OS (.wgt)
const tizenDir = path.join(outDir, "tizen-stage");
fs.rmSync(tizenDir, { recursive: true, force: true });
fs.mkdirSync(tizenDir, { recursive: true });
fs.cpSync(distDir, tizenDir, { recursive: true });
fs.copyFileSync(path.join(root, "smart-tv", "tizen", "config.xml"), path.join(tizenDir, "config.xml"));
copyIcon(path.join(tizenDir, "icon.png"));
fs.copyFileSync(path.join(distDir, "index-tv.html"), path.join(tizenDir, "index-tv.html"));
const tizenWgtPath = path.join(outDir, "Argus-Samsung-Tizen.wgt");
fs.rmSync(tizenWgtPath, { force: true });
execSync(`cd "${tizenDir}" && zip -r -9 "${tizenWgtPath}" ./*`, { stdio: "pipe" });
fs.rmSync(tizenDir, { recursive: true, force: true });
console.log(`✓ Generated Samsung Tizen WGT: Argus-Samsung-Tizen.wgt (${(fs.statSync(tizenWgtPath).size / (1024 * 1024)).toFixed(2)} MB)`);

// 2. LG webOS (.zip / .ipk)
const webosDir = path.join(outDir, "webos-stage");
fs.rmSync(webosDir, { recursive: true, force: true });
fs.mkdirSync(webosDir, { recursive: true });
fs.cpSync(distDir, webosDir, { recursive: true });
fs.copyFileSync(path.join(root, "smart-tv", "webos", "appinfo.json"), path.join(webosDir, "appinfo.json"));
copyIcon(path.join(webosDir, "icon.png"));
copyIcon(path.join(webosDir, "largeIcon.png"));
fs.copyFileSync(path.join(distDir, "index-tv.html"), path.join(webosDir, "index-tv.html"));
const webosZipPath = path.join(outDir, "Argus-LG-webOS.zip");
fs.rmSync(webosZipPath, { force: true });
execSync(`cd "${webosDir}" && zip -r -9 "${webosZipPath}" ./*`, { stdio: "pipe" });
fs.rmSync(webosDir, { recursive: true, force: true });
console.log(`✓ Generated LG webOS Bundle: Argus-LG-webOS.zip (${(fs.statSync(webosZipPath).size / (1024 * 1024)).toFixed(2)} MB)`);

// 3. Hisense VIDAA / Home OS (.zip)
const vidaaDir = path.join(outDir, "vidaa-stage");
fs.rmSync(vidaaDir, { recursive: true, force: true });
fs.mkdirSync(vidaaDir, { recursive: true });
fs.cpSync(distDir, vidaaDir, { recursive: true });
fs.copyFileSync(path.join(root, "smart-tv", "vidaa", "app.json"), path.join(vidaaDir, "app.json"));
copyIcon(path.join(vidaaDir, "icon.png"));
fs.copyFileSync(path.join(distDir, "index-tv.html"), path.join(vidaaDir, "index-tv.html"));
const vidaaZipPath = path.join(outDir, "Argus-Hisense-VIDAA.zip");
fs.rmSync(vidaaZipPath, { force: true });
execSync(`cd "${vidaaDir}" && zip -r -9 "${vidaaZipPath}" ./*`, { stdio: "pipe" });
fs.rmSync(vidaaDir, { recursive: true, force: true });
console.log(`✓ Generated Hisense VIDAA / Home OS Bundle: Argus-Hisense-VIDAA.zip (${(fs.statSync(vidaaZipPath).size / (1024 * 1024)).toFixed(2)} MB)`);

// 4. Philips Titan OS (.zip)
const titanDir = path.join(outDir, "titan-stage");
fs.rmSync(titanDir, { recursive: true, force: true });
fs.mkdirSync(titanDir, { recursive: true });
fs.cpSync(distDir, titanDir, { recursive: true });
fs.copyFileSync(path.join(root, "smart-tv", "titan-os", "manifest.json"), path.join(titanDir, "manifest.json"));
copyIcon(path.join(titanDir, "icon.png"));
fs.copyFileSync(path.join(distDir, "index-tv.html"), path.join(titanDir, "index-tv.html"));
const titanZipPath = path.join(outDir, "Argus-Philips-TitanOS.zip");
fs.rmSync(titanZipPath, { force: true });
execSync(`cd "${titanDir}" && zip -r -9 "${titanZipPath}" ./*`, { stdio: "pipe" });
fs.rmSync(titanDir, { recursive: true, force: true });
console.log(`✓ Generated Philips Titan OS Bundle: Argus-Philips-TitanOS.zip (${(fs.statSync(titanZipPath).size / (1024 * 1024)).toFixed(2)} MB)`);

// 5. Panasonic My Home Screen (.zip)
const panasonicDir = path.join(outDir, "panasonic-stage");
fs.rmSync(panasonicDir, { recursive: true, force: true });
fs.mkdirSync(panasonicDir, { recursive: true });
fs.cpSync(distDir, panasonicDir, { recursive: true });
fs.copyFileSync(path.join(root, "smart-tv", "panasonic", "manifest.json"), path.join(panasonicDir, "manifest.json"));
copyIcon(path.join(panasonicDir, "icon.png"));
fs.copyFileSync(path.join(distDir, "index-tv.html"), path.join(panasonicDir, "index-tv.html"));
const panasonicZipPath = path.join(outDir, "Argus-Panasonic-MyHomeScreen.zip");
fs.rmSync(panasonicZipPath, { force: true });
execSync(`cd "${panasonicDir}" && zip -r -9 "${panasonicZipPath}" ./*`, { stdio: "pipe" });
fs.rmSync(panasonicDir, { recursive: true, force: true });
console.log(`✓ Generated Panasonic My Home Screen Bundle: Argus-Panasonic-MyHomeScreen.zip (${(fs.statSync(panasonicZipPath).size / (1024 * 1024)).toFixed(2)} MB)`);

// 6. Roku OS Channel Package (.zip)
const rokuDir = path.join(outDir, "roku-stage");
fs.rmSync(rokuDir, { recursive: true, force: true });
fs.mkdirSync(path.join(rokuDir, "source"), { recursive: true });
fs.mkdirSync(path.join(rokuDir, "images"), { recursive: true });
fs.copyFileSync(path.join(root, "smart-tv", "roku", "manifest"), path.join(rokuDir, "manifest"));
copyIcon(path.join(rokuDir, "images", "icon.png"));
copyIcon(path.join(rokuDir, "images", "splash.png"));

// Write Roku main.brs entry script
const mainBrs = `
sub Main()
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.SetMessagePort(m.port)
    scene = screen.CreateScene("ArgusMainScene")
    screen.Show()
    while(true)
        msg = wait(0, m.port)
        if type(msg) = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        end if
    end while
end sub
`;
fs.writeFileSync(path.join(rokuDir, "source", "main.brs"), mainBrs.trim());

const rokuZipPath = path.join(outDir, "Argus-Roku-Channel.zip");
fs.rmSync(rokuZipPath, { force: true });
execSync(`cd "${rokuDir}" && zip -r -9 "${rokuZipPath}" ./*`, { stdio: "pipe" });
fs.rmSync(rokuDir, { recursive: true, force: true });
console.log(`✓ Generated Roku Channel Bundle: Argus-Roku-Channel.zip (${(fs.statSync(rokuZipPath).size / 1024).toFixed(2)} KB)`);

// 7. Standalone Web TV Package (for NAS / Raspberry Pi / local servers)
const webTvZipPath = path.join(outDir, "Argus-WebTV-10foot-standalone.zip");
fs.rmSync(webTvZipPath, { force: true });
execSync(`cd "${distDir}" && zip -r -9 "${webTvZipPath}" ./*`, { stdio: "pipe" });
console.log(`✓ Generated Standalone Web TV Bundle: Argus-WebTV-10foot-standalone.zip (${(fs.statSync(webTvZipPath).size / (1024 * 1024)).toFixed(2)} MB)`);

console.log("\nAll Smart TV packages successfully generated in dist-smart-tv/!\n");
