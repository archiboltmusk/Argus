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
];

/**
 * Calculates Bauer stereophonic-to-binaural crossfeed parameters.
 * Crossfeed feeds slightly delayed, low-pass filtered audio from left-to-right and right-to-left
 * to simulate the natural acoustic head shadow and distance of room monitors, dramatically reducing ear fatigue.
 */
export function getBauerCrossfeedConfig(intensity: number): {
  cutoffHz: number;
  feedDb: number;
  delayMs: number;
  label: string;
} {
  const normalized = Math.max(0, Math.min(1, intensity));
  if (normalized === 0) {
    return { cutoffHz: 700, feedDb: -60, delayMs: 0, label: "Off" };
  }
  const cutoffHz = Math.round(650 + (1 - normalized) * 150); // 650Hz to 800Hz
  const feedDb = Math.round(-15 + (normalized * 9.5)); // -15dB to -5.5dB
  const delayMs = Number((0.2 + normalized * 0.25).toFixed(2)); // 0.2ms to 0.45ms head acoustic transit time
  const label = normalized < 0.35 ? "Subtle (Natural Room)" : normalized < 0.7 ? "Studio Monitor" : "Wide Soundstage";
  return { cutoffHz, feedDb, delayMs, label };
}

/**
 * Applies a selected headphone profile directly into the audio settings.
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
    equipmentLabel: `${profile.brand} ${profile.model} (AutoEQ)`,
  };
}
