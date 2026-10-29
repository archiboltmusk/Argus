/**
 * Audio-Only Stream Mode
 *
 * Strips video tracks (`--vid=no`) to reduce streaming data footprint down to ~25 MB / hour.
 * Ideal for music concerts, talk shows, cricket radio commentary, or emergency mobile tethering.
 * On unlimited Wi-Fi broadband, automatically provides instant toggle without forced degradation.
 */

export interface AudioOnlyConfig {
  enabled: boolean;
  isUnlimitedBroadband: boolean;
  estimatedMbPerHour: number;
  dataSavedMbPerHour: number;
}

const VIDEO_HOURLY_MB_ESTIMATE = 1450; // standard 1080p stream
const AUDIO_ONLY_HOURLY_MB = 28; // high quality 64kbps-96kbps AAC / Opus

export function getAudioOnlyConfig(
  enabledSetting: boolean,
  isUnlimitedBroadband = true,
): AudioOnlyConfig {
  // If user explicitly requests audio only, enable it regardless of network
  const enabled = enabledSetting;
  const dataSavedMbPerHour = enabled ? VIDEO_HOURLY_MB_ESTIMATE - AUDIO_ONLY_HOURLY_MB : 0;

  return {
    enabled,
    isUnlimitedBroadband,
    estimatedMbPerHour: enabled ? AUDIO_ONLY_HOURLY_MB : VIDEO_HOURLY_MB_ESTIMATE,
    dataSavedMbPerHour,
  };
}

/**
 * Returns mpv flags needed to run stream in strict audio-only mode.
 */
export function getAudioOnlyMpvArgs(enabled: boolean): string[] {
  if (!enabled) return [];
  return [
    "--vid=no",
    "--audio-display=no",
    "--vd-lavc-skiploopfilter=all",
  ];
}
