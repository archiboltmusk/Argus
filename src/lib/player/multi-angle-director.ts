/**
 * Multi-Angle & Sports Director Cut Engine
 *
 * Coordinates multiple synchronized camera feeds/angles (e.g. F1 onboard,
 * pit lane, stadium drone, esports player POV) with master clock drift alignment,
 * picture-in-picture quad-matrix layouts, and zero-glitch primary angle switching.
 */

export interface CameraAngleStream {
  id: string;
  label: string; // e.g. "Onboard Car #1", "Pit Lane", "Main Broadcast", "Helicopter"
  streamUrl: string;
  bitrateKbps?: number;
  resolution?: string; // e.g. "1080p60", "4K HDR"
  hasAudio: boolean;
  isPrimary: boolean;
  currentClockSec: number;
}

export type DirectorLayoutMode =
  | "single-focus"
  | "picture-in-picture"
  | "quad-matrix"
  | "director-strip";

export interface AngleSyncAdjustment {
  angleId: string;
  driftSec: number; // positive = slave is ahead, negative = slave is behind
  action: "in-sync" | "rate-accelerate" | "rate-decelerate" | "hard-seek";
  targetSpeed: number; // e.g. 1.0, 1.03, 0.97
}

export interface MultiCamBookmark {
  id: string;
  timestampSec: number;
  recommendedAngleId: string;
  title: string;
  description?: string;
}

export interface DirectorEngineConfig {
  layoutMode: DirectorLayoutMode;
  audioFollowsVideo: boolean; // if false, keeps main broadcast audio while switching video
  syncThresholdMs: number; // default 15ms
  hardSeekThresholdMs: number; // default 180ms
  pipSecondaryAngleId?: string;
  angles: CameraAngleStream[];
  bookmarks: MultiCamBookmark[];
}

const DEFAULT_CONFIG: DirectorEngineConfig = {
  layoutMode: "single-focus",
  audioFollowsVideo: false,
  syncThresholdMs: 15,
  hardSeekThresholdMs: 180,
  angles: [],
  bookmarks: [],
};

export class MultiAngleDirector {
  private static instance: MultiAngleDirector | null = null;
  private config: DirectorEngineConfig;
  private masterClockSec = 0;

  public constructor(initialConfig?: Partial<DirectorEngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
  }

  public static getInstance(): MultiAngleDirector {
    if (!MultiAngleDirector.instance) {
      MultiAngleDirector.instance = new MultiAngleDirector();
    }
    return MultiAngleDirector.instance;
  }

  public getConfig(): DirectorEngineConfig {
    return { ...this.config };
  }

  public updateConfig(patch: Partial<DirectorEngineConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  public registerAngle(angle: CameraAngleStream): void {
    const isFirst = this.config.angles.length === 0;
    const stream = { ...angle, isPrimary: angle.isPrimary || isFirst };
    this.config.angles = [...this.config.angles.filter((a) => a.id !== stream.id), stream];
  }

  public unregisterAngle(angleId: string): void {
    this.config.angles = this.config.angles.filter((a) => a.id !== angleId);
    if (!this.config.angles.some((a) => a.isPrimary) && this.config.angles.length > 0) {
      this.config.angles[0].isPrimary = true;
    }
  }

  public getPrimaryAngle(): CameraAngleStream | null {
    return this.config.angles.find((a) => a.isPrimary) || this.config.angles[0] || null;
  }

  public setMasterClock(timeSec: number): void {
    this.masterClockSec = Math.max(0, timeSec);
    const primary = this.getPrimaryAngle();
    if (primary) {
      primary.currentClockSec = this.masterClockSec;
    }
  }

  public getMasterClock(): number {
    return this.masterClockSec;
  }

  /**
   * Promotes an angle to the primary visual stream without restarting playback
   */
  public switchToAngle(angleId: string): {
    success: boolean;
    swappedAngle: CameraAngleStream | null;
    previousAngle: CameraAngleStream | null;
  } {
    const target = this.config.angles.find((a) => a.id === angleId);
    if (!target) {
      return { success: false, swappedAngle: null, previousAngle: null };
    }

    let prev: CameraAngleStream | null = null;
    this.config.angles = this.config.angles.map((a) => {
      if (a.isPrimary) {
        prev = { ...a, isPrimary: false };
        return prev;
      }
      if (a.id === angleId) {
        return { ...a, isPrimary: true, currentClockSec: this.masterClockSec };
      }
      return a;
    });

    return {
      success: true,
      swappedAngle: this.getPrimaryAngle(),
      previousAngle: prev,
    };
  }

  /**
   * Evaluates clock drift between master clock and slave angle stream.
   * Emits micro-speed corrections to eliminate lip-sync drift smoothly without audio ticks.
   */
  public evaluateSyncDrift(angleId: string, currentAngleSec: number): AngleSyncAdjustment {
    const driftSec = currentAngleSec - this.masterClockSec;
    const driftAbsMs = Math.abs(driftSec) * 1000;

    if (driftAbsMs <= this.config.syncThresholdMs) {
      return {
        angleId,
        driftSec,
        action: "in-sync",
        targetSpeed: 1.0,
      };
    }

    if (driftAbsMs > this.config.hardSeekThresholdMs) {
      return {
        angleId,
        driftSec,
        action: "hard-seek",
        targetSpeed: 1.0,
      };
    }

    if (driftSec > 0) {
      // Angle is ahead -> slow down slightly to let master catch up
      return {
        angleId,
        driftSec,
        action: "rate-decelerate",
        targetSpeed: 0.97,
      };
    } else {
      // Angle is behind -> speed up slightly
      return {
        angleId,
        driftSec,
        action: "rate-accelerate",
        targetSpeed: 1.03,
      };
    }
  }

  public addBookmark(bookmark: Omit<MultiCamBookmark, "id">): MultiCamBookmark {
    const bm: MultiCamBookmark = {
      ...bookmark,
      id: `mcb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    this.config.bookmarks.push(bm);
    return bm;
  }

  public getBookmarks(): MultiCamBookmark[] {
    return [...this.config.bookmarks];
  }

  public setLayoutMode(mode: DirectorLayoutMode): void {
    this.config.layoutMode = mode;
  }
}
