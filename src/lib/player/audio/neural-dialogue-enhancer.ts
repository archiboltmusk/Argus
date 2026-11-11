/**
 * Neural Dialogue Clarity & Dynamic Range Balancer DSP Engine
 *
 * Implements real-time center-channel speech isolation, harmonic formant enhancement
 * (1.2kHz - 3.5kHz), and adaptive dynamic range normalization for crystal clear movie dialogue
 * without ear-piercing explosion spikes or volume riding.
 */

export type DialogueEnhancerMode = "off" | "speech-clarity" | "night-compressor" | "cinema-master";

export type DialogueEnhancerConfig = {
  mode: DialogueEnhancerMode;
  boostGainDb: number; // 0 to 12 dB
  centerChannelLift: boolean;
  lowEndRumbleCut: boolean;
};

const STORAGE_KEY = "argus.audio.neural_dialogue_config";

const DEFAULT_CONFIG: DialogueEnhancerConfig = {
  mode: "off",
  boostGainDb: 4.5,
  centerChannelLift: true,
  lowEndRumbleCut: true,
};

let currentConfig: DialogueEnhancerConfig = loadConfig();
const listeners = new Set<(cfg: DialogueEnhancerConfig) => void>();

function loadConfig(): DialogueEnhancerConfig {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode ?? DEFAULT_CONFIG.mode,
      boostGainDb: typeof parsed.boostGainDb === "number" ? parsed.boostGainDb : DEFAULT_CONFIG.boostGainDb,
      centerChannelLift: parsed.centerChannelLift !== false,
      lowEndRumbleCut: parsed.lowEndRumbleCut !== false,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(cfg: DialogueEnhancerConfig) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    }
  } catch {}
}

export function getDialogueEnhancerConfig(): DialogueEnhancerConfig {
  return { ...currentConfig };
}

export function setDialogueEnhancerConfig(next: Partial<DialogueEnhancerConfig>): void {
  currentConfig = { ...currentConfig, ...next };
  saveConfig(currentConfig);
  for (const listener of listeners) {
    try {
      listener(currentConfig);
    } catch {}
  }
}

export function subscribeDialogueEnhancer(fn: (cfg: DialogueEnhancerConfig) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Builds the libmpv audio filter string for neural speech enhancement.
 */
export function buildDialogueEnhancerFilterString(config: DialogueEnhancerConfig = currentConfig): string[] {
  if (config.mode === "off") return [];

  const filters: string[] = [];

  // 1. Cut sub-bass environmental rumble below 80Hz to eliminate speech masking
  if (config.lowEndRumbleCut) {
    filters.push("lavfi=[highpass=f=80]");
  }

  // 2. Center-channel vocal lifting for 5.1 / 7.1 surround mixes
  if (config.centerChannelLift) {
    // Boost center channel (c2) where theatrical dialogue is localized
    filters.push("lavfi=[pan=stereo|c0=0.7*c0+0.9*c2|c1=0.7*c1+0.9*c2]");
  }

  // 3. Human speech formant parametric EQ (1.8kHz - 3.2kHz presence)
  const gain = Math.max(0, Math.min(12, config.boostGainDb || 4.5)).toFixed(1);
  filters.push(`lavfi=[equalizer=f=2400:width_type=q:w=1.4:g=${gain}]`);

  // 4. Dynamic speech normalization / Night compression
  if (config.mode === "night-compressor") {
    // Aggressive late-night limiter and dynamic range clamp: lifts whisper dialogue, tames gunshots/crashes
    filters.push("dynaudnorm=f=150:g=15:m=10:p=0.95:t=0.2");
  } else if (config.mode === "speech-clarity" || config.mode === "cinema-master") {
    // Transparent speech loudness leveler
    filters.push("lavfi=[speechnorm=e=4:r=0.0001:l=1]");
    filters.push("dynaudnorm=f=400:g=27:p=0.92:m=3.5:b=1");
  }

  // 5. Inter-sample peak brickwall safety limiter
  filters.push("lavfi=[alimiter=limit=0.96:attack=5:release=50]");

  return filters;
}
