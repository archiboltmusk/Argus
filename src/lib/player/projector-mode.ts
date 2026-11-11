/**
 * Projector Display & Hardware Optimization Profile
 *
 * Specifically tuned for budget Android smart LED projectors (e.g. Portronics Beem 470 / 410,
 * Egate, Wanbo, Zebronics, Magcubic HY300/320, XGIMI, Dangbei) running Android 9/11/12 on 1GB - 2GB RAM SoCs.
 *
 * Addresses key projector constraints:
 * 1. Low contrast / washed-out projection on white walls: boosts midtone contrast & gamma.
 * 2. Keystone edge clipping: provides safe-area overscan insets (4% - 10%).
 * 3. Subtitle legibility: forces high-contrast thick outline & anti-glare amber styling.
 * 4. Memory footprint: activates low-RAM mode (<110MB) to prevent Android out-of-memory crashes.
 */

export interface ProjectorDisplayConfig {
  enabled: boolean;
  projectorModelHint?: string; // e.g. "Portronics Beem 470"
  contrastBoost: number;
  gammaLift: number;
  highContrastSubtitles: boolean;
  overscanInsetPercent: number; // 0 - 10%
  lowMemoryFootprint: boolean;
  wallColorTint?: "white" | "ivory" | "cool-grey" | "peach" | "green";
}

export const DEFAULT_PROJECTOR_CONFIG: ProjectorDisplayConfig = {
  enabled: false,
  projectorModelHint: "Portronics Beem 470 / Basic Projector",
  contrastBoost: 8,
  gammaLift: 2,
  highContrastSubtitles: true,
  overscanInsetPercent: 5,
  lowMemoryFootprint: true,
  wallColorTint: "white",
};

const PROJECTOR_KEYWORDS = [
  "portronics",
  "beem",
  "beem 470",
  "wanbo",
  "egate",
  "zebronics",
  "xgimi",
  "nebula",
  "dangbei",
  "magcubic",
  "hy300",
  "hy320",
  "toptro",
  "projector",
];

/**
 * Detects whether the current device is a smart projector from user agent or model strings.
 */
export function isBudgetProjectorDevice(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""): boolean {
  if (!userAgent) return false;
  const lower = userAgent.toLowerCase();
  return PROJECTOR_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Helper to determine if projector mode should be actively applied.
 */
export function isProjectorModeActive(settings?: { projectorModeEnabled?: boolean }): boolean {
  if (settings?.projectorModeEnabled) return true;
  return isBudgetProjectorDevice();
}

/**
 * Returns mpv property overrides for projector display optimization.
 */
export function getProjectorMpvProperties(config: Partial<ProjectorDisplayConfig> = {}): Record<string, string> {
  const cfg = { ...DEFAULT_PROJECTOR_CONFIG, ...config };
  if (!cfg.enabled) return {};

  return {
    contrast: String(cfg.contrastBoost),
    gamma: String(cfg.gammaLift),
    // Fast deband to clean up cheap projector lens chromatic aberration
    deband: "yes",
    "deband-iterations": "2",
    "deband-threshold": "32",
    // Subtitle visibility on washed out projection walls
    "sub-font-size": "36",
    "sub-bold": "yes",
    "sub-outline-size": "4",
    "sub-color": "#FFF8E7", // warm high-visibility cream
    "sub-outline-color": "#000000",
  };
}

/**
 * Returns CSS filter string for HTML5 video element on projectors.
 */
export function getProjectorCssFilter(config: Partial<ProjectorDisplayConfig> = {}): string {
  const cfg = { ...DEFAULT_PROJECTOR_CONFIG, ...config };
  if (!cfg.enabled) return "";

  const contrastMult = 1 + cfg.contrastBoost / 40; // e.g. 8 -> 1.20
  const brightnessMult = 1 + cfg.gammaLift / 50;  // e.g. 2 -> 1.04
  let tintFilter = "";

  if (cfg.wallColorTint === "ivory") {
    tintFilter = "hue-rotate(-5deg) saturate(1.05)";
  } else if (cfg.wallColorTint === "cool-grey") {
    tintFilter = "brightness(1.08) saturate(1.12)";
  } else if (cfg.wallColorTint === "peach") {
    tintFilter = "hue-rotate(6deg) saturate(1.04)";
  }

  return `contrast(${contrastMult.toFixed(2)}) brightness(${brightnessMult.toFixed(2)}) saturate(1.08) ${tintFilter}`.trim();
}

/**
 * Generates CSS safe-area inset styles to compensate for physical keystone distortion.
 */
export function getProjectorKeystoneInsets(insetPercent = 5): {
  paddingTop: string;
  paddingBottom: string;
  paddingLeft: string;
  paddingRight: string;
} {
  const safe = Math.max(0, Math.min(12, insetPercent));
  return {
    paddingTop: `${safe}vh`,
    paddingBottom: `${safe}vh`,
    paddingLeft: `${safe}vw`,
    paddingRight: `${safe}vw`,
  };
}

/**
 * Returns memory-optimized Hls.js buffer options for low-RAM (1GB - 2GB) projector chipsets.
 */
export function getProjectorHlsOptions(): {
  maxBufferSize: number;
  maxBufferLength: number;
  maxMaxBufferLength: number;
  backBufferLength: number;
  enableWorker: boolean;
  lowLatencyMode: boolean;
} {
  return {
    maxBufferSize: 24 * 1024 * 1024, // 24 MB cache ceiling (prevents OOM kill)
    maxBufferLength: 20,              // 20s forward buffer
    maxMaxBufferLength: 40,
    backBufferLength: 8,
    enableWorker: true,
    lowLatencyMode: false,
  };
}
