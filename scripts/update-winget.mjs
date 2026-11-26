#!/usr/bin/env node
/**
 * Updates winget/*.yaml manifests with the target release version and Windows installer SHA-256.
 *
 * Usage:
 *   node scripts/update-winget.mjs v3.17.23
 *   node scripts/update-winget.mjs 3.17.23 --sha256 <64-hex>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const versionArg = args.find((a) => !a.startsWith("--"));
if (!versionArg) {
  console.error("Usage: node scripts/update-winget.mjs <version|vTag> [--sha256 <hex>]");
  process.exit(1);
}

const cleanVersion = versionArg.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(cleanVersion)) {
  console.error(`Invalid version "${versionArg}"`);
  process.exit(1);
}

const shaIdx = args.indexOf("--sha256");
let x64Sha = shaIdx !== -1 && shaIdx + 1 < args.length ? args[shaIdx + 1] : null;

if (!x64Sha) {
  const sumsUrl = `https://github.com/archiboltmusk/Argus/releases/download/v${cleanVersion}/SHA256SUMS.txt`;
  const res = await fetch(sumsUrl);
  if (!res.ok) {
    console.error(`Failed to fetch ${sumsUrl}: HTTP ${res.status}`);
    process.exit(1);
  }
  const text = await res.text();
  const line = text.split(/\r?\n/).find((l) => /\bArgus-windows-x64-setup\.exe\s*$/.test(l));
  const match = line?.match(/^([a-fA-F0-9]{64})\s+/);
  if (!match) {
    console.error(`Could not find Argus-windows-x64-setup.exe checksum in ${sumsUrl}`);
    process.exit(1);
  }
  x64Sha = match[1].toUpperCase();
} else {
  x64Sha = x64Sha.toUpperCase();
}

if (!/^[A-F0-9]{64}$/.test(x64Sha)) {
  console.error(`Invalid SHA-256 hash: "${x64Sha}"`);
  process.exit(1);
}

const files = [
  "winget/archiboltmusk.Argus.yaml",
  "winget/archiboltmusk.Argus.locale.en-US.yaml",
  "winget/archiboltmusk.Argus.installer.yaml",
];

for (const rel of files) {
  const full = resolve(process.cwd(), rel);
  let content = readFileSync(full, "utf8").replace(
    /^PackageVersion:\s*.+$/m,
    `PackageVersion: ${cleanVersion}`,
  );
  if (rel.endsWith(".installer.yaml")) {
    content = content
      .replace(
        /InstallerUrl:\s*https:\/\/github\.com\/archiboltmusk\/Argus\/releases\/download\/v[^/]+\/Argus-windows-x64-setup\.exe/m,
        `InstallerUrl: https://github.com/archiboltmusk/Argus/releases/download/v${cleanVersion}/Argus-windows-x64-setup.exe`,
      )
      .replace(/InstallerSha256:\s*[A-Fa-f0-9]{64}/m, `InstallerSha256: ${x64Sha}`);
  }
  writeFileSync(full, content, "utf8");
}

console.log(`Updated winget manifests -> v${cleanVersion} (x64 sha256: ${x64Sha})`);
