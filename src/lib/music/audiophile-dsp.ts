import type { MusicAudioSettingsValue } from "./audio-settings";
import type { PeqFilter } from "./parametric-eq";

export type HeadphoneProfile = {
  id: string;
  brand: string;
  model: string;
  category: "over-ear" | "in-ear" | "open-back";
  soundSignature: string;
  harmanTargetCompliance: number; // 0-100%
  filters: PeqFilter[];
};

export const POPULAR_HEADPHONE_PROFILES: HeadphoneProfile[] = [
  {
    id: "sennheiser-hd600",
    brand: "Sennheiser",
    model: "HD 600",
    category: "open-back",
    soundSignature: "Reference Neutral with Natural Timbre",
    harmanTargetCompliance: 94,
    filters: [
      { type: "lowShelf", frequency: 50, gain: 4.5, q: 0.7, enabled: true },
      { type: "peak", frequency: 120, gain: -1.2, q: 1.2, enabled: true },
      { type: "peak", frequency: 3200, gain: -1.8, q: 2.1, enabled: true },
      { type: "highShelf", frequency: 10000, gain: 2.0, q: 0.7, enabled: true },
    ],
  },
  {
    id: "sennheiser-hd650",
    brand: "Sennheiser",
    model: "HD 650 / 6XX",
    category: "open-back",
    soundSignature: "Warm Intimate Vocals with Smooth Treble",
    harmanTargetCompliance: 93,
    filters: [
      { type: "lowShelf", frequency: 60, gain: 5.0, q: 0.7, enabled: true },
      { type: "peak", frequency: 200, gain: -2.0, q: 1.0, enabled: true },
      { type: "highShelf", frequency: 8000, gain: 2.5, q: 0.8, enabled: true },
    ],
  },
  {
    id: "sennheiser-hd800s",
    brand: "Sennheiser",
    model: "HD 800 S",
    category: "open-back",
    soundSignature: "Infinite Soundstage with Tamed 6kHz Resonance",
    harmanTargetCompliance: 97,
    filters: [
      { type: "lowShelf", frequency: 45, gain: 5.5, q: 0.7, enabled: true },
      { type: "peak", frequency: 1100, gain: 1.5, q: 1.8, enabled: true },
      { type: "peak", frequency: 5800, gain: -3.8, q: 3.5, enabled: true },
      { type: "highShelf", frequency: 11000, gain: 1.0, q: 0.7, enabled: true },
    ],
  },
  {
    id: "sony-wh1000xm5",
    brand: "Sony",
    model: "WH-1000XM5",
    category: "over-ear",
    soundSignature: "Punchy Bass with Clear Midrange Separation",
    harmanTargetCompliance: 91,
    filters: [
      { type: "lowShelf", frequency: 120, gain: -3.5, q: 0.7, enabled: true },
      { type: "peak", frequency: 250, gain: -2.5, q: 1.4, enabled: true },
      { type: "peak", frequency: 1400, gain: 2.2, q: 1.1, enabled: true },
      { type: "peak", frequency: 5000, gain: 3.0, q: 1.8, enabled: true },
      { type: "highShelf", frequency: 11000, gain: 2.5, q: 0.7, enabled: true },
    ],
  },
  {
    id: "apple-airpods-max",
    brand: "Apple",
    model: "AirPods Max",
    category: "over-ear",
    soundSignature: "Extended Soundstage with Linear Sub-Bass",
    harmanTargetCompliance: 96,
    filters: [
      { type: "peak", frequency: 80, gain: 1.2, q: 1.0, enabled: true },
      { type: "peak", frequency: 1800, gain: 1.8, q: 1.5, enabled: true },
      { type: "highShelf", frequency: 9500, gain: 1.5, q: 0.7, enabled: true },
    ],
  },
  {
    id: "apple-airpods-pro-2",
    brand: "Apple",
    model: "AirPods Pro 2 (USB-C)",
    category: "in-ear",
    soundSignature: "Accurate Harman In-Ear Target Matching",
    harmanTargetCompliance: 98,
    filters: [
      { type: "peak", frequency: 250, gain: -1.0, q: 1.4, enabled: true },
      { type: "peak", frequency: 2800, gain: 1.2, q: 2.0, enabled: true },
      { type: "peak", frequency: 6500, gain: -2.0, q: 3.0, enabled: true },
    ],
  },
  {
    id: "focal-clear",
    brand: "Focal",
    model: "Clear / Clear Mg",
    category: "open-back",
    soundSignature: "Dynamic Slam with Hyper-Detailed Micro-Contrast",
    harmanTargetCompliance: 95,
    filters: [
      { type: "lowShelf", frequency: 55, gain: 3.8, q: 0.7, enabled: true },
      { type: "peak", frequency: 1200, gain: -1.5, q: 1.6, enabled: true },
      { type: "peak", frequency: 6000, gain: -2.2, q: 2.5, enabled: true },
    ],
  },
  {
    id: "hifiman-sundara",
    brand: "HIFIMAN",
    model: "Sundara",
    category: "open-back",
    soundSignature: "Planar Magnetic Fast Transients & Holographic Air",
    harmanTargetCompliance: 95,
    filters: [
      { type: "lowShelf", frequency: 65, gain: 4.0, q: 0.7, enabled: true },
      { type: "peak", frequency: 2000, gain: 1.5, q: 1.4, enabled: true },
      { type: "highShelf", frequency: 12000, gain: 1.0, q: 0.7, enabled: true },
    ],
  },
  {
    id: "audeze-lcd-x",
    brand: "Audeze",
    model: "LCD-X (2021 Creator Edition)",
    category: "open-back",
    soundSignature: "Sub-Bass Extension with Studio Linear Midrange",
    harmanTargetCompliance: 96,
    filters: [
      { type: "peak", frequency: 3800, gain: 4.2, q: 1.8, enabled: true },
      { type: "peak", frequency: 5800, gain: -2.0, q: 2.5, enabled: true },
      { type: "highShelf", frequency: 10000, gain: 1.5, q: 0.7, enabled: true },
    ],
  },
  {
    id: "moondrop-blessing-2",
    brand: "Moondrop",
    model: "Blessing 2: Dusk",
    category: "in-ear",
    soundSignature: "Crinacle Target Balanced IEM with Sub-Bass Boost",
    harmanTargetCompliance: 97,
    filters: [
      { type: "lowShelf", frequency: 80, gain: 1.8, q: 0.7, enabled: true },
      { type: "peak", frequency: 6000, gain: -2.5, q: 3.0, enabled: true },
      { type: "highShelf", frequency: 11000, gain: 1.5, q: 0.7, enabled: true },
    ],
  },
  {
    id: "beyerdynamic-dt770",
    brand: "Beyerdynamic",
    model: "DT 770 PRO (80Ω)",
    category: "over-ear",
    soundSignature: "Studio Bass Impact with Sibilance Tamed",
    harmanTargetCompliance: 89,
    filters: [
      { type: "peak", frequency: 100, gain: -1.5, q: 1.1, enabled: true },
      { type: "peak", frequency: 2200, gain: 2.0, q: 1.2, enabled: true },
      { type: "peak", frequency: 5800, gain: -4.5, q: 3.5, enabled: true },
      { type: "peak", frequency: 8400, gain: -5.0, q: 4.0, enabled: true },
    ],
  },
  {
    id: "audio-technica-m50x",
    brand: "Audio-Technica",
    model: "ATH-M50x",
    category: "over-ear",
    soundSignature: "Monitoring Clarity with Controlled Lower Midrange",
    harmanTargetCompliance: 88,
    filters: [
      { type: "lowShelf", frequency: 80, gain: 1.5, q: 0.7, enabled: true },
      { type: "peak", frequency: 280, gain: -3.0, q: 1.3, enabled: true },
      { type: "peak", frequency: 9000, gain: -2.5, q: 2.0, enabled: true },
    ],
  },
];

