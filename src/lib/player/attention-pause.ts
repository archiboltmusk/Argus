/**
 * Gaze & Attention-Aware Auto-Pause & Smart Rewind Engine
 * Automatically pauses media playback when the user looks away, switches tabs, or minimizes the window.
 * When returning, performs an intelligent contextual rewind (to sentence start or 2-3s back)
 * so the viewer never misses critical dialogue or plot context.
 */

export interface AttentionPauseConfig {
  enabled: boolean;
  rewindSeconds: number;
  snapToSentence: boolean;
  minInactiveSec: number;
  pauseOnTabSwitch: boolean;
  pauseOnWindowBlur: boolean;
  gazeDetectionEnabled: boolean;
}

export const DEFAULT_ATTENTION_CONFIG: AttentionPauseConfig = {
  enabled: true,
  rewindSeconds: 2.5,
  snapToSentence: true,
  minInactiveSec: 1.0,
  pauseOnTabSwitch: true,
  pauseOnWindowBlur: true,
  gazeDetectionEnabled: false,
};

export interface AttentionState {
  hasAttention: boolean;
  isPausedByAttention: boolean;
  pausedTimestampSec: number;
  pausedAtWallClock: number;
}

export interface SubtitleCueTime {
  startSec: number;
  endSec: number;
  text?: string;
}

export class AttentionPauseController {
  private config: AttentionPauseConfig;
  private state: AttentionState = {
    hasAttention: true,
    isPausedByAttention: false,
    pausedTimestampSec: 0,
    pausedAtWallClock: 0,
  };

  private cues: SubtitleCueTime[] = [];
  private onPauseCallback?: (reason: string) => void;
  private onResumeCallback?: (targetSec: number, rewoundAmountSec: number) => void;

  constructor(
    config: Partial<AttentionPauseConfig> = {},
    callbacks?: {
      onPause?: (reason: string) => void;
      onResume?: (targetSec: number, rewoundAmountSec: number) => void;
    }
  ) {
    this.config = { ...DEFAULT_ATTENTION_CONFIG, ...config };
    this.onPauseCallback = callbacks?.onPause;
    this.onResumeCallback = callbacks?.onResume;
  }

  public setConfig(update: Partial<AttentionPauseConfig>) {
    this.config = { ...this.config, ...update };
  }

  public getConfig(): AttentionPauseConfig {
    return { ...this.config };
  }

  public getState(): AttentionState {
    return { ...this.state };
  }

  public setCues(cues: SubtitleCueTime[]) {
    this.cues = [...cues].sort((a, b) => a.startSec - b.startSec);
  }

  /**
   * Calculates the intelligent rewind timestamp based on sentence boundaries or fallback offset.
   */
  public calculateSmartRewind(currentSec: number): { targetSec: number; rewoundSec: number } {
    if (currentSec <= 0) {
      return { targetSec: 0, rewoundSec: 0 };
    }

    const baseRewind = Math.max(0.5, this.config.rewindSeconds);
    let target = Math.max(0, currentSec - baseRewind);

    if (this.config.snapToSentence && this.cues.length > 0) {
      // Find cue active around currentSec or right before it
      const candidateCue = this.cues
        .slice()
        .reverse()
        .find((c) => c.startSec <= currentSec && c.endSec >= currentSec - 3.0);

      if (candidateCue && candidateCue.startSec < currentSec) {
        // Rewind to beginning of cue minus 0.2s pre-roll for natural speech onset
        const cueTarget = Math.max(0, candidateCue.startSec - 0.2);
        // Only snap if within reasonable distance (not more than 5s back)
        if (currentSec - cueTarget <= 5.0) {
          target = cueTarget;
        }
      }
    }

    const rewoundSec = parseFloat((currentSec - target).toFixed(2));
    return { targetSec: target, rewoundSec };
  }

  /**
   * Called when an attention loss event occurs (e.g. window blur, tab hidden, gaze lost).
   * Returns true if a pause was triggered.
   */
  public handleAttentionLoss(currentPlaybackSec: number, isPlaying: boolean, reason: string): boolean {
    if (!this.config.enabled) return false;
    this.state.hasAttention = false;

    if (isPlaying && !this.state.isPausedByAttention) {
      this.state.isPausedByAttention = true;
      this.state.pausedTimestampSec = currentPlaybackSec;
      this.state.pausedAtWallClock = Date.now();

      if (this.onPauseCallback) {
        this.onPauseCallback(reason);
      }
      return true;
    }

    return false;
  }

  /**
   * Called when attention is restored (window focus, tab visible, gaze recovered).
   * Returns calculated rewind information if media should resume with smart rewind.
   */
  public handleAttentionGained(): { shouldResume: boolean; targetSec: number; rewoundSec: number } {
    this.state.hasAttention = true;

    if (!this.config.enabled || !this.state.isPausedByAttention) {
      return { shouldResume: false, targetSec: 0, rewoundSec: 0 };
    }

    const awayDurationMs = Date.now() - this.state.pausedAtWallClock;
    const shouldRewind = awayDurationMs >= this.config.minInactiveSec * 1000;

    let targetSec = this.state.pausedTimestampSec;
    let rewoundSec = 0;

    if (shouldRewind) {
      const calc = this.calculateSmartRewind(this.state.pausedTimestampSec);
      targetSec = calc.targetSec;
      rewoundSec = calc.rewoundSec;
    }

    // Reset auto-pause state
    this.state.isPausedByAttention = false;

    if (this.onResumeCallback) {
      this.onResumeCallback(targetSec, rewoundSec);
    }

    return {
      shouldResume: true,
      targetSec,
      rewoundSec,
    };
  }
}
