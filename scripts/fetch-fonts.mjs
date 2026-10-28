import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const NOTO_MIRRORS = process.env.ARGUS_FONTS_BASE
  ? [process.env.ARGUS_FONTS_BASE]
  : [
      "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/SubsetOTF/JP",
      "https://fastly.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/SubsetOTF/JP",
      "https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/SubsetOTF/JP",
    ];

const OFL_MIRRORS = process.env.ARGUS_OFL_BASE
  ? [process.env.ARGUS_OFL_BASE]
  : [
      "https://cdn.jsdelivr.net/gh/google/fonts@2796410152d4f9524b68ed46e69c1b60f8e0f7c3/ofl",
      "https://fastly.jsdelivr.net/gh/google/fonts@2796410152d4f9524b68ed46e69c1b60f8e0f7c3/ofl",
      "https://raw.githubusercontent.com/google/fonts/2796410152d4f9524b68ed46e69c1b60f8e0f7c3/ofl",
    ];

const FONTS = [
  {
    file: "NotoSansJP-Regular.otf",
    urls: NOTO_MIRRORS.map((m) => `${m}/NotoSansJP-Regular.otf`),
    sha256: "dff723ba59d57d136764a04b9b2d03205544f7cd785a711442d6d2d085ac5073",
  },
  {
    file: "NotoSansJP-Bold.otf",
    urls: NOTO_MIRRORS.map((m) => `${m}/NotoSansJP-Bold.otf`),
    sha256: "1b0edfb500b73a4fa8a4fcaae1bbbd403994e08e73e3e0da37e70d3853f42c5f",
  },
  {
    file: "Inter-Variable.ttf",
    urls: OFL_MIRRORS.map((m) => `${m}/inter/Inter%5Bopsz,wght%5D.ttf`),
    sha256: "29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031",
  },
  {
    file: "Fredoka-Variable.ttf",
    urls: OFL_MIRRORS.map((m) => `${m}/fredoka/Fredoka%5Bwdth,wght%5D.ttf`),
    sha256: "2ba02e68b152868aef9ba28e24b3648c7d457fe6f25c761f2c2c53fb61a73fc8",
  },
  {
    file: "Vazirmatn-Variable.ttf",
    urls: OFL_MIRRORS.map((m) => `${m}/vazirmatn/Vazirmatn%5Bwght%5D.ttf`),
    sha256: "696249a2c74b39ffdef55de4df2809c5b639d3ff80d618d8160a095d2fd49dca",
  },
];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "src-tauri", "fonts");
const digest = (buf) => createHash("sha256").update(buf).digest("hex");

mkdirSync(dest, { recursive: true });
for (const f of FONTS) {
  const out = join(dest, f.file);
  if (existsSync(out) && digest(readFileSync(out)) === f.sha256) {
    console.log(`[fonts] ${f.file} already present and verified`);
    continue;
  }

  let downloadedBuf = null;
  for (const url of f.urls) {
    console.log(`[fonts] fetching ${url}`);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, {
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Argus/1.0",
          },
        });
        if (res.status === 429) {
          console.warn(`[fonts] rate limited (429) on ${url}, attempt ${attempt}/3`);
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 1000 * attempt));
            continue;
          }
          break;
        }
        if (!res.ok) {
          console.warn(`[fonts] ${url} returned ${res.status} ${res.statusText}`);
          break;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        const got = digest(buf);
        if (got !== f.sha256) {
          console.warn(`[fonts] checksum mismatch from ${url} (got ${got})`);
          break;
        }
        downloadedBuf = buf;
        break;
      } catch (err) {
        console.warn(`[fonts] error fetching ${url}: ${err.message}`);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    if (downloadedBuf) break;
  }

  if (!downloadedBuf) {
    console.error(`[fonts] all mirrors failed for ${f.file}`);
    console.error("[fonts] set ARGUS_FONTS_BASE or ARGUS_OFL_BASE to a mirror, or drop the font into src-tauri/fonts/ by hand");
    process.exit(1);
  }

  writeFileSync(out, downloadedBuf);
  console.log(`[fonts] wrote ${out} (${(downloadedBuf.length / 1048576).toFixed(1)} MB)`);
}
