import type { SubCue } from "./parser";

export interface ReadingSpeedOptions {
  /** Maximum reading speed in words per minute (default: 200 WPM) */
  maxWordsPerMinute?: number;
  /** Minimum on-screen display duration in seconds (default: 1.6s) */
  minDurationSec?: number;
  /** Minimum gap between adjacent cues in seconds (default: 0.1s) */
  breathGapSec?: number;
}

/**
 * Smart Reading Speed Regulator
 *
 * Automatically pads cues with rapid speech or dense text so sentences remain
 * comfortably readable on screen without vanishing prematurely or causing cognitive fatigue.
 */
export function regulateReadingSpeed(
  cues: SubCue[],
  options: ReadingSpeedOptions = {},
): SubCue[] {
  if (!cues || cues.length === 0) return [];

  const maxWpm = options.maxWordsPerMinute ?? 200;
  const minDur = options.minDurationSec ?? 1.6;
  const gap = options.breathGapSec ?? 0.1;

  const regulated: SubCue[] = [];

  for (let i = 0; i < cues.length; i++) {
    const cue = { ...cues[i] };
    const text = cue.text.trim();
    if (!text) continue;

    const words = text.split(/\s+/).filter(Boolean).length;
    // Estimated minimum duration needed to comfortably read this cue:
    // (words / maxWpm) * 60 seconds
    const readingNeededSec = Math.max(minDur, (words / maxWpm) * 60);

    const currentDuration = cue.end - cue.start;

    if (currentDuration < readingNeededSec) {
      const nextCue = cues[i + 1];
      const maxPossibleEnd = nextCue ? nextCue.start - gap : cue.start + readingNeededSec;

      // Extend duration smoothly without colliding into the next speaker's onset
      cue.end = Math.min(cue.start + readingNeededSec, Math.max(cue.end, maxPossibleEnd));
    }

    regulated.push(cue);
  }

  return regulated;
}
