import { invoke } from "@tauri-apps/api/core";

export type SilenceSkipperConfig = {
  enabled: boolean;
  baseSpeed: number;
  fastSpeed: number; // e.g. 2.5x to 3.5x during silence/pauses
  silenceThresholdDb: number; // default -32dB
  minSilenceDurationSec: number; // default 0.4s
};

const DEFAULT_CONFIG: SilenceSkipperConfig = {
  enabled: false,
  baseSpeed: 1.0,
  fastSpeed: 2.8,
  silenceThresholdDb: -32,
  minSilenceDurationSec: 0.4,
};

let currentConfig: SilenceSkipperConfig = { ...DEFAULT_CONFIG };
let isAccelerating = false;

/**
 * Calculates adaptive target speed based on detected audio presence.
 * When silence is detected during lecture whiteboard writing or pauses,
 * smoothly ramps speed up to fastSpeed without audio clipping.
 */
export function calculateDynamicSpeed(
  volumeRmsDb: number,
  config: SilenceSkipperConfig = currentConfig
): number {
  if (!config.enabled) return config.baseSpeed;

  const isSilent = volumeRmsDb < config.silenceThresholdDb;
  return isSilent ? config.fastSpeed : config.baseSpeed;
}

export async function setSilenceSkipperEnabled(
  enabled: boolean,
  baseSpeed = 1.0,
  fastSpeed = 2.8
): Promise<void> {
  currentConfig.enabled = enabled;
  currentConfig.baseSpeed = baseSpeed;
  currentConfig.fastSpeed = fastSpeed;

  if (!enabled) {
    isAccelerating = false;
    try {
      await invoke("mpv_set_property", { name: "speed", value: baseSpeed });
    } catch {
      // ignore
    }
  }
}

export function getSilenceSkipperConfig(): SilenceSkipperConfig {
  return { ...currentConfig };
}

export async function stepDynamicSpeed(isSilent: boolean): Promise<void> {
  if (!currentConfig.enabled) return;

  if (isSilent && !isAccelerating) {
    isAccelerating = true;
    try {
      await invoke("mpv_set_property", { name: "speed", value: currentConfig.fastSpeed });
    } catch {
      // ignore
    }
  } else if (!isSilent && isAccelerating) {
    isAccelerating = false;
    try {
      await invoke("mpv_set_property", { name: "speed", value: currentConfig.baseSpeed });
    } catch {
      // ignore
    }
  }
}
