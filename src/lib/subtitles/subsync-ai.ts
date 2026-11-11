/**
 * SubSync AI (Speech-to-Subtitle Auto-Alignment & Drift Correction)
 *
 * Correlates audio Voice Activity Detection (VAD) speech bursts against
 * subtitle cue start times to automatically eliminate timing offsets (±5s)
 * and framerate stretch drift (23.976fps vs 25fps) without manual adjustment.
 */

import type { SubCue } from "./parser";

export interface SubSyncResult {
  offsetSec: number;
  stretchFactor: number;
  confidence: number; // 0.0 to 1.0
  isAligned: boolean;
}

/**
 * Calculates the optimal timing delay offset between detected speech timestamps
 * and subtitle cue start timestamps using cross-correlation histogram binning.
 */
export function calculateSubSyncOffset(
  speechOnsetsSec: number[],
  cueOnsetsSec: number[],
  maxOffsetSec = 5.0,
  binWidthSec = 0.05, // 50ms resolution bins
): SubSyncResult {
  if (speechOnsetsSec.length === 0 || cueOnsetsSec.length === 0) {
    return { offsetSec: 0, stretchFactor: 1.0, confidence: 0, isAligned: false };
  }

  const numBins = Math.ceil((2 * maxOffsetSec) / binWidthSec) + 1;
  const bins = new Int32Array(numBins);

  // Compute offset pairs between all nearby speech and cue timestamps
  for (const s of speechOnsetsSec) {
    for (const c of cueOnsetsSec) {
      const diff = s - c;
      if (Math.abs(diff) <= maxOffsetSec) {
        const binIdx = Math.round((diff + maxOffsetSec) / binWidthSec);
        if (binIdx >= 0 && binIdx < numBins) {
          bins[binIdx]++;
        }
      }
    }
  }

  // Find peak bin in the histogram
  let maxCount = 0;
  let bestBinIdx = -1;
  let totalHits = 0;

  for (let i = 0; i < numBins; i++) {
    totalHits += bins[i];
    if (bins[i] > maxCount) {
      maxCount = bins[i];
      bestBinIdx = i;
    }
  }

  if (bestBinIdx === -1 || maxCount === 0) {
    return { offsetSec: 0, stretchFactor: 1.0, confidence: 0, isAligned: false };
  }

  const bestOffsetSec = (bestBinIdx * binWidthSec) - maxOffsetSec;
  // Confidence is the prominence of the peak over background noise
  const confidence = Math.min(1.0, Math.max(0.0, (maxCount * 8) / Math.max(1, totalHits)));

  // Detect common framerate stretch ratios (e.g. 25fps PAL to 23.976fps NTSC = 1.0427)
  let stretchFactor = 1.0;
  if (cueOnsetsSec.length >= 10 && speechOnsetsSec.length >= 10) {
    const cueDuration = cueOnsetsSec[cueOnsetsSec.length - 1] - cueOnsetsSec[0];
    const speechDuration = speechOnsetsSec[speechOnsetsSec.length - 1] - speechOnsetsSec[0];
    if (cueDuration > 60 && speechDuration > 60) {
      const ratio = speechDuration / cueDuration;
      if (Math.abs(ratio - 25.0 / 23.976) < 0.01) stretchFactor = 25.0 / 23.976;
      else if (Math.abs(ratio - 23.976 / 25.0) < 0.01) stretchFactor = 23.976 / 25.0;
    }
  }

  return {
    offsetSec: Math.round(bestOffsetSec * 1000) / 1000,
    stretchFactor: Math.round(stretchFactor * 1000) / 1000,
    confidence: Math.round(confidence * 100) / 100,
    isAligned: confidence >= 0.4,
  };
}

/**
 * Applies timing offset and optional framerate stretch to an array of subtitle cues.
 */
export function applySubSyncOffset(
  cues: SubCue[],
  offsetSec: number,
  stretchFactor = 1.0,
): SubCue[] {
  if (offsetSec === 0 && stretchFactor === 1.0) return [...cues];

  return cues
    .map((cue) => {
      const start = Math.max(0, cue.start * stretchFactor + offsetSec);
      const end = Math.max(start + 0.1, cue.end * stretchFactor + offsetSec);
      return {
        ...cue,
        start: Math.round(start * 1000) / 1000,
        end: Math.round(end * 1000) / 1000,
      };
    })
    .sort((a, b) => a.start - b.start);
}
