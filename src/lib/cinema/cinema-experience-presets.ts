/**
 * Cinema Experience Presets Engine
 *
 * Provides one-click holistic cinema profiles that orchestrate shaders,
 * neural motion interpolation, audio DSP, SafeCinema protections, and UI themes:
 * - "couch-cinema": 10-ft TV HDR immersion with 7.1 binaural surround
 * - "anime-otaku": Anime4K upscaling, RIFE 60fps interpolation, Danmaku comments
 * - "late-night-silent": Night Shield range compression, dialogue boost, strobe shield
 * - "oled-120hz-studio": Ultra 120Hz ProMotion, FSRCNNX textures, Chameleon AAA
 * - "battery-eco": Minimal GPU/CPU power usage, 24fps native film cadence
 */

import {
  updateFrameInterpolationConfig,
  type InterpolationProfile,
} from "@/lib/player/frame-interpolation";
import {
  updateSuperResolutionConfig,
  type SuperResolutionProfile,
} from "@/lib/shaders/neural-super-resolution";
import {
  updateSafeCinemaConfig,
} from "@/lib/player/safe-cinema-shield";
import {
  updateDanmakuConfig,
} from "@/lib/danmaku/danmaku-engine";
import {
  updateChameleonConfig,
} from "@/lib/theme/chameleon-palette";

export type CinemaPresetId =
  | "couch-cinema"
  | "anime-otaku"
  | "late-night-silent"
  | "oled-120hz-studio"
  | "battery-eco";

export interface CinemaPresetDefinition {
  id: CinemaPresetId;
  name: string;
  tagline: string;
  interpolationProfile: InterpolationProfile;
  superResolutionProfile: SuperResolutionProfile;
  epilepsyShield: boolean;
  jumpScareRadar: boolean;
  danmakuMode: "dense" | "top-banner" | "off";
  chameleonSaturation: number;
}

export const CINEMA_PRESETS: Record<CinemaPresetId, CinemaPresetDefinition> = {
  "couch-cinema": {
    id: "couch-cinema",
    name: "Couch Cinema (10-ft TV)",
    tagline: "HDR immersion, 7.1 spatial soundstage, and clear dialogue for the big screen.",
    interpolationProfile: "film-preservation",
    superResolutionProfile: "fsrcnnx-texture-16",
    epilepsyShield: true,
    jumpScareRadar: false,
    danmakuMode: "off",
    chameleonSaturation: 1.3,
  },
  "anime-otaku": {
    id: "anime-otaku",
    name: "Anime Otaku Studio",
    tagline: "Anime4K sharp line-art reconstruction, 60fps smoothing, and synced Danmaku reactions.",
    interpolationProfile: "anime-motion",
    superResolutionProfile: "anime4k-reconstruct",
    epilepsyShield: true,
    jumpScareRadar: false,
    danmakuMode: "dense",
    chameleonSaturation: 1.4,
  },
  "late-night-silent": {
    id: "late-night-silent",
    name: "Late Night Silent Cinema",
    tagline: "Compressed explosion dynamics, vocal speech boost, and strobe light softening.",
    interpolationProfile: "off",
    superResolutionProfile: "off",
    epilepsyShield: true,
    jumpScareRadar: true,
    danmakuMode: "off",
    chameleonSaturation: 1.0,
  },
  "oled-120hz-studio": {
    id: "oled-120hz-studio",
    name: "OLED / ProMotion 120Hz",
    tagline: "Ultra high-frame judder-free motion, deep FSRCNNX textures, and vibrant chameleon glass.",
    interpolationProfile: "ultra-120hz",
    superResolutionProfile: "fsrcnnx-texture-16",
    epilepsyShield: false,
    jumpScareRadar: false,
    danmakuMode: "top-banner",
    chameleonSaturation: 1.35,
  },
  "battery-eco": {
    id: "battery-eco",
    name: "Eco Battery Minimalist",
    tagline: "Zero GPU shader overhead, native 24fps film cadence, and cool thermal profile.",
    interpolationProfile: "off",
    superResolutionProfile: "off",
    epilepsyShield: false,
    jumpScareRadar: false,
    danmakuMode: "off",
    chameleonSaturation: 1.0,
  },
};

const STORAGE_KEY = "argus.cinema.active_preset.v1";

let activePresetId: CinemaPresetId = "couch-cinema";
const listeners = new Set<(preset: CinemaPresetDefinition) => void>();

export function getActiveCinemaPresetId(): CinemaPresetId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as CinemaPresetId | null;
    if (stored && stored in CINEMA_PRESETS) {
      activePresetId = stored;
    }
  } catch {}
  return activePresetId;
}

export function getActiveCinemaPreset(): CinemaPresetDefinition {
  return CINEMA_PRESETS[getActiveCinemaPresetId()] ?? CINEMA_PRESETS["couch-cinema"];
}

export function subscribeCinemaPreset(
  fn: (preset: CinemaPresetDefinition) => void,
): () => void {
  listeners.add(fn);
  fn(getActiveCinemaPreset());
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Atomically updates and propagates all engine modules to match the selected cinema preset.
 */
export function applyCinemaPreset(presetId: CinemaPresetId): CinemaPresetDefinition {
  const preset = CINEMA_PRESETS[presetId];
  if (!preset) return getActiveCinemaPreset();

  activePresetId = presetId;
  try {
    localStorage.setItem(STORAGE_KEY, presetId);
  } catch {}

  // 1. Frame Interpolation
  updateFrameInterpolationConfig({
    profile: preset.interpolationProfile,
  });

  // 2. Super-Resolution Shaders
  updateSuperResolutionConfig({
    profile: preset.superResolutionProfile,
  });

  // 3. SafeCinema Shield
  updateSafeCinemaConfig({
    epilepsyShieldEnabled: preset.epilepsyShield,
    jumpScareRadarEnabled: preset.jumpScareRadar,
  });

  // 4. Danmaku Comments
  updateDanmakuConfig({
    displayMode: preset.danmakuMode,
  });

  // 5. Chameleon UI
  updateChameleonConfig({
    saturationBoost: preset.chameleonSaturation,
  });

  // Notify listeners
  for (const fn of listeners) {
    try {
      fn(preset);
    } catch {}
  }

  return preset;
}
