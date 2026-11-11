/**
 * Synchronized Danmaku (Floating Bullet Comments) & Reaction Heatmap Engine
 *
 * Implements Niconico / Bilibili style timestamp-synchronized floating comments
 * gliding across the cinema canvas, with automated lane-collision avoidance
 * and seekbar reaction density heatmap generation.
 */

export interface DanmakuComment {
  id: string;
  timeSec: number;
  text: string;
  colorHex: string;
  mode: "scroll" | "top" | "bottom";
  fontSizePx: number;
  author?: string;
}

export interface ActiveBulletLane {
  comment: DanmakuComment;
  laneIndex: number;
  progressFraction: number; // 0.0 (entering right) to 1.0 (leaving left)
}

export interface DanmakuConfig {
  displayMode: "dense" | "top-banner" | "off";
  opacity: number; // 0.2 to 1.0
  fontScale: number; // 0.8 to 1.5
  durationSec: number; // Scrolling speed (seconds on screen, e.g. 6s)
  maxConcurrentLanes: number; // e.g. 10
}

const STORAGE_KEY = "argus.danmaku.config.v1";

const DEFAULT_CONFIG: DanmakuConfig = {
  displayMode: "dense",
  opacity: 0.85,
  fontScale: 1.0,
  durationSec: 6.0,
  maxConcurrentLanes: 10,
};

let configCache: DanmakuConfig | null = null;
const listeners = new Set<(cfg: DanmakuConfig) => void>();

export function getDanmakuConfig(): DanmakuConfig {
  if (configCache) return configCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    configCache = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    configCache = { ...DEFAULT_CONFIG };
  }
  return configCache ?? DEFAULT_CONFIG;
}

export function updateDanmakuConfig(
  patch: Partial<DanmakuConfig>,
): DanmakuConfig {
  const current = getDanmakuConfig();
  configCache = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configCache));
  } catch {}
  notifyListeners();
  return configCache;
}

export function subscribeDanmaku(
  fn: (cfg: DanmakuConfig) => void,
): () => void {
  listeners.add(fn);
  fn(getDanmakuConfig());
  return () => {
    listeners.delete(fn);
  };
}

function notifyListeners(): void {
  const cfg = getDanmakuConfig();
  for (const fn of listeners) {
    try {
      fn(cfg);
    } catch {}
  }
}

/**
 * Calculates timeline reaction density heatmap for player seekbar.
 * Partitions total duration into buckets and returns normalized intensity values (0.0 to 1.0).
 */
export function generateReactionHeatmap(
  comments: DanmakuComment[],
  totalDurationSec: number,
  bucketCount: number = 100,
): number[] {
  if (totalDurationSec <= 0 || bucketCount <= 0) {
    return new Array(bucketCount).fill(0);
  }

  const buckets = new Array<number>(bucketCount).fill(0);
  const bucketDuration = totalDurationSec / bucketCount;

  for (const comment of comments) {
    const idx = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor(comment.timeSec / bucketDuration)),
    );
    buckets[idx]++;
  }

  const maxVal = Math.max(...buckets, 1);
  return buckets.map((count) => Math.round((count / maxVal) * 100) / 100);
}

/**
 * Danmaku Coordinator: manages active on-screen bullets and collision-free lane assignment.
 */
export class DanmakuCoordinator {
  private comments: DanmakuComment[] = [];
  private laneEndTimes: number[] = [];

  constructor(maxLanes: number = 10) {
    this.laneEndTimes = new Array(maxLanes).fill(0);
  }

  public loadComments(comments: DanmakuComment[]): void {
    this.comments = [...comments].sort((a, b) => a.timeSec - b.timeSec);
  }

  public addComment(comment: DanmakuComment): void {
    this.comments.push(comment);
    this.comments.sort((a, b) => a.timeSec - b.timeSec);
  }

  public getComments(): DanmakuComment[] {
    return this.comments;
  }

  /**
   * Retrieves comments active within the visible window [currentSec, currentSec + durationSec].
   * Assigns collision-free vertical lanes.
   */
  public getActiveBullets(
    currentSec: number,
    config: DanmakuConfig = getDanmakuConfig(),
  ): ActiveBulletLane[] {
    if (config.displayMode === "off") return [];

    const duration = config.durationSec;
    const maxLanes = config.displayMode === "top-banner" ? 3 : config.maxConcurrentLanes;
    const bullets: ActiveBulletLane[] = [];

    // Reset lane availability tracking for current time frame
    const laneOccupancy = new Array<number>(maxLanes).fill(-1);

    for (const c of this.comments) {
      const elapsed = currentSec - c.timeSec;
      if (elapsed >= 0 && elapsed <= duration) {
        const progressFraction = elapsed / duration;

        // Assign to first available lane
        let assignedLane = 0;
        let lowestEndTime = Infinity;

        for (let l = 0; l < maxLanes; l++) {
          if (laneOccupancy[l] < 0) {
            assignedLane = l;
            lowestEndTime = -1;
            break;
          }
          if (laneOccupancy[l] < lowestEndTime) {
            lowestEndTime = laneOccupancy[l];
            assignedLane = l;
          }
        }

        laneOccupancy[assignedLane] = c.timeSec + duration;
        bullets.push({
          comment: c,
          laneIndex: assignedLane,
          progressFraction: Math.round(progressFraction * 1000) / 1000,
        });
      }
    }

    return bullets;
  }

  public clear(): void {
    this.comments = [];
    this.laneEndTimes.fill(0);
  }
}
