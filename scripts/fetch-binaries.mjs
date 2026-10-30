/*
 * fetch-binaries.mjs
 *
 * Downloads the Tauri "externalBin" sidecars (yt-dlp, ffmpeg, ffprobe) for the
 * CURRENT OS + arch and writes them to src-tauri/binaries/<name>-<triple>[.exe],
 * which is exactly the path tauri.conf.json externalBin resolves to at build time.
 */

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const binDir = join(root, "src-tauri", "binaries");

function targetTriple() {
  const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
  if (process.platform === "win32") return `${arch}-pc-windows-msvc`;
  if (process.platform === "darwin") return `${arch}-apple-darwin`;
  return `${arch}-unknown-linux-gnu`;
}

const EXE = process.platform === "win32" ? ".exe" : "";
const triple = targetTriple();
const mb = (p) => (statSync(p).size / 1048576).toFixed(0);

const YTDLP = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";
const BTBN = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest";
const EVERMEET_INFO = "https://evermeet.cx/ffmpeg/info";
const GYAN = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip";
const DESCRIPT = "https://github.com/descriptinc/ffmpeg-ffprobe-static/releases/download/b6.1.2-rc.1";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function resolveEvermeetUrl(name) {
  const infoUrl = `${EVERMEET_INFO}/${name}/release`;
  console.log(`[binaries] resolving evermeet URL via ${infoUrl}`);
  const res = await fetch(infoUrl, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!res.ok) throw new Error(`evermeet info API failed (${res.status} ${res.statusText})`);
  const info = await res.json();
  const zipUrl = info?.download?.zip?.url;
  if (!zipUrl) throw new Error(`evermeet info API returned no zip URL for ${name}`);
  return zipUrl;
}

const SOURCES = {
  "yt-dlp": {
    "x86_64-unknown-linux-gnu": { kind: "raw", url: `${YTDLP}/yt-dlp_linux` },
    "aarch64-unknown-linux-gnu": { kind: "raw", url: `${YTDLP}/yt-dlp_linux_aarch64` },
    "x86_64-apple-darwin": { kind: "raw", url: `${YTDLP}/yt-dlp_macos` },
    "aarch64-apple-darwin": { kind: "raw", url: `${YTDLP}/yt-dlp_macos` },
    "x86_64-pc-windows-msvc": { kind: "raw", url: `${YTDLP}/yt-dlp.exe` },
  },
  ffmpeg: {
    "x86_64-unknown-linux-gnu": { kind: "tar.xz", url: `${BTBN}/ffmpeg-master-latest-linux64-gpl.tar.xz`, member: "ffmpeg" },
    "aarch64-unknown-linux-gnu": { kind: "tar.xz", url: `${BTBN}/ffmpeg-master-latest-linuxarm64-gpl.tar.xz`, member: "ffmpeg" },
    "x86_64-apple-darwin": { kind: "evermeet", infoName: "ffmpeg", member: "ffmpeg" },
    "aarch64-apple-darwin": {
      kind: "raw",
      url: `${DESCRIPT}/ffmpeg-darwin-arm64`,
      fallback: { kind: "zip", url: "https://www.osxexperts.net/ffmpeg71arm.zip", member: "ffmpeg" },
    },
    "x86_64-pc-windows-msvc": { kind: "zip", url: GYAN, member: "ffmpeg.exe" },
  },
  ffprobe: {
    "x86_64-unknown-linux-gnu": { kind: "tar.xz", url: `${BTBN}/ffmpeg-master-latest-linux64-gpl.tar.xz`, member: "ffprobe" },
    "aarch64-unknown-linux-gnu": { kind: "tar.xz", url: `${BTBN}/ffmpeg-master-latest-linuxarm64-gpl.tar.xz`, member: "ffprobe" },
    "x86_64-apple-darwin": { kind: "evermeet", infoName: "ffprobe", member: "ffprobe" },
    "aarch64-apple-darwin": {
      kind: "raw",
      url: `${DESCRIPT}/ffprobe-darwin-arm64`,
      fallback: { kind: "zip", url: "https://www.osxexperts.net/ffprobe71arm.zip", member: "ffprobe" },
    },
    "x86_64-pc-windows-msvc": { kind: "zip", url: GYAN, member: "ffprobe.exe" },
  },
};

const OVERRIDE = {
  "yt-dlp": process.env.ARGUS_YTDLP_URL,
  ffmpeg: process.env.ARGUS_FFMPEG_URL,
  ffprobe: process.env.ARGUS_FFPROBE_URL,
};

