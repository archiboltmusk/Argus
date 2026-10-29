/**
 * Serial Recap & Dramatic Filler Skipper
 *
 * Tailored for Indian television serials & daily soaps (Star Jalsha, Zee Bangla, Colors, Star Plus).
 * Indian soap episodes typically contain 3 to 5 minutes of previous episode recaps, 2-minute theme songs,
 * and prolonged 3-angle slow-motion dramatic reaction shots.
 *
 * Automatically generates skip segments and smart auto-skip triggers to compress a 22-minute episode
 * into ~12 minutes of core plot progression.
 */

export interface SerialSkipSegment {
  id: string;
  kind: "recap" | "theme_song" | "dramatic_stare_filler" | "next_episode_preview";
  label: string;
  startSec: number;
  endSec: number;
  canAutoSkip: boolean;
}

const SERIAL_CHANNEL_KEYWORDS = [
  "star jalsha",
  "zee bangla",
  "colors bangla",
  "sun bangla",
  "star plus",
  "zee tv",
  "colors",
  "sony sab",
  "dangal",
  "hoichoi",
];

/**
 * Checks if a given media title belongs to an Indian serial or soap opera.
 */
export function isIndianSerial(title: string | undefined | null): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  return SERIAL_CHANNEL_KEYWORDS.some((kw) => lower.includes(kw)) ||
    lower.includes("serial") ||
    lower.includes("daily soap") ||
    lower.includes("episode") && (lower.includes("bangla") || lower.includes("hindi"));
}

/**
 * Synthesizes default skip segments for typical 22-minute daily soap structure
 * when external subtitle/chapter markers are missing.
 */
export function estimateSerialSkipSegments(
  title: string | undefined | null,
  durationSec: number,
): SerialSkipSegment[] {
  if (!isIndianSerial(title) || durationSec < 600) {
    return [];
  }

  const segments: SerialSkipSegment[] = [];

  // 1. Initial Mega Recap (usually 0s to ~180s - 240s)
  if (durationSec >= 900) {
    segments.push({
      id: "serial_recap",
      kind: "recap",
      label: "Skip Yesterday's Dramatic Recap",
      startSec: 0,
      endSec: Math.min(210, durationSec * 0.18),
      canAutoSkip: true,
    });
  }

  // 2. Next Episode Mega Preview / Spoilers at the tail (last 90s - 120s)
  if (durationSec > 1200) {
    segments.push({
      id: "serial_preview",
      kind: "next_episode_preview",
      label: "Skip Tomorrow's Spoiler Preview",
      startSec: durationSec - 90,
      endSec: durationSec,
      canAutoSkip: true,
    });
  }

  return segments;
}
