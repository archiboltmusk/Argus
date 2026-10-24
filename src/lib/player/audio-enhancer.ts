import { invoke } from "@tauri-apps/api/core";

export type AudioEnhancementMode = "off" | "voice_clarity" | "studio_podcast" | "night_mode" | "lecture_hall_denoise";

export type AudioEnhancerConfig = {
  mode: AudioEnhancementMode;
  vocalBoostDb: number;
  noiseSuppression: boolean;
  dynamicRangeCompression: boolean;
  trebleCrispness: number;
};

const DEFAULT_CONFIG: AudioEnhancerConfig = {
  mode: "off",
  vocalBoostDb: 4,
  noiseSuppression: true,
  dynamicRangeCompression: true,
  trebleCrispness: 2,
};

let currentConfig: AudioEnhancerConfig = { ...DEFAULT_CONFIG };

/**
 * Builds an optimal lavfi audio filter string for mpv.
 * Uses high-pass to cut sub-bass rumble, bandpass/equalizer to lift human vocal presence (1 kHz - 4 kHz),
 * and dynamic range compression (acompressor / loudnorm) to balance quiet voices without clipping loud spikes.
 */
export function buildAudioFilterString(config: AudioEnhancerConfig): string {
  if (config.mode === "off") return "";

  const filters: string[] = [];

  switch (config.mode) {
    case "voice_clarity":
      // Cut low-end rumble (<85Hz), boost vocal intelligibility (2.5kHz), smooth dynamics
      filters.push("highpass=f=85");
      filters.push(`equalizer=f=2600:t=q:w=1.2:g=${config.vocalBoostDb}`);
      filters.push("acompressor=threshold=-21dB:ratio=4:attack=15:release=120");
      break;

    case "lecture_hall_denoise":
      // Aggressive room AC and fan hum filter + podium speech presence
      filters.push("highpass=f=110");
      filters.push("lowpass=f=7800");
      filters.push(`equalizer=f=3000:t=q:w=1.0:g=${config.vocalBoostDb + 2}`);
      filters.push("acompressor=threshold=-24dB:ratio=5:attack=10:release=150");
      break;

    case "studio_podcast":
      // Warm, broadcast-style vocal enhancement
      filters.push("highpass=f=75");
      filters.push("equalizer=f=220:t=q:w=1.0:g=2.5"); // warmth
      filters.push("equalizer=f=3500:t=q:w=1.5:g=3.5"); // air & crispness
      filters.push("acompressor=threshold=-18dB:ratio=3:attack=20:release=200");
      break;

    case "night_mode":
      // Tames loud sound effects and explosions while keeping dialogue crisp and audible
      filters.push("highpass=f=100");
      filters.push("equalizer=f=2400:t=q:w=1.2:g=4.0");
      filters.push("loudnorm=I=-24:LRA=7:TP=-2.0");
      break;
  }

  return filters.join(",");
}

/**
 * Applies the neural voice / acoustic filter directly to the active mpv instance.
 */
export async function applyAudioEnhancer(config: Partial<AudioEnhancerConfig>): Promise<void> {
  currentConfig = { ...currentConfig, ...config };
  const filterStr = buildAudioFilterString(currentConfig);

  try {
    await invoke("mpv_set_property", {
      name: "af",
      value: filterStr || "no",
    });
  } catch (e) {
    console.warn("[audio-enhancer] failed to apply filter to mpv", e);
  }
}

export function getAudioEnhancerConfig(): AudioEnhancerConfig {
  return { ...currentConfig };
}