const ENVVAR = {
  "yt-dlp": "ARGUS_YTDLP_URL",
  ffmpeg: "ARGUS_FFMPEG_URL",
  ffprobe: "ARGUS_FFPROBE_URL",
};

const dlCache = new Map();
async function download(url) {
  if (dlCache.has(url)) return dlCache.get(url);
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[binaries] fetching ${url} (attempt ${attempt})`);
      const res = await fetch(url, { redirect: "follow", headers: { "user-agent": UA, accept: "*/*" } });
      if (!res.ok) throw new Error(`download failed (${res.status} ${res.statusText})`);
      const buf = Buffer.from(await res.arrayBuffer());
      dlCache.set(url, buf);
      return buf;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastErr;
}

function walk(dir, out) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function findMember(dir, name) {
  let best = null;
  let bestSize = -1;
  for (const p of walk(dir, [])) {
    if (basename(p) !== name) continue;
    const size = statSync(p).size;
    if (size > bestSize) {
      best = p;
      bestSize = size;
    }
  }
  return best;
}

function extractMember(buf, kind, member, dest) {
  const tmp = mkdtempSync(join(tmpdir(), "argus-bin-"));
  try {
    const archive = join(tmp, kind === "tar.xz" ? "archive.tar.xz" : "archive.zip");
    writeFileSync(archive, buf);
    const outDir = join(tmp, "out");
    mkdirSync(outDir, { recursive: true });
    if (kind === "tar.xz") {
      execFileSync("tar", ["-xJf", archive, "-C", outDir], { stdio: "inherit" });
    } else if (process.platform === "win32") {
      execFileSync(
        "powershell",
        ["-NoProfile", "-NonInteractive", "-Command", `Expand-Archive -LiteralPath "${archive}" -DestinationPath "${outDir}" -Force`],
        { stdio: "inherit" },
      );
    } else {
      execFileSync("unzip", ["-oq", archive, "-d", outDir], { stdio: "inherit" });
    }
    const found = findMember(outDir, member);
    if (!found) throw new Error(`could not find ${member} inside archive`);
    copyFileSync(found, dest);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true });

let ok = true;
for (const name of ["yt-dlp", "ffmpeg", "ffprobe"]) {
  const dest = join(binDir, `${name}-${triple}${EXE}`);
  if (existsSync(dest) && statSync(dest).size > 0) {
    console.log(`[binaries] ${name}-${triple}${EXE} already present (${mb(dest)} MB)`);
    continue;
  }
  const spec = SOURCES[name][triple];
  if (!spec) {
    console.error(`[binaries] no known source for ${name} on ${triple}`);
    ok = false;
    continue;
  }
  let success = false;
  const attempts = [];
  if (OVERRIDE[name]) {
    attempts.push({ url: OVERRIDE[name], kind: spec.kind, member: spec.member });
  } else {
    attempts.push({ url: spec.url, kind: spec.kind, member: spec.member });
    if (spec.fallback) attempts.push(spec.fallback);
  }

  for (const att of attempts) {
    try {
      let resolvedUrl = att.url;
      if (att.kind === "evermeet") {
        resolvedUrl = await resolveEvermeetUrl(spec.infoName);
        att.kind = "zip";
      }
      const buf = await download(resolvedUrl);
      if (att.kind === "raw") writeFileSync(dest, buf);
      else extractMember(buf, att.kind, att.member, dest);
      if (process.platform !== "win32") chmodSync(dest, 0o755);
      console.log(`[binaries] wrote ${name}-${triple}${EXE} (${mb(dest)} MB)`);
      success = true;
      break;
    } catch (err) {
      console.warn(`[binaries] ${name} attempt failed from ${att.url}: ${err.message}`);
    }
  }

  // Fallback to local system binary if available (e.g. CI runner homebrew)
  if (!success && process.platform !== "win32") {
    try {
      const sysCandidates = [
        `/opt/homebrew/bin/${name}`,
        `/usr/local/bin/${name}`,
        `/usr/bin/${name}`,
      ];
      for (const cand of sysCandidates) {
        if (existsSync(cand) && statSync(cand).size > 0) {
          console.log(`[binaries] copying system ${name} from ${cand}`);
          copyFileSync(cand, dest);
          chmodSync(dest, 0o755);
          success = true;
          break;
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (!success) {
    console.error(`[binaries] failed to obtain ${name}-${triple}${EXE}`);
    ok = false;
  }
}

if (!ok) {
  console.error("[binaries] one or more sidecars are missing; see messages above");
  process.exit(1);
}
console.log(`[binaries] all sidecars ready for ${triple}`);
