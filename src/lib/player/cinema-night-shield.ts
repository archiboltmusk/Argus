/**
 * Cinema Night Shield & Speech Lifter DSP Engine
 *
 * Provides intelligent acoustic dynamic range compression, vocal formant boosting,
 * and low-frequency wall-thump limiting for late-night and apartment viewing.
 */

const STORAGE_KEY = "argus.audio.night_shield_enabled";

const VOCAL_BOOST_FILTER = "lavfi=[equalizer=f=2200:width_type=q:w=1.2:g=4.5]";
const WALL_THUMP_LIMITER = "lavfi=[highpass=f=45]";
const DYNAMIC_RANGE_NORM = "dynaudnorm=f=400:g=31:p=0.92:m=3.5:b=1";
const SAFE_PEAK_LIMITER = "lavfi=[alimiter=limit=0.95:attack=5:release=50]";

let isEnabledCache: boolean | null = null;
const listeners = new Set<(enabled: boolean) => void>();

export function isNightShieldEnabled(): boolean {
  if (isEnabledCache !== null) return isEnabledCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    isEnabledCache = raw === "true";
  } catch {
    isEnabledCache = false;
  }
  return isEnabledCache;
}

export function setNightShieldEnabled(enabled: boolean): void {
  isEnabledCache = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  } catch {}
  for (const listener of listeners) {
    try {
      listener(enabled);
    } catch {}
  }
}

export function toggleNightShield(): boolean {
  const next = !isNightShieldEnabled();
  setNightShieldEnabled(next);
  return next;
}

export function subscribeNightShield(fn: (enabled: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Builds the complete MPV audio filter string for Cinema Night Shield.
 */
export function buildNightShieldFilterString(additionalFilters: string[] = []): string {
  const parts: string[] = [];

  if (isNightShieldEnabled()) {
    // 1. High-pass filter cuts wall-penetrating floor vibration (< 45Hz)
    parts.push(WALL_THUMP_LIMITER);
    // 2. Vocal formant boost lifts dialogue intelligibility
    parts.push(VOCAL_BOOST_FILTER);
    // 3. Dynamic range compression levels explosions and whispers
    parts.push(DYNAMIC_RANGE_NORM);
  }

  // Append user profile / equalizer filters
  for (const f of additionalFilters) {
    if (f) parts.push(f);
  }

  // 4. Safe master peak limiter prevents any audio clipping
  if (parts.length > 0) {
    parts.push(SAFE_PEAK_LIMITER);
  }

  return parts.join(",");
}
