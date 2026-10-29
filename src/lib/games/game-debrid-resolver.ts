import { hashFromMagnet } from "@/lib/debrid/types";
import { createRealDebrid } from "@/lib/debrid/realdebrid";
import { createTorbox } from "@/lib/debrid/torbox";
import { createAllDebrid } from "@/lib/debrid/alldebrid";
import type { SourceFile } from "./sources";

export type DebridResolvedGameFile = {
  originalUrl: string;
  downloadUrl: string;
  filename: string;
  filesize?: number;
  provider: "rd" | "tb" | "ad" | "direct";
  providerName: string;
  isCached: boolean;
};

export type DebridGameSettings = {
  rdKey?: string | null;
  tbKey?: string | null;
  adKey?: string | null;
};

/**
 * Resolves a game download source (magnet or supported cyberlocker link)
 * through configured Debrid services (Real-Debrid, TorBox, AllDebrid).
 * Provides uncapped line speed and bypasses dead swarms / hoster limits.
 */
export async function resolveGameFileViaDebrid(
  file: SourceFile,
  settings: DebridGameSettings,
  signal: AbortSignal = new AbortController().signal,
): Promise<DebridResolvedGameFile | null> {
  const url = file.url;
  const isMagnet = url.startsWith("magnet:") || file.kind === "magnet";

  // 1. Real-Debrid Resolution
  if (settings.rdKey?.trim()) {
    try {
      const rd = createRealDebrid(settings.rdKey.trim());
      if (isMagnet) {
        const hash = hashFromMagnet(url);
        if (hash) {
          const cacheResult = await rd.cacheCheck([hash], signal);
          const isCached = !!(cacheResult.ok && cacheResult.data[hash.toLowerCase()]);

          const playResult = await rd.playableUrl(url, undefined, signal);
          if (playResult.ok) {
            return {
              originalUrl: url,
              downloadUrl: playResult.data.url,
              filename: playResult.data.filename || file.name,
              filesize: playResult.data.filesize || file.sizeBytes,
              provider: "rd",
              providerName: "Real-Debrid (Instant CDN)",
              isCached,
            };
          }
        }
      }
    } catch {
      // Fall through to next provider
    }
  }

  // 2. TorBox Resolution
  if (settings.tbKey?.trim()) {
    try {
      const tb = createTorbox(settings.tbKey.trim());
      if (isMagnet) {
        const playResult = await tb.playableUrl(url, undefined, signal);
        if (playResult.ok) {
          return {
            originalUrl: url,
            downloadUrl: playResult.data.url,
            filename: playResult.data.filename || file.name,
            filesize: playResult.data.filesize || file.sizeBytes,
            provider: "tb",
            providerName: "TorBox High-Speed CDN",
            isCached: true,
          };
        }
      }
    } catch {
      // Fall through
    }
  }

  // 3. AllDebrid Resolution
  if (settings.adKey?.trim()) {
    try {
      const ad = createAllDebrid(settings.adKey.trim());
      if (isMagnet) {
        const playResult = await ad.playableUrl(url, undefined, signal);
        if (playResult.ok) {
          return {
            originalUrl: url,
            downloadUrl: playResult.data.url,
            filename: playResult.data.filename || file.name,
            filesize: playResult.data.filesize || file.sizeBytes,
            provider: "ad",
            providerName: "AllDebrid",
            isCached: true,
          };
        }
      }
    } catch {
      // Fall through
    }
  }

  // Direct file fallback
  if (file.kind === "direct") {
    return {
      originalUrl: url,
      downloadUrl: url,
      filename: file.name,
      filesize: file.sizeBytes,
      provider: "direct",
      providerName: "Direct Web Host",
      isCached: false,
    };
  }

  return null;
}
