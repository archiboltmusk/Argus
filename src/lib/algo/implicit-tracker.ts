import { trackEvent } from "@/lib/discover/store";
import type { Meta } from "@/lib/cinemeta";

const IMPRESSION_STORAGE_KEY = "argus.algo.impressions.v1";
const DWELL_POSITIVE_THRESHOLD_MS = 1400; // 1.4s dwell = positive signal
const DWELL_SUPER_THRESHOLD_MS = 4000; // 4.0s dwell = high interest
const IDLE_THRESHOLD_MS = 90_000; // 90 seconds idle threshold

type ImpressionRecord = {
  count: number;
  lastSeen: number;
  clicked: boolean;
};

type ImpressionMap = Record<string, ImpressionRecord>;

let impressionsCache: ImpressionMap | null = null;
const activeDwells = new Map<string, { start: number; meta?: Meta }>();
let lastUserInteractionTs = Date.now();

if (typeof window !== "undefined") {
  const markActive = () => {
    lastUserInteractionTs = Date.now();
  };
  window.addEventListener("pointerdown", markActive, { passive: true });
  window.addEventListener("keydown", markActive, { passive: true });
  window.addEventListener("scroll", markActive, { passive: true });
  window.addEventListener("touchstart", markActive, { passive: true });
}

export function isUserActive(): boolean {
  return Date.now() - lastUserInteractionTs < IDLE_THRESHOLD_MS;
}

export function markUserActiveForTest(active = true) {
  lastUserInteractionTs = active ? Date.now() : Date.now() - IDLE_THRESHOLD_MS - 1000;
}

function getImpressions(): ImpressionMap {
  if (impressionsCache) return impressionsCache;
  try {
    const raw = localStorage.getItem(IMPRESSION_STORAGE_KEY);
    impressionsCache = raw ? JSON.parse(raw) : {};
  } catch {
    impressionsCache = {};
  }
  return impressionsCache!;
}

function saveImpressions() {
  if (!impressionsCache) return;
  try {
    // Keep max 300 entries to prevent storage bloat
    const entries = Object.entries(impressionsCache);
    if (entries.length > 300) {
      entries.sort((a, b) => b[1].lastSeen - a[1].lastSeen);
      impressionsCache = Object.fromEntries(entries.slice(0, 300));
    }
    localStorage.setItem(IMPRESSION_STORAGE_KEY, JSON.stringify(impressionsCache));
  } catch (err) {
    // Quota guard: prune aggressively down to 100 entries on constrained devices
    try {
      const entries = Object.entries(impressionsCache);
      entries.sort((a, b) => b[1].lastSeen - a[1].lastSeen);
      impressionsCache = Object.fromEntries(entries.slice(0, 100));
      localStorage.setItem(IMPRESSION_STORAGE_KEY, JSON.stringify(impressionsCache));
    } catch {
      /* ignore if completely exhausted */
    }
  }
}

/**
 * Record an on-screen impression of an item.
 * Loophole protection: only registers if the user was recently active (not an idle screen).
 */
export function recordImpression(metaId: string) {
  if (!metaId) return;
  if (!isUserActive()) return;

  const imps = getImpressions();
  const existing = imps[metaId] ?? { count: 0, lastSeen: 0, clicked: false };
  existing.count += 1;
  existing.lastSeen = Date.now();
  imps[metaId] = existing;
  saveImpressions();
}

/**
 * Record user click/selection on an item (resets impression fatigue).
 */
export function recordItemClick(meta: Meta) {
  if (!meta?.id) return;
  const imps = getImpressions();
  imps[meta.id] = { count: 0, lastSeen: Date.now(), clicked: true };
  saveImpressions();

  // Track explicit open event
  trackEvent(meta.id, "open", {
    cast: [],
    directors: [],
    creators: [],
    genres: meta.genres ?? [],
    keywords: [],
    decade: meta.releaseInfo ? String(Math.floor(parseInt(meta.releaseInfo, 10) / 10) * 10) : undefined,
  });
}

/**
 * Calculate fatigue multiplier for a recommended item.
 * YouTube-style unclicked impression dampening:
 * If shown repeatedly without click, score decreases to allow other titles to surface.
 */
export function getImpressionFatigueDiscount(metaId: string): number {
  const imps = getImpressions();
  const record = imps[metaId];
  if (!record || record.clicked) return 1.0;
  if (record.count <= 1) return 1.0;
  // Dampen score exponentially after 2 unclicked exposures: 0.75^(count - 2)
  const penalty = Math.pow(0.75, Math.min(record.count - 2, 6));
  return Math.max(0.25, penalty);
}

/**
 * Start dwell timer when a user hovers or rests focus on an item.
 */
export function beginDwell(meta: Meta) {
  if (!meta?.id) return;
  activeDwells.set(meta.id, { start: Date.now(), meta });
}

/**
 * End dwell timer. Evaluates duration and converts to implicit behavioral signal.
 */
export function endDwell(metaId: string) {
  const dwell = activeDwells.get(metaId);
  if (!dwell) return;
  activeDwells.delete(metaId);

  const duration = Date.now() - dwell.start;
  if (duration >= DWELL_SUPER_THRESHOLD_MS) {
    // High engagement dwell
    trackImplicitDwell(dwell.meta);
  } else if (duration >= DWELL_POSITIVE_THRESHOLD_MS) {
    // Normal positive dwell
    trackImplicitDwell(dwell.meta);
  }
}

function trackImplicitDwell(meta?: Meta) {
  if (!meta) return;
  trackEvent(meta.id, "dwell", {
    cast: [],
    directors: [],
    creators: [],
    genres: meta.genres ?? [],
    keywords: [],
  });
}

/**
 * TikTok / Instagram style trailer preview completion tracker.
 * Dispatches heavy affinity boost if viewer completes or watches majority of preview clip.
 */
export function recordTrailerProgress(meta: Meta, progressRatio: number) {
  if (!meta?.id || progressRatio <= 0) return;
  if (progressRatio >= 0.5) {
    // High intent signal: completed > 50% of the trailer
    trackEvent(meta.id, "play", {
      cast: [],
      directors: [],
      creators: [],
      genres: meta.genres ?? [],
      keywords: [],
    });
  }
}
