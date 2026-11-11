/**
 * Dual-Subtitle Polyglot Mode (Bilingual Subtitle Compositor)
 *
 * Merges primary (native) and secondary (foreign/learning) subtitle tracks into
 * a synchronized two-tiered visual layout with independent colors and typography.
 */

import type { SubCue } from "./parser";

export interface CompositeDualCue {
  start: number;
  end: number;
  primaryText: string;
  secondaryText?: string;
  combinedText: string;
}

export interface DualSubOptions {
  secondaryColor?: string; // e.g. "#FDE047" (amber/yellow)
  primaryColor?: string; // e.g. "#FFFFFF" (white)
  secondaryPosition?: "top" | "above_primary";
}

const DEFAULT_OPTIONS: DualSubOptions = {
  secondaryColor: "#FDE047",
  primaryColor: "#FFFFFF",
  secondaryPosition: "above_primary",
};

/**
 * Merges two subtitle cue sets into a synchronized composite dual-track array.
 */
export function mergeDualSubtitles(
  primaryCues: SubCue[] = [],
  secondaryCues: SubCue[] = [],
  _options: DualSubOptions = DEFAULT_OPTIONS,
): CompositeDualCue[] {
  if (primaryCues.length === 0 && secondaryCues.length === 0) return [];
  if (secondaryCues.length === 0) {
    return primaryCues.map((c) => ({
      start: c.start,
      end: c.end,
      primaryText: c.text,
      combinedText: c.text,
    }));
  }
  if (primaryCues.length === 0) {
    return secondaryCues.map((c) => ({
      start: c.start,
      end: c.end,
      primaryText: "",
      secondaryText: c.text,
      combinedText: c.text,
    }));
  }

  // 1. Collect all distinct timestamp boundaries
  const timePoints = new Set<number>();
  for (const c of primaryCues) {
    timePoints.add(c.start);
    timePoints.add(c.end);
  }
  for (const c of secondaryCues) {
    timePoints.add(c.start);
    timePoints.add(c.end);
  }

  const sortedPoints = Array.from(timePoints).sort((a, b) => a - b);
  const composite: CompositeDualCue[] = [];

  // 2. Build non-overlapping intervals
  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const start = sortedPoints[i];
    const end = sortedPoints[i + 1];
    if (end - start < 0.05) continue; // Skip sub-50ms micro-slices

    const mid = (start + end) / 2;

    // Find active primary cues
    const activePrimary = primaryCues
      .filter((c) => mid >= c.start && mid < c.end)
      .map((c) => c.text.trim())
      .filter(Boolean)
      .join("\n");

    // Find active secondary cues
    const activeSecondary = secondaryCues
      .filter((c) => mid >= c.start && mid < c.end)
      .map((c) => c.text.trim())
      .filter(Boolean)
      .join("\n");

    if (!activePrimary && !activeSecondary) continue;

    let combinedText = "";
    if (activeSecondary && activePrimary) {
      combinedText = `${activeSecondary}\n${activePrimary}`;
    } else {
      combinedText = activePrimary || activeSecondary;
    }

    // Merge adjacent identical slices to keep cues clean
    const prev = composite[composite.length - 1];
    if (
      prev &&
      Math.abs(prev.end - start) < 0.05 &&
      prev.primaryText === activePrimary &&
      prev.secondaryText === activeSecondary
    ) {
      prev.end = end;
    } else {
      composite.push({
        start,
        end,
        primaryText: activePrimary,
        secondaryText: activeSecondary || undefined,
        combinedText,
      });
    }
  }

  return composite;
}

/**
 * Formats composite cues into compliant WebVTT markup for HTML5 or MPV playback.
 */
export function formatCompositeVtt(
  compositeCues: CompositeDualCue[],
  options: DualSubOptions = DEFAULT_OPTIONS,
): string {
  let vtt = "WEBVTT\n\n";

  for (let i = 0; i < compositeCues.length; i++) {
    const cue = compositeCues[i];
    const startFormatted = formatVttTimestamp(cue.start);
    const endFormatted = formatVttTimestamp(cue.end);

    vtt += `${i + 1}\n`;
    vtt += `${startFormatted} --> ${endFormatted}\n`;

    if (cue.secondaryText && cue.primaryText) {
      const secColor = options.secondaryColor ?? "#FDE047";
      vtt += `<c.secondary style="color:${secColor}">${cue.secondaryText}</c>\n${cue.primaryText}\n\n`;
    } else {
      vtt += `${cue.combinedText}\n\n`;
    }
  }

  return vtt;
}

function formatVttTimestamp(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);

  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  const mmm = String(ms).padStart(3, "0");

  return `${hh}:${mm}:${ss}.${mmm}`;
}
