/**
 * Dual-Window Streaming-Aware Piece Selection Engine
 *
 * Client-side innovation over standard BitTorrent rarest-first and static sliding-window piece schedulers.
 *
 * Traditional torrent streaming employs a blunt, static sliding window (e.g., fixed 32MB) that:
 * 1. Has zero awareness of player state (1.5x speed drains buffer 50% faster).
 * 2. Has zero awareness of content characteristics (lectures have low steady bitrates; 4K HDR action
 *    films have sudden 3x bitrate bursts).
 * 3. Keeps downloading dead lookahead pieces during scrubbing/seeking, starving new seek targets.
 *
 * This Dual-Window Scheduler splits piece selection into:
 * - High Window (W_high): Urgent immediate buffer (15-30s scaled by speed & bitrate bursts).
 *   Strict sequential ordering, highest peer priority, zero toleration for gaps.
 * - Low Window (W_low): Lookahead & anticipatory buffer (60-180s).
 *   Windowed rarest-first ordering to sustain swarm health without wasting bandwidth on distant scenes.
 * - Seek Halo: Instant window invalidation upon seeking, generating a bidirectional keyframe halo
 *   around the seek target for near-instant (<200ms) resume.
 */

export type ContentProfile = "lecture" | "action_4k" | "standard_drama" | "scrubbing";

export interface PlaybackContext {
  /** Current playback time in seconds */
  currentTimeSec: number;
  /** Total media duration in seconds */
  durationSec: number;
  /** Playback speed (e.g. 1.0, 1.25, 1.5, 2.0) */
  playbackRate: number;
  /** Is playback actively paused */
  isPaused: boolean;
  /** Is the user actively seeking or scrubbing */
  isSeeking: boolean;
  /** Content profile characterizing bit distribution */
  contentProfile: ContentProfile;
  /** Average stream bitrate in bits per second (bps) */
  bitrateBps: number;
  /** Total file length in bytes */
  totalBytes: number;
  /** Size of each piece in bytes (e.g. 1MB, 2MB, 4MB) */
  pieceLength: number;
  /** Total number of pieces in torrent file */
  totalPieces: number;
}

export interface PieceRange {
  startPiece: number;
  endPiece: number;
  pieceCount: number;
}

export interface DualWindowBounds {
  highWindow: PieceRange;
  lowWindow: PieceRange;
  currentPieceIndex: number;
  urgentTargetSeconds: number;
  lookaheadTargetSeconds: number;
  burstMultiplier: number;
  seekHalo?: PieceRange;
}

export interface BufferTelemetry {
  /** Seconds of playback currently buffered ahead of playhead */
  bufferedSeconds: number;
  /** Estimated time in seconds until buffer underrun occurs at current speed */
  timeToUnderrunSec: number;
  /** Risk rating of buffer underrun */
  underrunRisk: "none" | "low" | "moderate" | "critical";
  /** Current effective download throughput required (bytes/sec) */
  requiredThroughputBytesPerSec: number;
}

export interface PiecePriorityItem {
  pieceIndex: number;
  priority: "critical" | "high" | "low" | "idle";
  tier: number; // 0 = urgent seek/playhead, 1 = high window, 2 = low window, 3 = background
  reason: string;
}

export class DualWindowPieceScheduler {
  private context: PlaybackContext;
  private downloadedPieces: Set<number> = new Set();
  private pendingRequests: Set<number> = new Set();
  private lastSeekTargetSec: number | null = null;

  constructor(initialContext?: Partial<PlaybackContext>) {
    this.context = {
      currentTimeSec: initialContext?.currentTimeSec ?? 0,
      durationSec: initialContext?.durationSec ?? 3600,
      playbackRate: Math.max(0.25, initialContext?.playbackRate ?? 1.0),
      isPaused: initialContext?.isPaused ?? false,
      isSeeking: initialContext?.isSeeking ?? false,
      contentProfile: initialContext?.contentProfile ?? "standard_drama",
      bitrateBps: initialContext?.bitrateBps ?? 6_000_000, // 6 Mbps default
      totalBytes: initialContext?.totalBytes ?? 2_700_000_000,
      pieceLength: initialContext?.pieceLength ?? 2 * 1024 * 1024, // 2MB default
      totalPieces: initialContext?.totalPieces ?? 1350,
    };
  }

