/**
 * Photosensitivity, Seizure & Trigger Shield (SafeCinema DSP)
 *
 * Implements the Harding FPA (Flash Protection Analysis) algorithm to detect
 * hazardous strobe light patterns (>3 flashes/sec) and sudden jump-scare decibel spikes,
 * providing automatic luminance smoothing and discreet viewer warnings.
 */

export interface SafeCinemaConfig {
  epilepsyShieldEnabled: boolean;
  strobeFlashThresholdHz: number; // Harding standard: 3.0 Hz
  maxAllowedLuminanceDelta: number; // 0.0 to 1.0 (typical: 0.2)
  jumpScareRadarEnabled: boolean;
  jumpScareSensitivityDb: number; // Energy rise threshold, e.g. 18dB
  autoDimmingFactor: number; // 0.0 to 1.0 (e.g. 0.4 = 40% reduction)
}

export interface FrameLuminanceSample {
  timestampMs: number;
  relativeLuminance: number; // 0.0 to 1.0
}

export interface StrobeDetectionResult {
  isHazardous: boolean;
  flashRateHz: number;
  maxDelta: number;
  recommendedContrastScale: number; // e.g. 0.6
}

const STORAGE_KEY = "argus.player.safecinema.v1";

const DEFAULT_CONFIG: SafeCinemaConfig = {
  epilepsyShieldEnabled: true,
  strobeFlashThresholdHz: 3.0,
  maxAllowedLuminanceDelta: 0.22,
  jumpScareRadarEnabled: true,
  jumpScareSensitivityDb: 18.0,
  autoDimmingFactor: 0.45,
};

let configCache: SafeCinemaConfig | null = null;
const listeners = new Set<(hazard: StrobeDetectionResult | null) => void>();

export function getSafeCinemaConfig(): SafeCinemaConfig {
  if (configCache) return configCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    configCache = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    configCache = { ...DEFAULT_CONFIG };
  }
  return configCache ?? DEFAULT_CONFIG;
}

export function updateSafeCinemaConfig(
  patch: Partial<SafeCinemaConfig>,
): SafeCinemaConfig {
  const current = getSafeCinemaConfig();
  configCache = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configCache));
  } catch {}
  return configCache;
}

export function subscribeSafeCinema(
  fn: (hazard: StrobeDetectionResult | null) => void,
): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Harding FPA flash detector analyzing a rolling 1000ms window of luminance samples.
 */
export function evaluatePhotosensitiveStrobe(
  samples: FrameLuminanceSample[],
  config: SafeCinemaConfig = getSafeCinemaConfig(),
): StrobeDetectionResult {
  if (!config.epilepsyShieldEnabled || samples.length < 4) {
    return {
      isHazardous: false,
      flashRateHz: 0,
      maxDelta: 0,
      recommendedContrastScale: 1.0,
    };
  }

  // Filter samples to the most recent 1000ms window
  const latestTs = samples[samples.length - 1].timestampMs;
  const windowSamples = samples.filter((s) => latestTs - s.timestampMs <= 1000);

  if (windowSamples.length < 4) {
    return {
      isHazardous: false,
      flashRateHz: 0,
      maxDelta: 0,
      recommendedContrastScale: 1.0,
    };
  }

  // Detect directional reversals with significant luminance delta
  let flashCount = 0;
  let maxDelta = 0;
  let previousDirection: "up" | "down" | null = null;

  for (let i = 1; i < windowSamples.length; i++) {
    const delta = windowSamples[i].relativeLuminance - windowSamples[i - 1].relativeLuminance;
    const absDelta = Math.abs(delta);
    if (absDelta > maxDelta) maxDelta = absDelta;

    if (absDelta >= config.maxAllowedLuminanceDelta) {
      const direction: "up" | "down" = delta > 0 ? "up" : "down";
      if (previousDirection && previousDirection !== direction) {
        // Full flash cycle transition (up then down, or down then up)
        flashCount++;
      }
      previousDirection = direction;
    }
  }

  const windowDurationSec = Math.max(
    0.2,
    (windowSamples[windowSamples.length - 1].timestampMs - windowSamples[0].timestampMs) / 1000,
  );
  const flashRateHz = flashCount / windowDurationSec;

  const isHazardous = flashRateHz >= config.strobeFlashThresholdHz && maxDelta >= config.maxAllowedLuminanceDelta;

  const recommendedContrastScale = isHazardous
    ? Math.max(0.3, 1.0 - config.autoDimmingFactor)
    : 1.0;

  return {
    isHazardous,
    flashRateHz: Math.round(flashRateHz * 10) / 10,
    maxDelta: Math.round(maxDelta * 100) / 100,
    recommendedContrastScale,
  };
}

/**
 * Jump-Scare Acoustic Crest Detector.
 * Compares immediate short-term RMS (50ms) to ambient baseline RMS (1000ms).
 */
export function evaluateJumpScareAcousticRise(
  baselineRmsDb: number,
  peakRmsDb: number,
  config: SafeCinemaConfig = getSafeCinemaConfig(),
): { isJumpScareRisk: boolean; riseDb: number } {
  if (!config.jumpScareRadarEnabled) {
    return { isJumpScareRisk: false, riseDb: 0 };
  }

  const riseDb = peakRmsDb - baselineRmsDb;
  const isJumpScareRisk = riseDb >= config.jumpScareSensitivityDb;

  return {
    isJumpScareRisk,
    riseDb: Math.round(riseDb * 10) / 10,
  };
}

/**
 * Generates MPV video property adjustments for active strobe dimming.
 */
export function buildSafeCinemaMpvProperties(
  result: StrobeDetectionResult,
): Array<{ name: string; value: string }> {
  if (!result.isHazardous) {
    return [
      { name: "contrast", value: "0" },
      { name: "brightness", value: "0" },
    ];
  }

  // Scale down contrast and brightness during hazardous scenes
  const contrastDampen = Math.round((result.recommendedContrastScale - 1.0) * 100);
  const brightnessDampen = -15;

  return [
    { name: "contrast", value: `${contrastDampen}` },
    { name: "brightness", value: `${brightnessDampen}` },
  ];
}
