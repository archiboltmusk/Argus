/**
 * Real-Time Neural Super-Resolution (Anime4K + FSRCNNX)
 *
 * Configures high-performance GLSL neural compute shader pipelines in MPV.
 * Restores vintage 480p/720p anime and SD films to 4K UHD using deep convolutional
 * networks (FSRCNNX) and edge-gradient reconstruction (Anime4K).
 */

export type SuperResolutionProfile =
  | "off"
  | "anime4k-reconstruct"
  | "anime4k-line-clamp"
  | "fsrcnnx-texture-16"
  | "retro-crt-film";

export interface SuperResolutionConfig {
  profile: SuperResolutionProfile;
  autoEnableForSdOnly: boolean; // Only upscale if video height <= 720p or 1080p
  maxUpscaleResolution: 1080 | 1440 | 2160;
  sharpnessStrength: number; // 0.0 to 1.0
  debandPrepass: boolean;
}

const STORAGE_KEY = "argus.shaders.neural_superres.v1";

const DEFAULT_CONFIG: SuperResolutionConfig = {
  profile: "off",
  autoEnableForSdOnly: true,
  maxUpscaleResolution: 2160,
  sharpnessStrength: 0.65,
  debandPrepass: true,
};

let configCache: SuperResolutionConfig | null = null;
const listeners = new Set<(cfg: SuperResolutionConfig) => void>();

export function getSuperResolutionConfig(): SuperResolutionConfig {
  if (configCache) return configCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    configCache = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    configCache = { ...DEFAULT_CONFIG };
  }
  return configCache ?? DEFAULT_CONFIG;
}

export function updateSuperResolutionConfig(
  patch: Partial<SuperResolutionConfig>,
): SuperResolutionConfig {
  const current = getSuperResolutionConfig();
  configCache = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configCache));
  } catch {}
  notifyListeners();
  return configCache;
}

export function subscribeSuperResolution(
  fn: (cfg: SuperResolutionConfig) => void,
): () => void {
  listeners.add(fn);
  fn(getSuperResolutionConfig());
  return () => {
    listeners.delete(fn);
  };
}

function notifyListeners(): void {
  const cfg = getSuperResolutionConfig();
  for (const fn of listeners) {
    try {
      fn(cfg);
    } catch {}
  }
}

/**
 * Checks whether the current video stream requires neural upscaling based on resolution.
 */
export function shouldApplyNeuralUpscale(
  videoHeight: number,
  config: SuperResolutionConfig = getSuperResolutionConfig(),
): boolean {
  if (config.profile === "off") return false;
  if (!config.autoEnableForSdOnly) return true;
  // Apply if video resolution is 1080p or below and targeting higher display res
  return videoHeight <= 1080;
}

/**
 * Builds the MPV shader file paths and deband properties.
 */
export function buildSuperResolutionMpvCommands(
  videoHeight: number = 720,
  config: SuperResolutionConfig = getSuperResolutionConfig(),
): Array<{ name: string; value: string }> {
  if (!shouldApplyNeuralUpscale(videoHeight, config)) {
    return [
      { name: "glsl-shaders", value: "" },
      { name: "deband", value: "no" },
    ];
  }

  const commands: Array<{ name: string; value: string }> = [];

  if (config.debandPrepass) {
    commands.push({ name: "deband", value: "yes" });
    commands.push({ name: "deband-iterations", value: "2" });
    commands.push({ name: "deband-threshold", value: "35" });
  }

  const shaderChain: string[] = [];

  switch (config.profile) {
    case "anime4k-reconstruct":
      shaderChain.push("~~/shaders/Anime4K_Clamp_Highlights.glsl");
      shaderChain.push("~~/shaders/Anime4K_Restore_CNN_VL.glsl");
      shaderChain.push("~~/shaders/Anime4K_Upscale_CNN_x2_VL.glsl");
      shaderChain.push("~~/shaders/Anime4K_AutoDownscalePre_x2.glsl");
      break;

    case "anime4k-line-clamp":
      shaderChain.push("~~/shaders/Anime4K_Clamp_Highlights.glsl");
      shaderChain.push("~~/shaders/Anime4K_Thin_HQ.glsl");
      shaderChain.push("~~/shaders/Anime4K_Upscale_Denoise_CNN_x2_M.glsl");
      break;

    case "fsrcnnx-texture-16":
      shaderChain.push("~~/shaders/FSRCNNX_x2_16-0-4-1.glsl");
      shaderChain.push("~~/shaders/ssimdownscaler.glsl");
      break;

    case "retro-crt-film":
      shaderChain.push("~~/shaders/crt-geom.glsl");
      shaderChain.push("~~/shaders/film-grain.glsl");
      break;

    case "off":
    default:
      break;
  }

  commands.push({
    name: "glsl-shaders",
    value: shaderChain.join(":"),
  });

  return commands;
}