  public updateContext(updates: Partial<PlaybackContext>): DualWindowBounds {
    const wasSeeking = this.context.isSeeking;
    const prevTime = this.context.currentTimeSec;

    this.context = {
      ...this.context,
      ...updates,
      playbackRate: Math.max(0.25, updates.playbackRate ?? this.context.playbackRate),
    };

    // Detect seek jumps (>3 seconds delta without regular elapsed time or explicit isSeeking)
    if (updates.isSeeking || (updates.currentTimeSec !== undefined && Math.abs(updates.currentTimeSec - prevTime) > 3.0)) {
      this.handleSeekEvent(this.context.currentTimeSec);
    } else if (wasSeeking && !this.context.isSeeking) {
      this.lastSeekTargetSec = null;
    }

    return this.calculateWindows();
  }

  public getContext(): Readonly<PlaybackContext> {
    return this.context;
  }

  public setPieceStatus(pieceIndex: number, isDownloaded: boolean): void {
    if (isDownloaded) {
      this.downloadedPieces.add(pieceIndex);
      this.pendingRequests.delete(pieceIndex);
    } else {
      this.downloadedPieces.delete(pieceIndex);
    }
  }

  public markPiecesBatch(pieces: number[], isDownloaded: boolean): void {
    for (const p of pieces) {
      this.setPieceStatus(p, isDownloaded);
    }
  }

  public getDownloadedPieces(): ReadonlySet<number> {
    return this.downloadedPieces;
  }

  public clear(): void {
    this.downloadedPieces.clear();
    this.pendingRequests.clear();
    this.lastSeekTargetSec = null;
  }

  /**
   * Handle an immediate seek event:
   * Invalidate outstanding lookahead requests that fall outside the new playhead zone.
   */
  public handleSeekEvent(targetTimeSec: number): PieceRange {
    this.lastSeekTargetSec = targetTimeSec;
    const targetPiece = this.timeToPieceIndex(targetTimeSec);

    // Calculate a tight bidirectional Seek Halo: 2 pieces backward (for keyframes/containers) + 8 forward
    const haloStart = Math.max(0, targetPiece - 2);
    const haloEnd = Math.min(this.context.totalPieces - 1, targetPiece + 8);

    const halo: PieceRange = {
      startPiece: haloStart,
      endPiece: haloEnd,
      pieceCount: haloEnd - haloStart + 1,
    };

    // Purge pending requests that do not fall in the new seek halo or immediate high window
    for (const pending of this.pendingRequests) {
      if (pending < haloStart || pending > haloEnd + 20) {
        this.pendingRequests.delete(pending);
      }
    }

    return halo;
  }

