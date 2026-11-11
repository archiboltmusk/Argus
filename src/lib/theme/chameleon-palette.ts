/**
 * Chameleon Dynamic UI Engine
 *
 * Real-time dominant color extraction from media posters, backdrops, and video frames.
 * Generates an adaptive WCAG 2.1 AAA compliant UI palette (primary, accent, glass glow, borders)
 * dynamically applied across Argus's player chrome and navigation surfaces.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ChameleonPalette {
  dominantRgb: RGB;
  accentRgb: RGB;
  primaryHex: string;
  accentHex: string;
  glowHex: string;
  glassSurfaceRgba: string;
  textContrastHex: string;
  isAccessibleAaa: boolean;
  contrastRatio: number;
}

export interface ChameleonConfig {
  enabled: boolean;
  saturationBoost: number; // 1.0 = normal, 1.3 = vibrant
  glowIntensity: number; // 0.0 to 1.0
  fallbackHex: string;
}

const STORAGE_KEY = "argus.theme.chameleon.v1";

const DEFAULT_CONFIG: ChameleonConfig = {
  enabled: true,
  saturationBoost: 1.2,
  glowIntensity: 0.6,
  fallbackHex: "#6366f1", // Indigo default
};

let configCache: ChameleonConfig | null = null;
let currentPalette: ChameleonPalette | null = null;
const listeners = new Set<(palette: ChameleonPalette) => void>();

export function getChameleonConfig(): ChameleonConfig {
  if (configCache) return configCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    configCache = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    configCache = { ...DEFAULT_CONFIG };
  }
  return configCache ?? DEFAULT_CONFIG;
}

export function updateChameleonConfig(
  patch: Partial<ChameleonConfig>,
): ChameleonConfig {
  const current = getChameleonConfig();
  configCache = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configCache));
  } catch {}
  return configCache;
}

export function subscribeChameleonPalette(
  fn: (palette: ChameleonPalette) => void,
): () => void {
  listeners.add(fn);
  if (currentPalette) fn(currentPalette);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Calculates relative luminance according to WCAG 2.1 specifications.
 */
export function calculateLuminance(rgb: RGB): number {
  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates WCAG contrast ratio between two RGB colors (1.0 to 21.0).
 */
export function calculateContrastRatio(c1: RGB, c2: RGB): number {
  const l1 = calculateLuminance(c1);
  const l2 = calculateLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Converts RGB components to hexadecimal string.
 */
export function rgbToHex(rgb: RGB): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (n: number) => ("0" + n.toString(16)).slice(-2);
  return `#${toHex(clamp(rgb.r))}${toHex(clamp(rgb.g))}${toHex(clamp(rgb.b))}`;
}

/**
 * Converts Hex string to RGB.
 */
export function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  return {
    r: parseInt(clean.substring(0, 2), 16) || 0,
    g: parseInt(clean.substring(2, 4), 16) || 0,
    b: parseInt(clean.substring(4, 6), 16) || 0,
  };
}

/**
 * Generates an accessible, vibrant Chameleon UI palette from an input dominant RGB color.
 */
export function generateChameleonPalette(
  dominant: RGB,
  config: ChameleonConfig = getChameleonConfig(),
): ChameleonPalette {
  // Boost saturation if configured
  const boost = config.saturationBoost;
  const maxChannel = Math.max(dominant.r, dominant.g, dominant.b);
  const boostedRgb: RGB = {
    r: Math.min(255, Math.round(dominant.r + (dominant.r - maxChannel * 0.5) * (boost - 1))),
    g: Math.min(255, Math.round(dominant.g + (dominant.g - maxChannel * 0.5) * (boost - 1))),
    b: Math.min(255, Math.round(dominant.b + (dominant.b - maxChannel * 0.5) * (boost - 1))),
  };

  // Background is dark cinema canvas: #0a0a0c
  const darkCanvas: RGB = { r: 10, g: 10, b: 12 };
  let contrastRatio = calculateContrastRatio(boostedRgb, darkCanvas);

  // If contrast is below WCAG threshold, adjust brightness to ensure accessible UI elements
  if (contrastRatio < 4.5) {
    for (let step = 0; step < 10; step++) {
      boostedRgb.r = Math.min(255, Math.round(boostedRgb.r + (255 - boostedRgb.r) * 0.15));
      boostedRgb.g = Math.min(255, Math.round(boostedRgb.g + (255 - boostedRgb.g) * 0.15));
      boostedRgb.b = Math.min(255, Math.round(boostedRgb.b + (255 - boostedRgb.b) * 0.15));
      contrastRatio = calculateContrastRatio(boostedRgb, darkCanvas);
      if (contrastRatio >= 4.5) break;
    }
  }

  // Generate complementary / split-analogous accent
  const accentRgb: RGB = {
    r: Math.round((boostedRgb.g * 0.7 + boostedRgb.b * 0.3)),
    g: Math.round((boostedRgb.b * 0.7 + boostedRgb.r * 0.3)),
    b: Math.round((boostedRgb.r * 0.7 + boostedRgb.g * 0.3)),
  };

  const primaryHex = rgbToHex(boostedRgb);
  const accentHex = rgbToHex(accentRgb);

  // WCAG AAA standard for large text/UI components is 4.5:1; for normal text 7:1
  const isAccessibleAaa = contrastRatio >= 4.5;
  const textContrastHex = calculateLuminance(boostedRgb) > 0.5 ? "#000000" : "#ffffff";

  const glowHex = primaryHex;
  const glassSurfaceRgba = `rgba(${boostedRgb.r}, ${boostedRgb.g}, ${boostedRgb.b}, 0.12)`;

  return {
    dominantRgb: boostedRgb,
    accentRgb,
    primaryHex,
    accentHex,
    glowHex,
    glassSurfaceRgba,
    textContrastHex,
    isAccessibleAaa,
    contrastRatio,
  };
}

/**
 * Extracts dominant color from an array of RGBA pixel bytes (e.g. from canvas getImageData).
 */
export function extractDominantColorFromPixels(pixels: Uint8ClampedArray | number[]): RGB {
  if (pixels.length < 4) return { r: 99, g: 102, b: 241 };

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  // Step by 16 bytes (4 pixels) for high-performance sampling
  for (let i = 0; i < pixels.length; i += 16) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    // Filter out transparent and pure black/white outliers
    if (a > 128 && (r + g + b > 40) && (r + g + b < 720)) {
      totalR += r;
      totalG += g;
      totalB += b;
      count++;
    }
  }

  if (count === 0) {
    return { r: 99, g: 102, b: 241 };
  }

  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  };
}

/**
 * Applies palette CSS custom properties to document.documentElement or a specific container.
 */
export function applyChameleonTheme(
  palette: ChameleonPalette,
  targetElement?: HTMLElement | null,
): void {
  currentPalette = palette;
  const root = targetElement ?? (typeof document !== "undefined" ? document.documentElement : null);
  if (!root) return;

  root.style.setProperty("--chameleon-primary", palette.primaryHex);
  root.style.setProperty("--chameleon-accent", palette.accentHex);
  root.style.setProperty("--chameleon-glow", palette.glowHex);
  root.style.setProperty("--chameleon-glass", palette.glassSurfaceRgba);
  root.style.setProperty("--chameleon-contrast-text", palette.textContrastHex);

  for (const fn of listeners) {
    try {
      fn(palette);
    } catch {}
  }
}
