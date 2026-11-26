#!/usr/bin/env node
/**
 * Updates Casks/argus.rb with the target release version and Argus-aarch64.dmg SHA-256.
 *
 * Usage:
 *   node scripts/update-homebrew-cask.mjs v3.17.23
 *   node scripts/update-homebrew-cask.mjs 3.17.23 --sha256 <64-hex>
 *   node scripts/update-homebrew-cask.mjs 3.17.23 --file ./Argus-aarch64.dmg
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const versionArg = args.find((a) => !a.startsWith("--"));
if (!versionArg) {
  console.error("Usage: node scripts/update-homebrew-cask.mjs <version|vTag> [--sha256 <hex> | --file <dmg>]");
  process.exit(1);
}

const cleanVersion = versionArg.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(cleanVersion)) {
  console.error(`Invalid version "${versionArg}"`);
  process.exit(1);
}

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

let sha256 = getArgValue("--sha256");
const dmgPath = getArgValue("--file");

if (!sha256 && dmgPath) {
  const bytes = readFileSync(resolve(process.cwd(), dmgPath));
  sha256 = createHash("sha256").update(bytes).digest("hex");
}

if (!sha256) {
  const sumsUrl = `https://github.com/archiboltmusk/Argus/releases/download/v${cleanVersion}/SHA256SUMS.txt`;
  const res = await fetch(sumsUrl);
  if (!res.ok) {
    console.error(`Failed to fetch ${sumsUrl}: HTTP ${res.status}`);
    process.exit(1);
  }
  const text = await res.text();
  const line = text.split(/\r?\n/).find((l) => /\bArgus-aarch64\.dmg\s*$/.test(l));
  const match = line?.match(/^([a-fA-F0-9]{64})\s+/);
  if (!match) {
    console.error(`Could not find Argus-aarch64.dmg checksum in ${sumsUrl}`);
    process.exit(1);
  }
  sha256 = match[1].toLowerCase();
}

if (!/^[a-fA-F0-9]{64}$/.test(sha256)) {
  console.error(`Invalid SHA-256 hash: "${sha256}"`);
  process.exit(1);
}

const caskPath = resolve(process.cwd(), "Casks/argus.rb");
const original = readFileSync(caskPath, "utf8");
const updated = original
  .replace(/^\s*version\s+"[^"]+"/m, `  version "${cleanVersion}"`)
  .replace(/^\s*sha256\s+"[^"]+"/m, `  sha256 "${sha256.toLowerCase()}"`);

if (updated === original) {
  console.log(`Casks/argus.rb is already at ${cleanVersion} (${sha256.toLowerCase()}).`);
} else {
  writeFileSync(caskPath, updated, "utf8");
  console.log(`Updated Casks/argus.rb -> v${cleanVersion} (sha256: ${sha256.toLowerCase()})`);
}
