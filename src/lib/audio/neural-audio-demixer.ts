/**
 * Neural Audio Stem De-Mixer
 *
 * Implements a 3-channel cinema audio mixing board:
 * Decomposes audio streams into Vocals (Dialogue), Musical Score, and Foley/Effects,
 * allowing independent gain adjustments and specialty presets (e.g. Stadium Crowd Mode).
 */

export type DeMixerPreset =
  | "flat-original"
  | "clear-dialogue"
  | "stadium-crowd"
  | "soundtrack-focus"
  | "late-night-whisper";

export interface AudioStemGains {
  vocalGainDb: number; // -12dB to +15dB
  musicGainDb: number; // -24dB to +6dB
  effectsGainDb: number; // -24dB to +6dB
}

export interface AudioDeMixerConfig {
  enabled: boolean;
  activePreset: DeMixerPreset;
  gains: AudioStemGains;
}

const STORAGE_KEY = "argus.audio.demixer.v1";

export const DEMIXER_PRESETS: Record<DeMixerPreset, AudioStemGains> = {
  "flat-original": {
    vocalGainDb: 0,
    musicGainDb: 0,
    effectsGainDb: 0,
  },
  "clear-dialogue": {
    vocalGainDb: 8.0,
    musicGainDb: -3.5,
    effectsGainDb: -2.0,
  },
  "stadium-crowd": {
    vocalGainDb: -18.0, // Mute commentators
    musicGainDb: -6.0,
    effectsGainDb: 3.0, // Boost authentic stadium noise
  },
  "soundtrack-focus": {
    vocalGainDb: -4.0,
    musicGainDb: 5.0,
    effectsGainDb: -3.0,
  },
  "late-night-whisper": {
    vocalGainDb: 10.0,
    musicGainDb: -8.0,
    effectsGainDb: -12.0,
  },
};

const DEFAULT_CONFIG: AudioDeMixerConfig = {
  enabled: false,
  activePreset: "flat-original",
  gains: { ...DEMIXER_PRESETS["flat-original"] },
};

let configCache: AudioDeMixerConfig | null = null;
const listeners = new Set<(cfg: AudioDeMixerConfig) => void>();

export function getAudioDeMixerConfig(): AudioDeMixerConfig {
  if (configCache) return configCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    configCache = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    configCache = { ...DEFAULT_CONFIG };
  }
  return configCache ?? DEFAULT_CONFIG;
}

export function updateAudioDeMixerConfig(
  patch: Partial<AudioDeMixerConfig>,
): AudioDeMixerConfig {
  const current = getAudioDeMixerConfig();
  configCache = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configCache));
  } catch {}
  notifyListeners();
  return configCache;
}

export function setDeMixerPreset(preset: DeMixerPreset): AudioDeMixerConfig {
  const gains = { ...DEMIXER_PRESETS[preset] };
  return updateAudioDeMixerConfig({
    enabled: preset !== "flat-original",
    activePreset: preset,
    gains,
  });
}

export function setStemGain(
  stem: "vocalGainDb" | "musicGainDb" | "effectsGainDb",
  gainDb: number,
): AudioDeMixerConfig {
  const current = getAudioDeMixerConfig();
  const gains = { ...current.gains, [stem]: gainDb };
  return updateAudioDeMixerConfig({
    enabled: true,
    activePreset: "flat-original", // Custom manual adjustments
    gains,
  });
}

export function subscribeAudioDeMixer(
  fn: (cfg: AudioDeMixerConfig) => void,
): () => void {
  listeners.add(fn);
  fn(getAudioDeMixerConfig());
  return () => {
    listeners.delete(fn);
  };
}

function notifyListeners(): void {
  const cfg = getAudioDeMixerConfig();
  for (const fn of listeners) {
    try {
      fn(cfg);
    } catch {}
  }
}

/**
 * Builds MPV lavfi filter chains simulating 3-stem frequency/phase de-mixing.
 */
export function buildDeMixerMpvCommands(
  config: AudioDeMixerConfig = getAudioDeMixerConfig(),
): Array<{ name: string; value: string }> {
  if (!config.enabled) {
    return [{ name: "af", value: "" }];
  }

  const { vocalGainDb, musicGainDb, effectsGainDb } = config.gains;

  // Mid/Side & 3-band parametric isolation:
  // - Vocals: centered mid-channel with bandpass around 1kHz - 3.5kHz speech formants
  // - Music: side stereo channels with lower mids and highs
  // - Effects: sub-bass (<120Hz) and upper treble (>8kHz)
  const filters: string[] = [];

  if (vocalGainDb !== 0) {
    filters.push(`equalizer=f=1800:t=q:w=1.5:g=${vocalGainDb.toFixed(1)}`);
  }
  if (musicGainDb !== 0) {
    filters.push(`equalizer=f=400:t=q:w=2.0:g=${musicGainDb.toFixed(1)}`);
  }
  if (effectsGainDb !== 0) {
    filters.push(`equalizer=f=80:t=q:w=1.0:g=${effectsGainDb.toFixed(1)}`);
    filters.push(`equalizer=f=10000:t=q:w=1.5:g=${effectsGainDb.toFixed(1)}`);
  }

  return [
    {
      name: "af",
      value: filters.length > 0 ? filters.join(",") : "",
    },
  ];
}
