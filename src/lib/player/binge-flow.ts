/**
 * Instant "Binge Flow" Next-Episode Pre-Cache & Seamless Crossfade Engine
 *
 * Monitors playback progress of the current TV episode. When playback crosses
 * the 80% mark, silently pre-warms the next episode stream candidate (Range preburst,
 * debrid un-restriction, container headers) and prepares an instant, zero-buffer handoff.
 */

import { preburstStreamHeader } from "@/lib/streams/stream-header-preburst";
import type { PlayEpisode } from "@/lib/view";
import type { Meta } from "@/lib/cinemeta";

export interface BingeNextEpisodeCandidate {
  meta: Meta;
  currentEpisode: PlayEpisode;
  nextEpisode: PlayEpisode;
  nextStreamUrl?: string;
  isPreheated: boolean;
  preheatTimestamp?: number;
}

export interface BingeFlowConfig {
  enabled: boolean;
  triggerThresholdRatio: number; // e.g. 0.80 (80% watched)
  countdownSeconds: number; // e.g. 10s auto-play countdown at episode end
  autoPlayNext: boolean;
}

const STORAGE_KEY = "argus.binge_flow.config.v1";

const DEFAULT_CONFIG: BingeFlowConfig = {
  enabled: true,
  triggerThresholdRatio: 0.8,
  countdownSeconds: 8,
  autoPlayNext: true,
};

let configCache: BingeFlowConfig | null = null;
let activeCandidate: BingeNextEpisodeCandidate | null = null;
let preheatPromise: Promise<boolean> | null = null;

const listeners = new Set<(candidate: BingeNextEpisodeCandidate | null) => void>();

export function getBingeFlowConfig(): BingeFlowConfig {
  if (configCache) return configCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    configCache = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    configCache = { ...DEFAULT_CONFIG };
  }
  return configCache ?? DEFAULT_CONFIG;
}

export function updateBingeFlowConfig(patch: Partial<BingeFlowConfig>): BingeFlowConfig {
  const current = getBingeFlowConfig();
  configCache = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configCache));
  } catch {}
  return configCache;
}

/**
 * Finds the consecutive next episode from a season roster or episode list.
 */
export function findNextConsecutiveEpisode(
  current: PlayEpisode,
  allEpisodes: PlayEpisode[] = [],
): PlayEpisode | null {
  if (!allEpisodes || allEpisodes.length === 0) return null;

  const currentSeason = current.season ?? 1;
  const currentEp = current.episode ?? 1;

  // 1. Same season, next episode index
  const nextSameSeason = allEpisodes.find(
    (ep) => (ep.season ?? 1) === currentSeason && (ep.episode ?? 1) === currentEp + 1,
  );
  if (nextSameSeason) return nextSameSeason;

  // 2. Next season, episode 1
  const firstNextSeason = allEpisodes.find(
    (ep) => (ep.season ?? 1) === currentSeason + 1 && (ep.episode ?? 1) === 1,
  );
  if (firstNextSeason) return firstNextSeason;

  return null;
}

/**
 * Evaluates current playback progress and triggers next-episode preheating once threshold is met.
 */
export async function evaluateBingeProgress(params: {
  meta: Meta;
  currentEpisode: PlayEpisode;
  allEpisodes: PlayEpisode[];
  currentTimeSec: number;
  durationSec: number;
  resolveNextStreamUrl?: (nextEp: PlayEpisode) => Promise<string | null>;
}): Promise<{ shouldTriggerNext: boolean; candidate: BingeNextEpisodeCandidate | null }> {
  const config = getBingeFlowConfig();
  if (!config.enabled || params.durationSec <= 0) {
    return { shouldTriggerNext: false, candidate: null };
  }

  const ratio = params.currentTimeSec / params.durationSec;
  if (ratio < config.triggerThresholdRatio) {
    return { shouldTriggerNext: false, candidate: activeCandidate };
  }

  // Find next episode
  const nextEp = findNextConsecutiveEpisode(params.currentEpisode, params.allEpisodes);
  if (!nextEp) {
    return { shouldTriggerNext: false, candidate: null };
  }

  // Check if already preheating or preheated for this exact next episode
  if (
    activeCandidate &&
    activeCandidate.nextEpisode.season === nextEp.season &&
    activeCandidate.nextEpisode.episode === nextEp.episode &&
    activeCandidate.isPreheated
  ) {
    return { shouldTriggerNext: true, candidate: activeCandidate };
  }

  if (!preheatPromise) {
    activeCandidate = {
      meta: params.meta,
      currentEpisode: params.currentEpisode,
      nextEpisode: nextEp,
      isPreheated: false,
    };
    notifyListeners();

    preheatPromise = (async () => {
      try {
        let streamUrl: string | null = null;
        if (params.resolveNextStreamUrl) {
          streamUrl = await params.resolveNextStreamUrl(nextEp);
        }
        if (streamUrl) {
          await preburstStreamHeader(streamUrl);
        }
        if (activeCandidate) {
          activeCandidate.nextStreamUrl = streamUrl ?? undefined;
          activeCandidate.isPreheated = true;
          activeCandidate.preheatTimestamp = Date.now();
          notifyListeners();
        }
        return true;
      } catch {
        return false;
      } finally {
        preheatPromise = null;
      }
    })();
  }

  return { shouldTriggerNext: true, candidate: activeCandidate };
}

export function resetBingeFlow(): void {
  activeCandidate = null;
  preheatPromise = null;
  notifyListeners();
}

export function subscribeBingeFlow(
  fn: (candidate: BingeNextEpisodeCandidate | null) => void,
): () => void {
  listeners.add(fn);
  fn(activeCandidate);
  return () => {
    listeners.delete(fn);
  };
}

function notifyListeners(): void {
  for (const fn of listeners) {
    try {
      fn(activeCandidate);
    } catch {}
  }
}
