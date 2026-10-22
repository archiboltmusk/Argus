import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SHA256 = "0a81c004aae0ee7d512b9a26e38f66281f9591e84e1663215cc3a36a4bde6f6a";
// The pinned DLL rides on the community build-dependencies release; the SHA-256 below is the authority.
const TAG = process.env.ARGUS_LIBMPV_TAG ?? "community-build-dependencies-0.9.132";
const url =
  process.env.ARGUS_LIBMPV_URL ??
  `https://github.com/archiboltmusk/Argus/releases/download/${TAG}/libmpv-2.dll`;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "src-tauri", "libmpv", "libmpv-2.dll");
const digest = (buf) => createHash("sha256").update(buf).digest("hex");

if (process.platform !== "win32" && !process.env.ARGUS_LIBMPV_FORCE) {
  console.log("[libmpv] not Windows, skipping (mac and linux link system libmpv)");
  process.exit(0);
}

if (existsSync(dest) && digest(readFileSync(dest)) === SHA256) {
  console.log("[libmpv] libmpv-2.dll already present and verified");
  process.exit(0);
}

// The pinned DLL is not published anywhere Argus owns yet, so fall back to the
// libmpv in the mpv-dev archive from the same shinchiro build fetch-mpv.mjs uses.
const DEV_RELEASE = "20261010";
const DEV_ASSET = "mpv-dev-x86_64-20261010-git-b2c255c13e.7z";
const DEV_SHA256 = "394490ed6354c2294b87c63dfa3663b23524b5551aace9cbe35c4085682b14fa";

function findFile(dir, name) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(path, name);
      if (found) return found;
    } else if (entry.name === name) {
      return path;
    }
  }
  return null;
}

async function fromDevArchive() {
  const devUrl = `https://github.com/shinchiro/mpv-winbuild-cmake/releases/download/${DEV_RELEASE}/${DEV_ASSET}`;
  console.log(`[libmpv] falling back to ${devUrl}`);
  const res = await fetch(devUrl, { redirect: "follow" });
  if (!res.ok) throw new Error(`[libmpv] fallback download failed (${res.status} ${res.statusText})`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const got = digest(bytes);
  if (got !== DEV_SHA256) {
    throw new Error(`[libmpv] fallback archive checksum mismatch (expected ${DEV_SHA256 || "<unset>"}, got ${got})`);
  }
  const temp = mkdtempSync(join(tmpdir(), "argus-libmpv-"));
  try {
    const archive = join(temp, DEV_ASSET);
    writeFileSync(archive, bytes);
    const extracted = join(temp, "extracted");
    mkdirSync(extracted);
    execFileSync("7z", ["x", "-y", archive, `-o${extracted}`], { stdio: "inherit" });
    const dll = findFile(extracted, "libmpv-2.dll");
    if (!dll) throw new Error("[libmpv] libmpv-2.dll was not found in the fallback archive");
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(dll, dest);
    console.log(`[libmpv] wrote ${dest} from the fallback archive`);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

console.log(`[libmpv] fetching ${url}`);
const res = await fetch(url, { redirect: "follow" });
if (!res.ok) {
  console.error(`[libmpv] download failed (${res.status} ${res.statusText})`);
  try {
    await fromDevArchive();
    process.exit(0);
  } catch (error) {
    console.error(String(error instanceof Error ? error.message : error));
    console.error("[libmpv] set ARGUS_LIBMPV_URL to a mirror, or drop libmpv-2.dll into src-tauri/libmpv/ by hand");
    process.exit(1);
  }
}
const buf = Buffer.from(await res.arrayBuffer());
const got = digest(buf);
if (got !== SHA256) {
  console.error(`[libmpv] checksum mismatch (expected ${SHA256}, got ${got})`);
  process.exit(1);
}
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, buf);
console.log(`[libmpv] wrote ${dest} (${(buf.length / 1048576).toFixed(1)} MB)`);
