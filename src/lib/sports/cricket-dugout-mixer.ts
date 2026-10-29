export type AudioMixBalance = {
  videoVolume: number; // 0.0 to 1.0 (ambient crowd & bat sounds)
  radioVolume: number; // 0.0 to 1.0 (commentary voice)
};

/**
 * Manages dual-audio channeling: allows keeping the video stream's ambient stadium
 * sound (cheers, bat on ball) while overlaying clear regional radio commentary.
 */
export function calculateDugoutMix(
  balanceSlider: number, // -100 (100% video) to +100 (100% radio)
  masterMuted: boolean = false,
): AudioMixBalance {
  if (masterMuted) return { videoVolume: 0, radioVolume: 0 };

  // Slider = 0 -> 70% video crowd + 90% radio voice
  const norm = Math.max(-100, Math.min(100, balanceSlider)) / 100;
  let videoVolume = 0.65;
  let radioVolume = 0.85;

  if (norm < 0) {
    // Favor video stream crowd
    videoVolume = Math.min(1, 0.65 + Math.abs(norm) * 0.35);
    radioVolume = Math.max(0, 0.85 - Math.abs(norm) * 0.85);
  } else if (norm > 0) {
    // Favor radio commentary
    videoVolume = Math.max(0, 0.65 - norm * 0.65);
    radioVolume = Math.min(1, 0.85 + norm * 0.15);
  }

  return {
    videoVolume: Number(videoVolume.toFixed(2)),
    radioVolume: Number(radioVolume.toFixed(2)),
  };
}
