export type PowerSaveProfile = {
  onBattery: boolean;
  batteryLevelPct: number;
  throttleShaders: boolean;
  maxFpsCap: number;
  hwdecProfile: "auto-safe" | "no-copy-fast";
  statusMessage: string;
};

/**
 * Optimizes playback and gaming decode pipeline based on laptop/handheld battery state.
 * Reduces GPU clock draw, disables heavy shaders (SVP/Anime4K), and engages power-saving decoders.
 */
export function evaluatePowerSaveProfile(
  onBattery: boolean,
  batteryLevelPct: number,
  userPowerSaveEnabled: boolean,
): PowerSaveProfile {
  if (!userPowerSaveEnabled || !onBattery) {
    return {
      onBattery,
      batteryLevelPct,
      throttleShaders: false,
      maxFpsCap: 120,
      hwdecProfile: "no-copy-fast",
      statusMessage: "AC Power connected. Maximum visual fidelity active.",
    };
  }

  const isLowBattery = batteryLevelPct < 25;

  return {
    onBattery: true,
    batteryLevelPct,
    throttleShaders: true,
    maxFpsCap: isLowBattery ? 30 : 60,
    hwdecProfile: "auto-safe",
    statusMessage: isLowBattery
      ? "⚠️ Low battery (<25%). Power-saver decoder and 30 FPS cap engaged."
      : "🔋 On battery power. High-efficiency hardware decode active.",
  };
}