  /**
   * Calculate High and Low Window Boundaries dynamically based on playback speed,
   * content profile, and byte rate.
   */
  public calculateWindows(): DualWindowBounds {
    const { currentTimeSec, playbackRate, isSeeking, contentProfile, bitrateBps, pieceLength, totalPieces } = this.context;

    const currentPieceIndex = this.timeToPieceIndex(currentTimeSec);

    // 1. Profile Burst Multiplier & Target Buffers
    let burstMultiplier = 1.0;
    let baseUrgentSec = 20; // 20s base urgent buffer
    let baseLookaheadSec = 80; // 80s base lookahead

    switch (contentProfile) {
      case "lecture":
        // Lecture: highly predictable bitrate, high rate of 1.25x - 1.75x speed.
        // Needs modest burst margin, but expanded lookahead so fast listeners don't stall.
        burstMultiplier = 1.1;
        baseUrgentSec = 15;
        baseLookaheadSec = 120;
        break;
      case "action_4k":
        // 4K Action: massive bitrate fluctuations during battle / high-motion sequences.
        // Needs a large urgent safety margin.
        burstMultiplier = 2.2;
        baseUrgentSec = 30;
        baseLookaheadSec = 90;
        break;
      case "scrubbing":
        // Scrubbing: prioritize immediate responsiveness, collapse lookahead.
        burstMultiplier = 1.0;
        baseUrgentSec = 8;
        baseLookaheadSec = 16;
        break;
      case "standard_drama":
      default:
        burstMultiplier = 1.3;
        baseUrgentSec = 20;
        baseLookaheadSec = 75;
        break;
    }

    // 2. Scale urgent buffer by playback rate
    // If watching at 1.5x, we consume pieces 1.5x faster, so buffer duration must scale up.
    const urgentTargetSeconds = baseUrgentSec * playbackRate;
    const lookaheadTargetSeconds = baseLookaheadSec * playbackRate;

    // 3. Convert target durations to piece counts
    const bytesPerSecond = (bitrateBps / 8) * burstMultiplier;
    const urgentBytes = urgentTargetSeconds * bytesPerSecond;
    const lookaheadBytes = lookaheadTargetSeconds * bytesPerSecond;

    const urgentPieceCount = Math.max(3, Math.ceil(urgentBytes / pieceLength));
    const lookaheadPieceCount = Math.max(5, Math.ceil(lookaheadBytes / pieceLength));

    // High Window boundaries
    const highStart = Math.min(totalPieces - 1, currentPieceIndex);
    const highEnd = Math.min(totalPieces - 1, highStart + urgentPieceCount - 1);

    // Low Window boundaries (continues immediately after High Window)
    const lowStart = Math.min(totalPieces - 1, highEnd + 1);
    const lowEnd = Math.min(totalPieces - 1, lowStart + lookaheadPieceCount - 1);

    const bounds: DualWindowBounds = {
      highWindow: {
        startPiece: highStart,
        endPiece: highEnd,
        pieceCount: Math.max(0, highEnd - highStart + 1),
      },
      lowWindow: {
        startPiece: lowStart,
        endPiece: lowEnd,
        pieceCount: Math.max(0, lowEnd - lowStart + 1),
      },
      currentPieceIndex,
      urgentTargetSeconds,
      lookaheadTargetSeconds,
      burstMultiplier,
    };

    if (isSeeking || this.lastSeekTargetSec !== null) {
      const targetSec = this.lastSeekTargetSec ?? currentTimeSec;
      const targetP = this.timeToPieceIndex(targetSec);
      bounds.seekHalo = {
        startPiece: Math.max(0, targetP - 2),
        endPiece: Math.min(totalPieces - 1, targetP + 8),
        pieceCount: Math.min(totalPieces - 1, targetP + 8) - Math.max(0, targetP - 2) + 1,
      };
    }

    return bounds;
  }

  /**
   * Evaluates the current buffer telemetry and predicts underrun risk.
   */
  public evaluateTelemetry(currentDownloadSpeedBytesPerSec: number): BufferTelemetry {
    const { currentTimeSec, bitrateBps, playbackRate, isPaused, pieceLength, totalPieces } = this.context;
    const currentPiece = this.timeToPieceIndex(currentTimeSec);

    // Count contiguous downloaded pieces starting from currentPiece
    let contiguousPieces = 0;
    for (let p = currentPiece; p < totalPieces; p++) {
      if (this.downloadedPieces.has(p)) {
        contiguousPieces++;
      } else {
        break;
      }
    }

    const contiguousBytes = contiguousPieces * pieceLength;
    const consumptionRateBytesPerSec = (bitrateBps / 8) * playbackRate;
    const bufferedSeconds = consumptionRateBytesPerSec > 0 ? contiguousBytes / consumptionRateBytesPerSec : 0;

    // Required throughput to keep buffer afloat
    const requiredThroughputBytesPerSec = isPaused ? 0 : consumptionRateBytesPerSec;

    // Time to underrun calculation
    let timeToUnderrunSec = Infinity;
    let underrunRisk: BufferTelemetry["underrunRisk"] = "none";

    if (!isPaused && consumptionRateBytesPerSec > 0) {
      const netDrainRate = consumptionRateBytesPerSec - currentDownloadSpeedBytesPerSec;
      if (netDrainRate > 0) {
        // Buffer is actively shrinking
        timeToUnderrunSec = contiguousBytes / netDrainRate;
      } else {
        // Buffer is growing or stable
        timeToUnderrunSec = 9999;
      }

      if (bufferedSeconds < 4.0 || timeToUnderrunSec < 5.0) {
        underrunRisk = "critical";
      } else if (bufferedSeconds < 10.0 || timeToUnderrunSec < 15.0) {
        underrunRisk = "moderate";
      } else if (bufferedSeconds < 20.0) {
        underrunRisk = "low";
      } else {
        underrunRisk = "none";
      }
    }

    return {
      bufferedSeconds: Math.round(bufferedSeconds * 10) / 10,
      timeToUnderrunSec: isFinite(timeToUnderrunSec) ? Math.round(timeToUnderrunSec * 10) / 10 : 9999,
      underrunRisk,
      requiredThroughputBytesPerSec: Math.round(requiredThroughputBytesPerSec),
    };
  }

