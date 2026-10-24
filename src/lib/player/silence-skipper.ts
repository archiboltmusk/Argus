import { useEffect, useRef } from "react";
import type { SubCue } from "@/lib/subtitles/parser";

export type SmartSilenceSkipperProps = {
  enabled: boolean;
  currentPositionSec: number;
  currentRate: number;
  subCues: readonly SubCue[];
  onSetRate: (rate: number) => void;
  baseRate?: number;
  acceleratedRate?: number;
  minSilenceSec?: number;
};

/**
 * Intelligent silence & pause accelerator.
 * Monitors gaps between subtitle/speech cues:
 * When human speech pauses for > minSilenceSec (default 1.8s), playback rate
 * seamlessly speeds up to acceleratedRate (default 2.4x) until speech resumes.
 */
export function useSmartSilenceSkipper({
  enabled,
  currentPositionSec,
  currentRate,
  subCues,
  onSetRate,
  baseRate = 1.0,
  acceleratedRate = 2.4,
  minSilenceSec = 1.8,
}: SmartSilenceSkipperProps) {
  const isAcceleratedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !subCues || subCues.length === 0) {
      if (isAcceleratedRef.current) {
        isAcceleratedRef.current = false;
        onSetRate(baseRate);
      }
      return;
    }

    // Find if current position falls inside a spoken cue
    const isSpeaking = subCues.some(
      (cue) => currentPositionSec >= cue.start - 0.2 && currentPositionSec <= cue.end + 0.2,
    );

    if (isSpeaking) {
      if (isAcceleratedRef.current) {
        isAcceleratedRef.current = false;
        onSetRate(baseRate);
      }
    } else {
      // Find distance to next cue
      const nextCue = subCues.find((cue) => cue.start > currentPositionSec);
      if (nextCue && nextCue.start - currentPositionSec > minSilenceSec) {
        if (!isAcceleratedRef.current && currentRate < acceleratedRate) {
          isAcceleratedRef.current = true;
          onSetRate(acceleratedRate);
        }
      }
    }
  }, [enabled, currentPositionSec, currentRate, subCues, onSetRate, baseRate, acceleratedRate, minSilenceSec]);

  return { isAccelerated: isAcceleratedRef.current };
}
