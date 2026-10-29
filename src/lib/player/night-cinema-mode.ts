/**
 * Night-Owl Cinema Mode (Dynamic Ad & Explosion Ducking with Dimmed Subtitles)
 *
 * Engineered for late-night viewing in quiet households (e.g. 00:00 - 05:00 IST).
 * 1. Audio: Real-time dynamic range compression (DRC) clamps loud gunshots, explosions,
 *    and blasted commercials, while lifting quiet whisper dialogue (+5 dB @ 2.5 kHz).
 * 2. Visuals: Dims pure white subtitles to a soft warm amber (#FFD7A0) at 75% opacity to
 *    prevent sudden retina flashbangs in dark rooms.
 */

export interface NightCinemaConfig {
  enabled: boolean;
  autoNightWindow: boolean; // 00:00 - 05:00 IST
  dialogueBoostDb: number;
  explosionDuckingRatio: number; // e.g. 6:1 or 8:1
  dimmedSubtitleColor: string;
  dimmedSubtitleOpacity: number;
}

export const DEFAULT_NIGHT_CINEMA: NightCinemaConfig = {
  enabled: true,
  autoNightWindow: true,
  dialogueBoostDb: 5,
  explosionDuckingRatio: 7,
  dimmedSubtitleColor: "#FFD7A0", // Warm eye-friendly amber
  dimmedSubtitleOpacity: 0.75,
};

/**
 * Checks whether current local time falls in late-night hours (00:00 - 05:00).
 */
export function isNightCinemaWindow(): boolean {
  const hour = new Date().getHours();
  return hour >= 0 && hour < 5;
}

/**
 * Determines whether Night Cinema Mode should be active.
 */
export function isNightCinemaActive(config: Partial<NightCinemaConfig> = {}): boolean {
  const cfg = { ...DEFAULT_NIGHT_CINEMA, ...config };
  if (!cfg.enabled) return false;
  if (cfg.autoNightWindow) {
    return isNightCinemaWindow();
  }
  return true;
}

/**
 * Generates mpv lavfi audio filter chain for dynamic range compression and whisper clarity.
 */
export function getNightCinemaAudioFilter(dialogueBoostDb = 5): string {
  return [
    "highpass=f=90", // Cut low vibration hum
    `equalizer=f=2500:t=q:w=1.2:g=${dialogueBoostDb}`, // Boost dialogue intelligibility
    "acompressor=threshold=-24dB:ratio=7:attack=5:release=100", // Clamps loud explosions/commercials
    "loudnorm=I=-24:LRA=6:TP=-2.0", // EBU R128 broadcast loudness tamer
  ].join(",");
}

/**
 * Returns subtitle styling overrides for night viewing in a dark room.
 */
export function getNightCinemaSubStyle(config: Partial<NightCinemaConfig> = {}): {
  color: string;
  opacity: number;
  boxColor: string;
  boxOpacity: number;
} {
  const cfg = { ...DEFAULT_NIGHT_CINEMA, ...config };
  return {
    color: cfg.dimmedSubtitleColor,
    opacity: cfg.dimmedSubtitleOpacity,
    boxColor: "#000000",
    boxOpacity: 0.5,
  };
}
