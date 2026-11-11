/**
 * Bluetooth Headset Latency Calibrator & AVR Bitstream Engine
 *
 * Implements interactive acoustic lip-sync calibration for Bluetooth earphones (AirPods/Sony XM5)
 * and hardware audio bitstreaming (Dolby TrueHD, Atmos, DTS-HD MA) for HDMI eARC AVRs.
 */

export interface LatencyCalibrationSample {
  referencePulseMs: number;
  userClickMs: number;
  offsetMs: number;
}

export interface AudioHardwareConfig {
  bluetoothDelayMs: number; // e.g. +150ms to +250ms
  avPassthroughEnabled: boolean;
  bitstreamCodecs: Array<"ac3" | "eac3" | "dts" | "dts-hd" | "truehd">;
  audioExclusiveMode: boolean; // Direct hardware access, bypasses OS mixer
}

const STORAGE_KEY = "argus.audio.hardware_config.v1";

const DEFAULT_CONFIG: AudioHardwareConfig = {
  bluetoothDelayMs: 0,
  avPassthroughEnabled: false,
  bitstreamCodecs: ["ac3", "eac3", "dts", "dts-hd", "truehd"],
  audioExclusiveMode: false,
};

let configCache: AudioHardwareConfig | null = null;
const listeners = new Set<(cfg: AudioHardwareConfig) => void>();

export function getAudioHardwareConfig(): AudioHardwareConfig {
  if (configCache) return configCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    configCache = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    configCache = { ...DEFAULT_CONFIG };
  }
  return configCache ?? DEFAULT_CONFIG;
}

export function updateAudioHardwareConfig(
  patch: Partial<AudioHardwareConfig>,
): AudioHardwareConfig {
  const current = getAudioHardwareConfig();
  configCache = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configCache));
  } catch {}
  notifyListeners();
  return configCache;
}

export function subscribeAudioHardware(
  fn: (cfg: AudioHardwareConfig) => void,
): () => void {
  listeners.add(fn);
  fn(getAudioHardwareConfig());
  return () => {
    listeners.delete(fn);
  };
}

function notifyListeners(): void {
  const cfg = getAudioHardwareConfig();
  for (const fn of listeners) {
    try {
      fn(cfg);
    } catch {}
  }
}

/**
 * Computes average audio latency from calibration tap samples with statistical outlier rejection.
 */
export function computeCalibrationOffsetMs(
  samples: Array<{ referencePulseMs: number; userClickMs: number }>,
): number {
  if (samples.length === 0) return 0;

  // Calculate raw offsets
  const rawOffsets = samples.map((s) => s.userClickMs - s.referencePulseMs);

  if (rawOffsets.length < 3) {
    const sum = rawOffsets.reduce((acc, v) => acc + v, 0);
    return Math.round(sum / rawOffsets.length);
  }

  // Sort and remove lowest and highest 20% to eliminate motor reaction lag outliers
  const sorted = [...rawOffsets].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * 0.2);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

  const mean = trimmed.reduce((acc, v) => acc + v, 0) / trimmed.length;
  // Subtract typical human perceptual motor reaction time constant (~150ms)
  const estimatedHardwareLag = Math.max(0, Math.round(mean - 150));
  return estimatedHardwareLag;
}

/**
 * Generates MPV audio property commands for Bluetooth compensation and bitstream passthrough.
 */
export function buildAudioHardwareMpvCommands(
  config: AudioHardwareConfig = getAudioHardwareConfig(),
): Array<{ name: string; value: string }> {
  const commands: Array<{ name: string; value: string }> = [];

  // Bluetooth audio delay (negative delay advances audio to match delayed video or vice versa)
  if (config.bluetoothDelayMs !== 0) {
    // In MPV, audio-delay is in seconds (e.g. -0.180)
    const delaySec = (config.bluetoothDelayMs / 1000).toFixed(3);
    commands.push({ name: "audio-delay", value: delaySec });
  } else {
    commands.push({ name: "audio-delay", value: "0" });
  }

  // Bitstream / eARC Passthrough
  if (config.avPassthroughEnabled && config.bitstreamCodecs.length > 0) {
    commands.push({ name: "audio-spdif", value: config.bitstreamCodecs.join(",") });
    commands.push({ name: "audio-channels", value: "auto" });
  } else {
    commands.push({ name: "audio-spdif", value: "" });
  }

  if (config.audioExclusiveMode) {
    commands.push({ name: "audio-exclusive", value: "yes" });
  } else {
    commands.push({ name: "audio-exclusive", value: "no" });
  }

  return commands;
}
