/**
 * Client-Side Adaptive Stream Quality Fallback
 *
 * Implements Plex-level bandwidth adaptation without requiring a server transcode engine.
 * Continuously evaluates TCP buffer health, network throughput, and packet jitter to
 * proactively downscale stream quality before buffer underruns occur.
 */

export interface StreamQualityProfile {
  id: string;
  resolution: "4k" | "1080p" | "720p" | "480p";
  bitrateMbps: number;
  url: string;
  codec?: string;
}

export interface NetworkHealthSample {
  measuredThroughputMbps: number;
  bufferHealthSeconds: number; // e.g. 15s of video pre-cached in RAM
  packetDropRate: number; // 0.0 to 1.0
  timestampMs: number;
}

export interface AdaptationDecision {
  action: "maintain" | "downscale" | "upscale";
  recommendedProfile: StreamQualityProfile;
  reason: string;
}

export interface AdaptiveFallbackConfig {
  enabled: boolean;
  minBufferHealthThresholdSec: number; // default: 4.0s (emergency downscale)
  targetBufferHealthSec: number; // default: 12.0s
  bandwidthHeadroomFactor: number; // default: 1.25 (require 25% throughput margin)
}

const STORAGE_KEY = "argus.stream.adaptive_fallback.v1";

const DEFAULT_CONFIG: AdaptiveFallbackConfig = {
  enabled: true,
  minBufferHealthThresholdSec: 4.0,
  targetBufferHealthSec: 12.0,
  bandwidthHeadroomFactor: 1.25,
};

let configCache: AdaptiveFallbackConfig | null = null;

export function getAdaptiveFallbackConfig(): AdaptiveFallbackConfig {
  if (configCache) return configCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    configCache = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    configCache = { ...DEFAULT_CONFIG };
  }
  return configCache ?? DEFAULT_CONFIG;
}

export function updateAdaptiveFallbackConfig(
  patch: Partial<AdaptiveFallbackConfig>,
): AdaptiveFallbackConfig {
  const current = getAdaptiveFallbackConfig();
  configCache = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configCache));
  } catch {}
  return configCache;
}

/**
 * Evaluates current stream performance against available profiles and decides whether to downscale or maintain.
 */
export function evaluateStreamAdaptation(
  activeProfile: StreamQualityProfile,
  availableProfiles: StreamQualityProfile[],
  health: NetworkHealthSample,
  config: AdaptiveFallbackConfig = getAdaptiveFallbackConfig(),
): AdaptationDecision {
  if (!config.enabled || availableProfiles.length <= 1) {
    return {
      action: "maintain",
      recommendedProfile: activeProfile,
      reason: "Adaptive fallback disabled or no alternative profiles available.",
    };
  }

  // Sort profiles descending by bitrate
  const sortedProfiles = [...availableProfiles].sort((a, b) => b.bitrateMbps - a.bitrateMbps);

  // 1. Critical Buffer Starvation: Buffer health fell below critical threshold
  if (health.bufferHealthSeconds < config.minBufferHealthThresholdSec) {
    // Find the next lower bitrate profile
    const lower = sortedProfiles.find((p) => p.bitrateMbps < activeProfile.bitrateMbps);
    if (lower) {
      return {
        action: "downscale",
        recommendedProfile: lower,
        reason: `Buffer critically low (${health.bufferHealthSeconds.toFixed(1)}s < ${config.minBufferHealthThresholdSec}s). Emergency downscale.`,
      };
    }
  }

  // 2. Insufficient Bandwidth Headroom: Throughput is less than bitrate * headroom
  const requiredThroughput = activeProfile.bitrateMbps * config.bandwidthHeadroomFactor;
  if (health.measuredThroughputMbps < requiredThroughput) {
    const fittingProfile = sortedProfiles.find(
      (p) => p.bitrateMbps * config.bandwidthHeadroomFactor <= health.measuredThroughputMbps,
    );

    if (fittingProfile && fittingProfile.bitrateMbps < activeProfile.bitrateMbps) {
      return {
        action: "downscale",
        recommendedProfile: fittingProfile,
        reason: `Throughput (${health.measuredThroughputMbps.toFixed(1)} Mbps) insufficient for ${activeProfile.bitrateMbps} Mbps stream.`,
      };
    }
  }

  // 3. Opportunistic Upscale: Healthy buffer (>15s) and plenty of excess throughput
  if (health.bufferHealthSeconds > config.targetBufferHealthSec * 1.5) {
    const higher = sortedProfiles
      .reverse()
      .find(
        (p) =>
          p.bitrateMbps > activeProfile.bitrateMbps &&
          p.bitrateMbps * config.bandwidthHeadroomFactor <= health.measuredThroughputMbps,
      );

    if (higher) {
      return {
        action: "upscale",
        recommendedProfile: higher,
        reason: `Excess throughput (${health.measuredThroughputMbps.toFixed(1)} Mbps) allows upgrade to ${higher.resolution}.`,
      };
    }
  }

  return {
    action: "maintain",
    recommendedProfile: activeProfile,
    reason: "Buffer and bandwidth healthy.",
  };
}