/**
 * Bauer stereophonic-to-binaural crossfeed presets (ported from Monochrome binaural-dsp.js).
 * Simulates real acoustic room monitors, dramatically eliminating headphone listening fatigue.
 */
export const BAUER_CROSSFEED_PRESETS = {
  low: { cutoffHz: 500, crossGainDb: -6.0, delayMs: 0.2, label: "Subtle (Bauer Low)" },
  medium: { cutoffHz: 700, crossGainDb: -4.5, delayMs: 0.3, label: "Studio Monitor (Bauer Standard)" },
  high: { cutoffHz: 1000, crossGainDb: -3.0, delayMs: 0.4, label: "Wide Soundstage (Bauer High)" },
} as const;

export type BauerPresetKey = keyof typeof BAUER_CROSSFEED_PRESETS;

/**
 * Calculates continuous Bauer crossfeed parameters from intensity 0..1.
 */
export function getBauerCrossfeedConfig(intensity: number): {
  cutoffHz: number;
  feedDb: number;
  delayMs: number;
  label: string;
} {
  const normalized = Math.max(0, Math.min(1, intensity));
  if (normalized === 0) {
    return { cutoffHz: 700, feedDb: -60, delayMs: 0, label: "Off (Direct Stereo)" };
  }
  const cutoffHz = Math.round(500 + normalized * 500); // 500Hz to 1000Hz
  const feedDb = Number((-6.5 + (normalized * 3.5)).toFixed(1)); // -6.5dB to -3.0dB
  const delayMs = Number((0.2 + normalized * 0.2).toFixed(2)); // 0.2ms to 0.4ms
  const label =
    normalized < 0.35
      ? BAUER_CROSSFEED_PRESETS.low.label
      : normalized < 0.7
      ? BAUER_CROSSFEED_PRESETS.medium.label
      : BAUER_CROSSFEED_PRESETS.high.label;

  return { cutoffHz, feedDb, delayMs, label };
}

/**
 * Computes Mid/Side Stereo Widening Matrix (from Monochrome spatial audio).
 * width = 1.0 (natural), width > 1.0 (wider soundstage), width < 1.0 (focused center).
 */
export function calculateStereoWideningMatrix(width = 1.0): {
  midGain: number;
  sideGain: number;
  effectiveWidth: number;
} {
  const clamped = Math.max(0.5, Math.min(2.0, width));
  const midGain = Number((2 / (1 + clamped)).toFixed(2));
  const sideGain = Number(((2 * clamped) / (1 + clamped)).toFixed(2));
  return { midGain, sideGain, effectiveWidth: clamped };
}

/**
 * Applies a selected headphone profile directly into audio settings.
 */
export function applyHeadphoneProfile(
  profileId: string,
  settings: MusicAudioSettingsValue,
): MusicAudioSettingsValue {
  const profile = POPULAR_HEADPHONE_PROFILES.find((p) => p.id === profileId);
  if (!profile) return settings;

  return {
    ...settings,
    eqMode: "parametric",
    eqEnabled: true,
    peqFilters: profile.filters,
    equipmentLabel: `${profile.brand} ${profile.model} (AutoEQ Harman)`,
  };
}
