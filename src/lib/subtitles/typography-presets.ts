/**
 * Cinema Typography & High-Contrast Style Presets
 *
 * Provides theater-grade subtitle typography presets (Netflix Cinema, OLED Amber,
 * Anime Fansub, Clean Minimal) with smart lower-third collision avoidance for MPV.
 */

export type SubtitlePresetName =
  | "netflix-cinema"
  | "oled-amber"
  | "anime-fansub"
  | "clean-minimal";

export interface SubtitleStylePreset {
  name: SubtitlePresetName;
  displayName: string;
  font: string;
  fontSize: number;
  color: string; // Hex (e.g. "#FFFFFF")
  borderWidth: number;
  borderColor: string;
  shadowOffset: number;
  shadowColor: string;
  backgroundColor: string; // Translucent hex or "none"
  marginV: number; // Vertical bottom margin in pixels
}

export const SUBTITLE_PRESETS: Record<SubtitlePresetName, SubtitleStylePreset> = {
  "netflix-cinema": {
    name: "netflix-cinema",
    displayName: "Netflix Cinema",
    font: "Inter, -apple-system, sans-serif",
    fontSize: 52,
    color: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#000000",
    shadowOffset: 0,
    shadowColor: "none",
    backgroundColor: "#B3000000", // 70% opacity translucent black backing box
    marginV: 48,
  },
  "oled-amber": {
    name: "oled-amber",
    displayName: "OLED Warm Amber",
    font: "Inter, sans-serif",
    fontSize: 54,
    color: "#FDE047", // Warm amber yellow
    borderWidth: 2.5,
    borderColor: "#000000",
    shadowOffset: 2,
    shadowColor: "#000000",
    backgroundColor: "none",
    marginV: 48,
  },
  "anime-fansub": {
    name: "anime-fansub",
    displayName: "Anime Stylized",
    font: "Trebuchet MS, sans-serif",
    fontSize: 56,
    color: "#FFFFFF",
    borderWidth: 3.5,
    borderColor: "#18181B",
    shadowOffset: 3,
    shadowColor: "#000000",
    backgroundColor: "none",
    marginV: 40,
  },
  "clean-minimal": {
    name: "clean-minimal",
    displayName: "Clean Minimal",
    font: "-apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 48,
    color: "#F4F4F5",
    borderWidth: 1.2,
    borderColor: "#27272A",
    shadowOffset: 1,
    shadowColor: "#000000",
    backgroundColor: "none",
    marginV: 44,
  },
};

/**
 * Calculates collision avoidance margin if lower-third graphics or letterbox bands are present.
 */
export function computeCollisionAvoidanceMargin(
  baseMarginV: number,
  hasLetterboxBands = false,
  hasLowerThirdGraphics = false,
): number {
  let margin = baseMarginV;
  if (hasLetterboxBands) {
    margin += 36; // Lift subtitles out of bottom black letterbox bar into video frame
  }
  if (hasLowerThirdGraphics) {
    margin += 70; // Lift above lower-third news tickers or title cards
  }
  return margin;
}

/**
 * Generates MPV property assignments for applying the chosen typography preset.
 */
export function buildMpvSubtitleProperties(
  presetName: SubtitlePresetName = "netflix-cinema",
  hasCollision = false,
): Array<{ name: string; value: string }> {
  const preset = SUBTITLE_PRESETS[presetName] ?? SUBTITLE_PRESETS["netflix-cinema"];
  const finalMarginV = computeCollisionAvoidanceMargin(preset.marginV, false, hasCollision);

  return [
    { name: "sub-font", value: preset.font },
    { name: "sub-font-size", value: String(preset.fontSize) },
    { name: "sub-color", value: preset.color },
    { name: "sub-border-size", value: String(preset.borderWidth) },
    { name: "sub-border-color", value: preset.borderColor },
    { name: "sub-shadow-offset", value: String(preset.shadowOffset) },
    { name: "sub-shadow-color", value: preset.shadowColor },
    { name: "sub-back-color", value: preset.backgroundColor },
    { name: "sub-margin-y", value: String(finalMarginV) },
  ];
}
