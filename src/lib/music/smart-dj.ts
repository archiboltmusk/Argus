import type { MusicTrack } from "./types";

export type CamelotKey =
  | "1A" | "1B" | "2A" | "2B" | "3A" | "3B" | "4A" | "4B"
  | "5A" | "5B" | "6A" | "6B" | "7A" | "7B" | "8A" | "8B"
  | "9A" | "9B" | "10A" | "10B" | "11A" | "11B" | "12A" | "12B";

export type DjTransitionProfile = {
  crossfadeDurationSeconds: number;
  curve: "linear" | "equal-power" | "smooth-dip";
  bpmDifference: number;
  isHarmonicallyCompatible: boolean;
  harmonicRelation: "exact" | "relative" | "adjacent" | "energy-boost" | "dissonant";
  score: number; // 0-100
  reason: string;
};

// Map standard musical keys to Camelot Wheel positions
const KEY_TO_CAMELOT: Record<string, CamelotKey> = {
  "ab minor": "1A", "b major": "1B",
  "eb minor": "2A", "f# major": "2B", "gb major": "2B",
  "bb minor": "3A", "db major": "3B",
  "f minor": "4A", "ab major": "4B",
  "c minor": "5A", "eb major": "5B",
  "g minor": "6A", "bb major": "6B",
  "d minor": "7A", "f major": "7B",
  "a minor": "8A", "c major": "8B",
  "e minor": "9A", "g major": "9B",
  "b minor": "10A", "d major": "10B",
  "f# minor": "11A", "a major": "11B",
  "db minor": "12A", "c# minor": "12A", "e major": "12B",
};

/**
 * Derives a synthetic or catalog-extracted Camelot key deterministically from track properties.
 */
export function estimateTrackKey(track: MusicTrack): { key: string; camelot: CamelotKey; bpm: number } {
  // Deterministic seed based on track title & artist
  const str = `${track.artist}-${track.title}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const keys: CamelotKey[] = [
    "1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B",
    "5A", "5B", "6A", "6B", "7A", "7B", "8A", "8B",
    "9A", "9B", "10A", "10B", "11A", "11B", "12A", "12B",
  ];
  const camelot = keys[positive % keys.length];
  // Standard tempo range: 85 to 140 BPM
  const bpm = 85 + (positive % 56);
  return { key: camelot, camelot, bpm };
}

/**
 * Evaluates harmonic compatibility between two tracks on the Camelot wheel.
 */
export function evaluateHarmonicMix(currentTrack: MusicTrack, nextTrack: MusicTrack): DjTransitionProfile {
  const current = estimateTrackKey(currentTrack);
  const next = estimateTrackKey(nextTrack);

  const numCurrent = parseInt(current.camelot, 10);
  const letterCurrent = current.camelot.slice(-1);
  const numNext = parseInt(next.camelot, 10);
  const letterNext = next.camelot.slice(-1);

  const bpmDiff = Math.abs(current.bpm - next.bpm);
  let relation: DjTransitionProfile["harmonicRelation"] = "dissonant";
  let isHarmonicallyCompatible = false;
  let score = 50;
  let reason = "Standard track cut";

  if (current.camelot === next.camelot) {
    relation = "exact";
    isHarmonicallyCompatible = true;
    score = 100;
    reason = "Identical harmonic key — seamless tonal blend";
  } else if (numCurrent === numNext && letterCurrent !== letterNext) {
    relation = "relative";
    isHarmonicallyCompatible = true;
    score = 94;
    reason = "Relative Major/Minor transition";
  } else if (letterCurrent === letterNext) {
    const diff = Math.abs(numCurrent - numNext);
    if (diff === 1 || diff === 11) {
      relation = "adjacent";
      isHarmonicallyCompatible = true;
      score = 88;
      reason = "Adjacent key on the Camelot Wheel";
    } else if (numNext === (numCurrent % 12) + 2 || (numCurrent === 11 && numNext === 1) || (numCurrent === 12 && numNext === 2)) {
      relation = "energy-boost";
      isHarmonicallyCompatible = true;
      score = 82;
      reason = "Energy Boost (+2 Camelot jump)";
    }
  }

  // Adjust crossfade duration:
  // For highly compatible harmonic mixes with close BPM, long 6-8s crossfade is euphoric.
  // For key clashes or large tempo differences, shorter 2-3s equal-power dip is cleanest.
  let crossfadeDurationSeconds = 4.0;
  let curve: DjTransitionProfile["curve"] = "equal-power";

  if (isHarmonicallyCompatible && bpmDiff < 8) {
    crossfadeDurationSeconds = 7.5;
    curve = "smooth-dip";
  } else if (bpmDiff > 25) {
    crossfadeDurationSeconds = 2.0;
    curve = "linear";
  }

  return {
    crossfadeDurationSeconds,
    curve,
    bpmDifference: bpmDiff,
    isHarmonicallyCompatible,
    harmonicRelation: relation,
    score,
    reason,
  };
}
