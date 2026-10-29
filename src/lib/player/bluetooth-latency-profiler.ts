/**
 * Bluetooth Headphone Latency Auto-Profiler
 *
 * Affordable Indian TWS earbuds (boAt Airdopes, Noise Buds, Boult Audio, Realme, OnePlus)
 * typically suffer from 160ms - 260ms audio latency over standard SBC/AAC codecs on PCs & Macs.
 *
 * This profiler detects the connected audio device and applies calibrated negative audio-delay
 * offsets (e.g. `audio-delay = -0.200s`) so movie dialogue, songs, and cricket commentary
 * lipsync with frame-perfect precision without tedious manual calibration.
 */

export interface BluetoothHeadphonePreset {
  brand: string;
  matchPattern: RegExp;
  latencyMs: number;
  recommendedCodec: "SBC" | "AAC" | "aptX" | "LDAC";
  description: string;
}

export const BLUETOOTH_HEADPHONE_PRESETS: BluetoothHeadphonePreset[] = [
  {
    brand: "boAt",
    matchPattern: /boat|airdopes|rockerz|nirvana/i,
    latencyMs: 220,
    recommendedCodec: "AAC",
    description: "boAt Airdopes / Rockerz (~220ms latency)",
  },
  {
    brand: "Noise",
    matchPattern: /noise|shots|colorfit/i,
    latencyMs: 200,
    recommendedCodec: "AAC",
    description: "Noise Buds (~200ms latency)",
  },
  {
    brand: "Boult",
    matchPattern: /boult|airbass|probass/i,
    latencyMs: 240,
    recommendedCodec: "SBC",
    description: "Boult Audio AirBass (~240ms latency)",
  },
  {
    brand: "Realme",
    matchPattern: /realme|dizo/i,
    latencyMs: 180,
    recommendedCodec: "AAC",
    description: "Realme Buds / Dizo (~180ms latency)",
  },
  {
    brand: "OnePlus",
    matchPattern: /oneplus|bullets|nord\s?buds/i,
    latencyMs: 160,
    recommendedCodec: "AAC",
    description: "OnePlus Nord Buds / Bullets Wireless (~160ms latency)",
  },
  {
    brand: "Generic Bluetooth",
    matchPattern: /bluetooth|tws|headset|earphones/i,
    latencyMs: 200,
    recommendedCodec: "SBC",
    description: "Standard Bluetooth Audio Output (~200ms default)",
  },
];

/**
 * Resolves the optimal audio delay in seconds (negative offset) for the detected headphone name.
 */
export function resolveBluetoothAudioDelaySec(deviceName: string | undefined | null): number {
  if (!deviceName) return 0;
  const match = BLUETOOTH_HEADPHONE_PRESETS.find((preset) => preset.matchPattern.test(deviceName));
  if (!match) return 0;

  // Delay should be negative to pull audio forward in time and match the video
  return -(match.latencyMs / 1000);
}
