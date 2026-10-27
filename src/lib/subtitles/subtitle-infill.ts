import type { SubCue } from "./parser";

export type InfillCapability = {
  hasLocalWhisper: boolean;
  deviceTier: "high-performance-gpu" | "apple-neural-engine" | "standard-cpu" | "constrained";
  supportsAudioSlicing: boolean;
  canServeSwarm: boolean;
};

/**
 * Detects the client's hardware capability to run local Whisper speech-to-text infill
 */
export function detectInfillCapability(): InfillCapability {
  if (typeof window === "undefined") {
    return {
      hasLocalWhisper: false,
      deviceTier: "constrained",
      supportsAudioSlicing: false,
      canServeSwarm: false,
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const isMac = ua.includes("mac");
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;

  let deviceTier: InfillCapability["deviceTier"] = "standard-cpu";

  if (isMac && !isMobile) {
    // Apple Silicon / Metal environment
    deviceTier = "apple-neural-engine";
  } else if (!isMobile && hardwareConcurrency >= 8) {
    deviceTier = "high-performance-gpu";
  } else if (isMobile || hardwareConcurrency <= 2) {
    deviceTier = "constrained";
  }

  const hasLocalWhisper = deviceTier === "apple-neural-engine" || deviceTier === "high-performance-gpu";

  return {
    hasLocalWhisper,
    deviceTier,
    supportsAudioSlicing: true,
    canServeSwarm: hasLocalWhisper,
  };
}

/**
 * Merges the existing cues with newly generated infill cues seamlessly.
 * Sorts all cues, deduplicates overlaps, and re-indexes line sequences.
 */
export function spliceSubtitleCues(
  originalCues: readonly SubCue[],
  infillCues: readonly SubCue[],
): SubCue[] {
  const combined = [...originalCues, ...infillCues];
  combined.sort((a, b) => a.start - b.start);

  const merged: SubCue[] = [];
  for (const cue of combined) {
    if (!cue.text.trim()) continue;

    const prev = merged[merged.length - 1];
    if (prev) {
      // If cues overlap by more than 0.5s with identical or similar text, skip duplicate
      const overlap = Math.min(prev.end, cue.end) - Math.max(prev.start, cue.start);
      if (overlap > 0.5 && prev.text.trim().toLowerCase() === cue.text.trim().toLowerCase()) {
        continue;
      }
      // If end time of previous overlaps slightly, clamp it
      if (prev.end > cue.start && prev.start < cue.start) {
        prev.end = Math.max(prev.start + 0.1, cue.start - 0.05);
      }
    }

    merged.push({
      start: Math.max(0, cue.start),
      end: Math.max(cue.start + 0.1, cue.end),
      text: cue.text.trim(),
    });
  }

  return merged;
}

/**
 * Formats parsed cues into standard WebVTT text for player hot-reload
 */
export function serializeToVtt(cues: readonly SubCue[]): string {
  const formatVttTime = (sec: number) => {
    const s = Math.max(0, sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const rem = s % 60;
    const wholeSec = Math.floor(rem);
    const ms = Math.floor((rem - wholeSec) * 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(wholeSec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  };

  const lines: string[] = ["WEBVTT", "Kind: captions", ""];

  cues.forEach((cue, idx) => {
    lines.push(String(idx + 1));
    lines.push(`${formatVttTime(cue.start)} --> ${formatVttTime(cue.end)}`);
    lines.push(cue.text);
    lines.push("");
  });

  return lines.join("\n");
}
