import type { SubCue } from "./parser";

export type SubtitleHealthStatus =
  | "healthy"
  | "truncated" // Cues end well before video end
  | "delayed-start" // Cues start abnormally late
  | "large-gaps" // Long conversational dead zones detected
  | "sparse" // Too few cues for the media duration
  | "empty";

export type SubtitleGap = {
  startSec: number;
  endSec: number;
  durationSec: number;
  gapType: "trailing-truncation" | "leading-missing" | "interior-deadzone";
};

export type SubtitleHealthReport = {
  status: SubtitleHealthStatus;
  mediaDurationSec: number;
  totalCues: number;
  firstCueStartSec: number;
  lastCueEndSec: number;
  coverageRatio: number; // e.g. 0.45 = 45% of movie covered
  gaps: SubtitleGap[];
  needsInfill: boolean;
  recommendedInfillSpan: { startSec: number; endSec: number } | null;
};

/**
 * Analyzes parsed cues against the total media duration.
 * Detects whether a subtitle abruptly stops, has massive missing chunks,
 * or is healthy and complete.
 */
export function analyzeSubtitleHealth(
  cues: readonly SubCue[],
  mediaDurationSec: number,
  options: {
    minMediaDurationSec?: number;
    maxInteriorSilenceSec?: number;
    truncationThresholdRatio?: number;
  } = {},
): SubtitleHealthReport {
  const minMediaDuration = options.minMediaDurationSec ?? 60; // Ignore tiny clips < 1min
  const maxInteriorSilence = options.maxInteriorSilenceSec ?? 420; // 7 minutes without a single cue
  const truncationThreshold = options.truncationThresholdRatio ?? 0.82; // If ends before 82% of movie

  if (!cues || cues.length === 0) {
    return {
      status: "empty",
      mediaDurationSec,
      totalCues: 0,
      firstCueStartSec: 0,
      lastCueEndSec: 0,
      coverageRatio: 0,
      gaps: mediaDurationSec > 0 ? [{ startSec: 0, endSec: mediaDurationSec, durationSec: mediaDurationSec, gapType: "trailing-truncation" }] : [],
      needsInfill: mediaDurationSec >= minMediaDuration,
      recommendedInfillSpan: mediaDurationSec >= minMediaDuration ? { startSec: 0, endSec: mediaDurationSec } : null,
    };
  }

  const sortedCues = [...cues].sort((a, b) => a.start - b.start);
  const firstCueStart = sortedCues[0].start;
  const lastCueEnd = sortedCues[sortedCues.length - 1].end;

  const effectiveDuration = Math.max(mediaDurationSec, lastCueEnd);
  const coverageRatio = effectiveDuration > 0 ? lastCueEnd / effectiveDuration : 1;

  const gaps: SubtitleGap[] = [];

  // 1. Check Trailing Truncation (Subtitles stop 45 mins into a 2hr film)
  if (effectiveDuration >= minMediaDuration && coverageRatio < truncationThreshold) {
    gaps.push({
      startSec: Math.max(0, lastCueEnd),
      endSec: effectiveDuration,
      durationSec: effectiveDuration - lastCueEnd,
      gapType: "trailing-truncation",
    });
  }

  // 2. Check Leading Gap (First dialogue starts > 15 minutes in)
  if (firstCueStart > 900 && effectiveDuration >= minMediaDuration) {
    gaps.push({
      startSec: 0,
      endSec: firstCueStart,
      durationSec: firstCueStart,
      gapType: "leading-missing",
    });
  }

  // 3. Check Interior Abnormal Deadzones (Gap between consecutive cues > 7 min)
  for (let i = 0; i < sortedCues.length - 1; i++) {
    const currentEnd = sortedCues[i].end;
    const nextStart = sortedCues[i + 1].start;
    const gap = nextStart - currentEnd;
    if (gap > maxInteriorSilence) {
      gaps.push({
        startSec: currentEnd,
        endSec: nextStart,
        durationSec: gap,
        gapType: "interior-deadzone",
      });
    }
  }

  // Determine overall status
  let status: SubtitleHealthStatus = "healthy";
  if (coverageRatio < truncationThreshold && effectiveDuration >= minMediaDuration) {
    status = "truncated";
  } else if (gaps.some((g) => g.gapType === "leading-missing")) {
    status = "delayed-start";
  } else if (gaps.some((g) => g.gapType === "interior-deadzone")) {
    status = "large-gaps";
  } else if (sortedCues.length < 15 && effectiveDuration > 1200) {
    status = "sparse";
  }

  const needsInfill = status === "truncated" || status === "large-gaps" || status === "sparse";

  // Recommend the primary gap to infill first (usually trailing truncation)
  let recommendedInfillSpan: { startSec: number; endSec: number } | null = null;
  const trailingGap = gaps.find((g) => g.gapType === "trailing-truncation");
  if (trailingGap) {
    recommendedInfillSpan = { startSec: trailingGap.startSec, endSec: trailingGap.endSec };
  } else if (gaps.length > 0) {
    recommendedInfillSpan = { startSec: gaps[0].startSec, endSec: gaps[0].endSec };
  }

  return {
    status,
    mediaDurationSec: effectiveDuration,
    totalCues: sortedCues.length,
    firstCueStartSec: firstCueStart,
    lastCueEndSec: lastCueEnd,
    coverageRatio: Math.round(coverageRatio * 100) / 100,
    gaps,
    needsInfill,
    recommendedInfillSpan,
  };
}
