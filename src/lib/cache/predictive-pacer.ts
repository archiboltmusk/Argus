/**
 * Predictive Pacing & Psychic Pre-Buffering Engine for Argus
 *
 * Tracks user engagement velocity across media types:
 * - Books: Words-per-minute (WPM) & chapter completion ETA
 * - Manga: Seconds-per-page & chapter progress
 * - Video: Playback progress & episode remaining time
 * Automatically triggers pre-fetching, stream warming, and swarm pinning.
 */

export interface PacingState {
  mediaId: string;
  mediaType: "book" | "manga" | "video" | "audiobook";
  totalUnits: number; // total words, pages, or seconds
  currentUnit: number;
  velocityUnitsPerSec: number;
  lastUpdatedTimestamp: number;
}

export interface PrefetchDecision {
  shouldPrefetchNext: boolean;
  estimatedRemainingSec: number;
  recommendedTargetId?: string;
  urgency: "low" | "medium" | "critical" | "none";
  reason: string;
}

export class PredictivePacer {
  private static instance: PredictivePacer;
  private states: Map<string, PacingState> = new Map();

  public static getInstance(): PredictivePacer {
    if (!PredictivePacer.instance) {
      PredictivePacer.instance = new PredictivePacer();
    }
    return PredictivePacer.instance;
  }

  /**
   * Record progress and compute velocity
   */
  public trackProgress(
    mediaId: string,
    mediaType: PacingState["mediaType"],
    currentUnit: number,
    totalUnits: number,
  ): void {
    const now = Date.now();
    const existing = this.states.get(mediaId);

    let velocity = 1.0;
    if (existing && existing.currentUnit < currentUnit) {
      const elapsedSec = Math.max(1, (now - existing.lastUpdatedTimestamp) / 1000);
      const unitsDelta = currentUnit - existing.currentUnit;
      velocity = unitsDelta / elapsedSec;
    }

    this.states.set(mediaId, {
      mediaId,
      mediaType,
      currentUnit,
      totalUnits,
      velocityUnitsPerSec: velocity,
      lastUpdatedTimestamp: now,
    });
  }

  /**
   * Determine whether the next item (chapter, episode) should be pre-fetched
   */
  public evaluatePrefetch(mediaId: string, nextMediaId?: string): PrefetchDecision {
    const state = this.states.get(mediaId);
    if (!state || state.totalUnits <= 0) {
      return {
        shouldPrefetchNext: false,
        estimatedRemainingSec: 0,
        urgency: "none",
        reason: "No active pacing telemetry.",
      };
    }

    const remainingUnits = Math.max(0, state.totalUnits - state.currentUnit);
    const progressRatio = state.currentUnit / state.totalUnits;
    const velocity = Math.max(0.1, state.velocityUnitsPerSec);
    const estimatedRemainingSec = remainingUnits / velocity;

    // Thresholds:
    // Video: remaining < 300s (5 min) or progress > 80%
    // Manga/Book: progress > 70% or remaining < 120s
    let shouldPrefetch = false;
    let urgency: PrefetchDecision["urgency"] = "none";

    if (state.mediaType === "video") {
      if (estimatedRemainingSec <= 120 || progressRatio >= 0.9) {
        shouldPrefetch = true;
        urgency = "critical";
      } else if (estimatedRemainingSec <= 360 || progressRatio >= 0.75) {
        shouldPrefetch = true;
        urgency = "medium";
      }
    } else {
      // Books and manga
      if (progressRatio >= 0.85 || estimatedRemainingSec <= 60) {
        shouldPrefetch = true;
        urgency = "critical";
      } else if (progressRatio >= 0.65 || estimatedRemainingSec <= 180) {
        shouldPrefetch = true;
        urgency = "medium";
      }
    }

    return {
      shouldPrefetchNext: shouldPrefetch,
      estimatedRemainingSec: Math.round(estimatedRemainingSec),
      recommendedTargetId: nextMediaId,
      urgency,
      reason: shouldPrefetch
        ? `Progress at ${(progressRatio * 100).toFixed(1)}% (${Math.round(estimatedRemainingSec)}s left). Pre-warming next item.`
        : `Sufficient buffer remaining (${Math.round(estimatedRemainingSec)}s).`,
    };
  }
}
