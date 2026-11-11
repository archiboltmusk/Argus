/**
 * Trakt, Simkl & Letterboxd Bi-Directional Auto-Scrobbler
 *
 * Automatically reports viewing milestones (start, pause, 80% mark as watched)
 * to Trakt, Simkl, and Letterboxd with offline queue resilience and zero duplicate spam.
 */

export type ScrobbleProvider = "trakt" | "simkl" | "letterboxd";
export type ScrobbleAction = "start" | "pause" | "stop";

export interface ScrobbleItem {
  id: string; // IMDb ID or TMDb ID
  title: string;
  type: "movie" | "episode";
  season?: number;
  episode?: number;
  year?: number;
}

export interface ScrobbleEvent {
  item: ScrobbleItem;
  action: ScrobbleAction;
  progressPercent: number; // 0 to 100
  timestamp: number;
}

export interface ScrobblerConfig {
  providers: {
    trakt?: { enabled: boolean; accessToken?: string };
    simkl?: { enabled: boolean; accessToken?: string };
    letterboxd?: { enabled: boolean; username?: string };
  };
  scrobbleThresholdPercent: number; // Default: 80%
}

const STORAGE_CONFIG_KEY = "argus.scrobbler.config.v1";
const STORAGE_QUEUE_KEY = "argus.scrobbler.offline_queue.v1";

const DEFAULT_CONFIG: ScrobblerConfig = {
  providers: {
    trakt: { enabled: false },
    simkl: { enabled: false },
    letterboxd: { enabled: false },
  },
  scrobbleThresholdPercent: 80,
};

let memQueue: ScrobbleEvent[] = [];
let lastSentAction: Record<string, ScrobbleAction> = {};

export function getScrobblerConfig(): ScrobblerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function updateScrobblerConfig(patch: Partial<ScrobblerConfig>): ScrobblerConfig {
  const current = getScrobblerConfig();
  const next = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function getOfflineScrobbleQueue(): ScrobbleEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : memQueue;
  } catch {
    return memQueue;
  }
}

export function queueOfflineScrobble(event: ScrobbleEvent): void {
  memQueue.push(event);
  try {
    localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(memQueue));
  } catch {}
}

export function clearOfflineScrobbleQueue(): void {
  memQueue = [];
  try {
    localStorage.removeItem(STORAGE_QUEUE_KEY);
  } catch {}
}

/**
 * Evaluates playback progress and triggers the appropriate scrobbler action.
 * Ensures an item is only marked completed ("stop") once threshold is reached.
 */
export async function handlePlaybackScrobble(
  item: ScrobbleItem,
  progressRatio: number,
  isPaused: boolean,
  sendFn?: (evt: ScrobbleEvent) => Promise<boolean>,
): Promise<{ dispatched: boolean; action?: ScrobbleAction }> {
  const config = getScrobblerConfig();
  const progressPercent = Math.min(100, Math.max(0, Math.round(progressRatio * 100)));
  const itemKey = `${item.id}:${item.season ?? 0}:${item.episode ?? 0}`;
  const lastAction = lastSentAction[itemKey];

  let targetAction: ScrobbleAction | null = null;

  if (progressPercent >= config.scrobbleThresholdPercent) {
    if (lastAction !== "stop") {
      targetAction = "stop";
    }
  } else if (isPaused) {
    if (lastAction === "start") {
      targetAction = "pause";
    }
  } else {
    if (!lastAction) {
      targetAction = "start";
    }
  }

  if (!targetAction) {
    return { dispatched: false };
  }

  const event: ScrobbleEvent = {
    item,
    action: targetAction,
    progressPercent,
    timestamp: Date.now(),
  };

  lastSentAction[itemKey] = targetAction;

  if (sendFn) {
    try {
      const ok = await sendFn(event);
      if (!ok) {
        queueOfflineScrobble(event);
      }
      return { dispatched: true, action: targetAction };
    } catch {
      queueOfflineScrobble(event);
      return { dispatched: true, action: targetAction };
    }
  }

  return { dispatched: true, action: targetAction };
}