  /**
   * Generates prioritized list of pieces to request from the torrent swarm.
   * - Critical: Seek halo pieces and active playhead piece
   * - High: High Window missing pieces (in strict sequential order)
   * - Low: Low Window missing pieces (sorted by swarm rarity if provided)
   */
  public getPiecePriorities(pieceRarityMap?: Map<number, number>): PiecePriorityItem[] {
    const bounds = this.calculateWindows();
    const priorities: PiecePriorityItem[] = [];
    const added = new Set<number>();

    // 1. Critical Tier: Seek Halo (if active)
    if (bounds.seekHalo) {
      for (let p = bounds.seekHalo.startPiece; p <= bounds.seekHalo.endPiece; p++) {
        if (!this.downloadedPieces.has(p) && !added.has(p)) {
          priorities.push({
            pieceIndex: p,
            priority: "critical",
            tier: 0,
            reason: "seek_halo_instant_frame",
          });
          added.add(p);
        }
      }
    }

    // 2. Critical Tier: Active playhead piece
    const curr = bounds.currentPieceIndex;
    if (!this.downloadedPieces.has(curr) && !added.has(curr)) {
      priorities.unshift({
        pieceIndex: curr,
        priority: "critical",
        tier: 0,
        reason: "active_playback_deadline",
      });
      added.add(curr);
    }

    // 3. High Tier: High Window pieces (strict sequential order)
    for (let p = bounds.highWindow.startPiece; p <= bounds.highWindow.endPiece; p++) {
      if (!this.downloadedPieces.has(p) && !added.has(p)) {
        priorities.push({
          pieceIndex: p,
          priority: "high",
          tier: 1,
          reason: "urgent_buffer_continuous",
        });
        added.add(p);
      }
    }

    // 4. Low Tier: Low Window pieces (windowed rarest-first)
    const lowCandidates: { pieceIndex: number; rarity: number }[] = [];
    for (let p = bounds.lowWindow.startPiece; p <= bounds.lowWindow.endPiece; p++) {
      if (!this.downloadedPieces.has(p) && !added.has(p)) {
        const rarity = pieceRarityMap?.get(p) ?? 999;
        lowCandidates.push({ pieceIndex: p, rarity });
      }
    }

    // Sort low window by rarity (least available pieces first to protect swarm availability)
    lowCandidates.sort((a, b) => a.rarity - b.rarity);

    for (const item of lowCandidates) {
      priorities.push({
        pieceIndex: item.pieceIndex,
        priority: "low",
        tier: 2,
        reason: `lookahead_rarest_first_${item.rarity}`,
      });
      added.add(item.pieceIndex);
    }

    return priorities;
  }

  /**
   * Converts playback timecode in seconds to piece index.
   */
  public timeToPieceIndex(timeSec: number): number {
    const { durationSec, totalPieces } = this.context;
    if (durationSec <= 0 || totalPieces <= 0) return 0;

    const clampedTime = Math.max(0, Math.min(durationSec, timeSec));
    const fraction = clampedTime / durationSec;
    const pieceIdx = Math.floor(fraction * totalPieces);

    return Math.max(0, Math.min(totalPieces - 1, pieceIdx));
  }

  /**
   * Converts piece index to playback timecode in seconds.
   */
  public pieceIndexToTime(pieceIndex: number): number {
    const { durationSec, totalPieces } = this.context;
    if (totalPieces <= 0 || durationSec <= 0) return 0;

    const clampedPiece = Math.max(0, Math.min(totalPieces - 1, pieceIndex));
    const fraction = clampedPiece / totalPieces;

    return Math.max(0, Math.min(durationSec, fraction * durationSec));
  }
}

// Global singleton for player hooks
let activeScheduler: DualWindowPieceScheduler | null = null;

export function getActiveDualWindowScheduler(): DualWindowPieceScheduler {
  if (!activeScheduler) {
    activeScheduler = new DualWindowPieceScheduler();
  }
  return activeScheduler;
}

export function resetActiveDualWindowScheduler(initialContext?: Partial<PlaybackContext>): DualWindowPieceScheduler {
  activeScheduler = new DualWindowPieceScheduler(initialContext);
  return activeScheduler;
}
