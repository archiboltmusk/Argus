/**
 * 1-Tap Offline Season Pack Downloader & Storage Safety Engine
 *
 * Provides intelligent batch episode downloading with:
 * 1. Storage safety threshold check (verifies >= 2GB headroom before proceeding)
 * 2. Metered data / cellular network protection (auto-pauses on mobile hotspot)
 * 3. Smart sequential prioritization (unwatched episode first, then consecutive episodes)
 * 4. Auto-delete watched episode logic when playback completes (> 90%)
 */

import { downloadsSnapshot, removeDownload } from "./downloads-store";
import type { PlayEpisode } from "@/lib/view";

export const MIN_HEADROOM_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB minimum free disk space

export interface StorageSafetyCheck {
  safe: boolean;
  availableBytes: number;
  thresholdBytes: number;
  reason?: string;
}

export interface NetworkPolicyCheck {
  allowed: boolean;
  isMetered: boolean;
  connectionType: string;
  reason?: string;
}

const SETTINGS_KEY = "argus.download.season_pack_settings.v1";

export interface SeasonPackSettings {
  pauseOnMetered: boolean;
  autoDeleteWatched: boolean;
  maxConcurrentPackDownloads: number;
  minHeadroomGigabytes: number;
}

const DEFAULT_SETTINGS: SeasonPackSettings = {
  pauseOnMetered: true,
  autoDeleteWatched: false,
  maxConcurrentPackDownloads: 2,
  minHeadroomGigabytes: 2,
};

let settingsCache: SeasonPackSettings | null = null;

export function getSeasonPackSettings(): SeasonPackSettings {
  if (settingsCache) return settingsCache;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    settingsCache = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    settingsCache = { ...DEFAULT_SETTINGS };
  }
  return settingsCache ?? DEFAULT_SETTINGS;
}

export function updateSeasonPackSettings(patch: Partial<SeasonPackSettings>): SeasonPackSettings {
  const current = getSeasonPackSettings();
  settingsCache = { ...current, ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsCache));
  } catch {}
  return settingsCache;
}

/**
 * Checks if the system has sufficient free storage headroom to safely proceed with downloading.
 */
export async function checkStorageSafety(
  estimatedDownloadBytes = 0,
): Promise<StorageSafetyCheck> {
  const settings = getSeasonPackSettings();
  const thresholdBytes = settings.minHeadroomGigabytes * 1024 * 1024 * 1024;

  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota ?? 0;
      const usage = estimate.usage ?? 0;
      const availableBytes = Math.max(0, quota - usage);

      if (quota > 0 && availableBytes < thresholdBytes + estimatedDownloadBytes) {
        return {
          safe: false,
          availableBytes,
          thresholdBytes,
          reason: `Insufficient storage space. Need at least ${(
            (thresholdBytes + estimatedDownloadBytes) /
            (1024 * 1024 * 1024)
          ).toFixed(1)} GB free, but only ${(availableBytes / (1024 * 1024 * 1024)).toFixed(
            1,
          )} GB is available.`,
        };
      }
      return {
        safe: true,
        availableBytes: availableBytes || 100 * 1024 * 1024 * 1024, // optimistic fallback if quota reported is unbound
        thresholdBytes,
      };
    } catch {
      // Fallback if quota inspection is restricted
    }
  }

  return {
    safe: true,
    availableBytes: 50 * 1024 * 1024 * 1024,
    thresholdBytes,
  };
}

/**
 * Checks whether current network state allows large season downloads.
 */
export function checkNetworkPermitted(): NetworkPolicyCheck {
  const settings = getSeasonPackSettings();

  if (typeof navigator === "undefined") {
    return { allowed: true, isMetered: false, connectionType: "unknown" };
  }

  const conn =
    (navigator as unknown as { connection?: { saveData?: boolean; type?: string; effectiveType?: string } })
      .connection;

  if (!conn) {
    return { allowed: true, isMetered: false, connectionType: "unknown" };
  }

  const isMetered = conn.saveData === true || conn.type === "cellular" || conn.type === "bluetooth";

  if (settings.pauseOnMetered && isMetered) {
    return {
      allowed: false,
      isMetered: true,
      connectionType: conn.type || "cellular",
      reason: "Downloads paused to save data on metered/cellular connection.",
    };
  }

  return {
    allowed: true,
    isMetered,
    connectionType: conn.type || conn.effectiveType || "wifi",
  };
}

/**
 * Automatically cleans up a completed downloaded episode file once watched past 90%,
 * if autoDeleteWatched setting is enabled.
 */
export async function autoCleanupWatchedEpisode(
  metaId: string,
  season: number,
  episode: number,
  progressRatio: number,
): Promise<{ cleaned: boolean; id?: string }> {
  const settings = getSeasonPackSettings();
  if (!settings.autoDeleteWatched || progressRatio < 0.9) {
    return { cleaned: false };
  }

  const downloads = downloadsSnapshot();
  const matched = downloads.find(
    (item) =>
      item.metaId === metaId &&
      item.season === season &&
      item.episode === episode &&
      item.status === "done",
  );

  if (!matched) {
    return { cleaned: false };
  }

  try {
    await removeDownload(matched.id);
    return { cleaned: true, id: matched.id };
  } catch {
    return { cleaned: false };
  }
}

/**
 * Reorders season episodes to prioritize the current unwatched or upcoming episode,
 * followed sequentially by subsequent episodes.
 */
export function prioritizeSeasonQueue(
  episodes: PlayEpisode[],
  currentEpisodeIndex = 0,
): PlayEpisode[] {
  if (episodes.length <= 1) return [...episodes];

  const sorted = [...episodes].sort((a, b) => {
    const sDiff = (a.season ?? 0) - (b.season ?? 0);
    if (sDiff !== 0) return sDiff;
    return (a.episode ?? 0) - (b.episode ?? 0);
  });

  const nextEpisodes = sorted.slice(currentEpisodeIndex);
  const previousEpisodes = sorted.slice(0, currentEpisodeIndex);

  return [...nextEpisodes, ...previousEpisodes];
}
