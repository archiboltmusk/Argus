/**
 * Mihon & Tachiyomi Extension Repository Importer for Argus
 *
 * Ingests and bridges Mihon (formerly Tachiyomi) repositories (e.g. Keiyoushi):
 * 1. Fetches and parses index.min.json / index.json
 * 2. Unpacks all extension sources (names, languages, baseUrls, IDs, and APKs)
 * 3. Registers sources into Argus's Manga Catalog and syncs with local Suwayomi/Ghost daemon
 */

import { safeFetch } from "@/lib/safe-fetch";
import { assertSafeUrl } from "@/lib/manga/plugins/host-http";
import { addHtmlSource, listMangaSources } from "@/lib/manga/sources";
import { probeLocalSuwayomi } from "../suwayomi/daemon";

export interface MihonExtensionEntry {
  name: string;
  pkg: string;
  apk: string;
  lang: string;
  code: number;
  version: string;
  nsfw?: number;
  sources?: Array<{
    name: string;
    lang: string;
    id: string;
    baseUrl: string;
  }>;
}

export interface MihonRepoResult {
  installed: number;
  failed: number;
  syncedWithDaemon: boolean;
}

const FETCH_TIMEOUT = 25_000;

/**
 * Normalizes any Mihon / Tachiyomi / Keiyoushi repository URL:
 * - Maps GitHub raw/blob URLs to raw.githubusercontent.com
 * - Automatically redirects index.pb (binary protobuf) to index.min.json
 * - Handles bare repository paths by appending index.min.json
 */
export function normalizeMihonRepoUrl(url: string): string {
  let u = url.trim();
  if (u.includes("github.com/")) {
    u = u.replace("github.com/", "raw.githubusercontent.com/").replace(/\/raw\//, "/").replace(/\/blob\//, "/");
  }
  if (u.endsWith("/index.pb") || u.endsWith("index.pb")) {
    u = u.replace(/index\.pb$/i, "index.min.json");
  } else if (u.endsWith(".pb")) {
    u = u.replace(/\.pb$/i, ".min.json");
  } else if (!u.endsWith(".json") && !u.endsWith(".json/")) {
    u = u.replace(/\/+$/, "") + "/index.min.json";
  }
  return u;
}

/**
 * Fetch and parse a Mihon / Tachiyomi extension repository index
 */
export async function fetchMihonIndex(url: string): Promise<MihonExtensionEntry[]> {
  const normalized = normalizeMihonRepoUrl(url);
  const target = assertSafeUrl(normalized);
  const res = await safeFetch(target, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
  if (!res.ok) throw new Error(`Mihon repository index fetch failed (${res.status})`);

  const data: unknown = JSON.parse(await res.text());
  if (!Array.isArray(data)) return [];

  return data.filter((item): item is MihonExtensionEntry => {
    return !!item && typeof item === "object" && typeof item.apk === "string" && typeof item.pkg === "string";
  });
}

/**
 * Imports all sources from a Mihon repository into Argus
 */
export async function importMihonRepo(
  url: string,
  onProgress?: (done: number, total: number) => void,
): Promise<MihonRepoResult> {
  const extensions = await fetchMihonIndex(url);
  let installed = 0;
  let failed = 0;

  // Check if local Suwayomi daemon is listening on port 4567
  const isDaemonOnline = await probeLocalSuwayomi();
  if (isDaemonOnline) {
    // Sync extension repo URL to local Suwayomi server settings
    try {
      await fetch("http://127.0.0.1:4567/api/v1/settings/server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extensionStores: [url],
        }),
      });
    } catch {
      /* ignore sync error */
    }
  }

  // Extract all individual manga sources declared across packages
  const existingBases = new Set(listMangaSources().map((s) => s.baseUrl.toLowerCase().replace(/\/+$/, "")));
  const allSources: Array<{ name: string; baseUrl: string }> = [];

  for (const ext of extensions) {
    if (ext.sources && Array.isArray(ext.sources)) {
      for (const s of ext.sources) {
        if (s.baseUrl && !existingBases.has(s.baseUrl.toLowerCase().replace(/\/+$/, ""))) {
          allSources.push({
            name: s.name || ext.name,
            baseUrl: s.baseUrl,
          });
          existingBases.add(s.baseUrl.toLowerCase().replace(/\/+$/, ""));
        }
      }
    } else if (ext.name && ext.pkg) {
      // Package fallback
      const cleanName = ext.name.replace(/^Tachiyomi:\s*/i, "");
      allSources.push({
        name: cleanName,
        baseUrl: `https://mihon.invalid/${encodeURIComponent(ext.pkg)}`,
      });
    }
  }

  const total = allSources.length;
  for (let i = 0; i < total; i++) {
    const src = allSources[i];
    try {
      if (src.baseUrl.startsWith("http")) {
        const added = addHtmlSource({
          name: src.name,
          baseUrl: src.baseUrl,
          popularPath: "/",
          searchPath: "/?s={query}",
          list: {
            item: "article, .manga-item, .entry, .bsx, div.card",
            link: "a",
            title: "h2, h3, h4, .title, a@title",
            cover: "img@src|img@data-src",
          },
          chapters: {
            item: "li.chapter, .wp-manga-chapter, .chapter-list li",
            link: "a",
            title: "a",
          },
          pages: {
            image: "img.page-image, .reading-content img, #readerarea img",
          },
        });
        if (added) installed++;
        else failed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
    onProgress?.(i + 1, total);
  }

  return {
    installed,
    failed,
    syncedWithDaemon: isDaemonOnline,
  };
}
