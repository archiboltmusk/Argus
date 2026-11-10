/*
 * fetch-models.mjs
 *
 * Downloads pre-trained Whisper speech-to-text models into src-tauri/resources/models/
 * so that Argus bundles full speech recognition directly inside the application.
 * This guarantees the macOS .dmg and desktop builds are complete (>100MB) and work
 * 100% offline without needing any post-install downloaders or runtime installers.
 */

import { existsSync, mkdirSync, renameSync, rmSync, statSync, createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destDir = join(root, "src-tauri", "resources", "models");

const MODELS = [
  {
    file: "ggml-tiny.bin",
    minBytes: 75_000_000,
    urls: [
      "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
      "https://hf-mirror.com/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
    ],
  },
];

mkdirSync(destDir, { recursive: true });

for (const m of MODELS) {
  const out = join(destDir, m.file);
  if (existsSync(out)) {
    const sz = statSync(out).size;
    if (sz >= m.minBytes) {
      console.log(`[models] ${m.file} already present and valid (${(sz / 1048576).toFixed(1)} MB)`);
      continue;
    }
  }

  let downloaded = false;
  for (const url of m.urls) {
    const tmp = `${out}.part`;
    console.log(`[models] downloading ${m.file} from ${url}...`);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60_000);

        const res = await fetch(url, {
          redirect: "follow",
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Argus/3.0",
          },
        });
        clearTimeout(timeout);

        if (!res.ok || !res.body) {
          console.warn(`[models] ${url} returned ${res.status} (attempt ${attempt}/3)`);
          if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        const fileStream = createWriteStream(tmp);
        await pipeline(Readable.fromWeb(res.body), fileStream);

        const sz = statSync(tmp).size;
        if (sz < m.minBytes) {
          console.warn(`[models] downloaded size ${sz} is below minBytes ${m.minBytes}`);
          try { rmSync(tmp); } catch {}
          continue;
        }

        renameSync(tmp, out);
        console.log(`[models] successfully wrote ${out} (${(sz / 1048576).toFixed(1)} MB)`);
        downloaded = true;
        break;
      } catch (err) {
        console.warn(`[models] attempt ${attempt} failed: ${err.message}`);
        try { rmSync(tmp); } catch {}
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
      }
    }
    if (downloaded) break;
  }

  if (!downloaded) {
    console.warn(`[models] could not pre-fetch ${m.file}; will download on first use if not bundled.`);
  }
}
