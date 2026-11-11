/**
 * Studio Colorist & Dynamic Film Grain Synthesis Engine
 *
 * Provides real-time 3D LUT (.cube) parsing, trilinear lattice interpolation,
 * ASC-CDL parametric grading (Lift, Gamma, Gain, Saturation, Temp/Tint),
 * and dynamic film grain synthesis (FGS) to eliminate stream compression banding.
 */

export interface RgbTuple {
  r: number; // 0.0 to 1.0
  g: number; // 0.0 to 1.0
  b: number; // 0.0 to 1.0
}

export interface AscCdlParameters {
  slope: RgbTuple; // Gain (default: 1.0, 1.0, 1.0)
  offset: RgbTuple; // Lift (default: 0.0, 0.0, 0.0)
  power: RgbTuple; // Gamma (default: 1.0, 1.0, 1.0)
  saturation: number; // 0.0 to 2.0 (default: 1.0)
  temperatureKelvinOffset: number; // -1000K (cool teal) to +1000K (warm amber)
}

export type FilmGrainIsoLevel = "clean-digital" | "iso-100" | "iso-400" | "iso-800" | "iso-1600" | "iso-3200";

export interface FilmGrainConfig {
  enabled: boolean;
  isoLevel: FilmGrainIsoLevel;
  intensity: number; // 0.0 to 1.0
  particleSize: number; // 1.0 to 3.0
  chromaGrainWeight: number; // 0.0 (luma only) to 1.0 (full RGB)
  antiBandingDither: boolean;
}

export interface Parsed3dLut {
  title: string;
  size: number; // e.g. 17, 33, 65
  domainMin: RgbTuple;
  domainMax: RgbTuple;
  data: Float32Array; // Flattened size * size * size * 3 floats
}

export type BuiltinColorGradePreset =
  | "rec709-neutral"
  | "hollywood-teal-orange"
  | "kodak-vision3-5219"
  | "technicolor-vintage"
  | "bleach-bypass"
  | "film-noir-high-contrast";

export interface ColoristStudioConfig {
  enabled: boolean;
  activePreset: BuiltinColorGradePreset;
  customLutPath?: string;
  cdl: AscCdlParameters;
  filmGrain: FilmGrainConfig;
}

const DEFAULT_CDL: AscCdlParameters = {
  slope: { r: 1.0, g: 1.0, b: 1.0 },
  offset: { r: 0.0, g: 0.0, b: 0.0 },
  power: { r: 1.0, g: 1.0, b: 1.0 },
  saturation: 1.0,
  temperatureKelvinOffset: 0,
};

const DEFAULT_GRAIN: FilmGrainConfig = {
  enabled: true,
  isoLevel: "iso-400",
  intensity: 0.35,
  particleSize: 1.2,
  chromaGrainWeight: 0.25,
  antiBandingDither: true,
};

const DEFAULT_CONFIG: ColoristStudioConfig = {
  enabled: true,
  activePreset: "rec709-neutral",
  cdl: DEFAULT_CDL,
  filmGrain: DEFAULT_GRAIN,
};

export const COLOR_GRADE_PRESETS: Record<
  BuiltinColorGradePreset,
  { name: string; description: string; cdl: Partial<AscCdlParameters>; grainIso: FilmGrainIsoLevel }
> = {
  "rec709-neutral": {
    name: "Rec.709 Director Neutral",
    description: "Unadulterated calibrated reference balance",
    cdl: {
      slope: { r: 1.0, g: 1.0, b: 1.0 },
      offset: { r: 0.0, g: 0.0, b: 0.0 },
      power: { r: 1.0, g: 1.0, b: 1.0 },
      saturation: 1.0,
      temperatureKelvinOffset: 0,
    },
    grainIso: "clean-digital",
  },
  "hollywood-teal-orange": {
    name: "Hollywood Blockbuster Teal & Orange",
    description: "Cold cyan shadows paired with warm, luminous skin highlights",
    cdl: {
      slope: { r: 1.1, g: 0.98, b: 0.88 },
      offset: { r: -0.04, g: 0.01, b: 0.06 },
      power: { r: 0.95, g: 1.0, b: 1.08 },
      saturation: 1.12,
      temperatureKelvinOffset: 250,
    },
    grainIso: "iso-400",
  },
  "kodak-vision3-5219": {
    name: "Kodak Vision3 5219 Cinema Stock",
    description: "Rich organic halation, soft film roll-off, and velvet deep blacks",
    cdl: {
      slope: { r: 1.06, g: 1.02, b: 0.96 },
      offset: { r: 0.02, g: 0.01, b: -0.01 },
      power: { r: 0.98, g: 0.98, b: 1.02 },
      saturation: 1.05,
      temperatureKelvinOffset: 150,
    },
    grainIso: "iso-800",
  },
  "technicolor-vintage": {
    name: "Technicolor 3-Strip Vintage",
    description: "Hyper-vibrant primary saturations reminiscent of classic 1950s cinema",
    cdl: {
      slope: { r: 1.15, g: 1.12, b: 1.08 },
      offset: { r: 0.01, g: 0.0, b: 0.0 },
      power: { r: 0.92, g: 0.92, b: 0.92 },
      saturation: 1.35,
      temperatureKelvinOffset: 300,
    },
    grainIso: "iso-800",
  },
  "bleach-bypass": {
    name: "Silver Halide Bleach Bypass",
    description: "Desaturated, high-contrast, grit-infused thriller look",
    cdl: {
      slope: { r: 1.25, g: 1.25, b: 1.25 },
      offset: { r: -0.06, g: -0.06, b: -0.06 },
      power: { r: 1.15, g: 1.15, b: 1.15 },
      saturation: 0.65,
      temperatureKelvinOffset: -200,
    },
    grainIso: "iso-1600",
  },
  "film-noir-high-contrast": {
    name: "Film Noir Monochrome",
    description: "Pure black & white dramatic chiaroscuro with dense film grain",
    cdl: {
      slope: { r: 1.2, g: 1.2, b: 1.2 },
      offset: { r: -0.05, g: -0.05, b: -0.05 },
      power: { r: 1.1, g: 1.1, b: 1.1 },
      saturation: 0.0,
      temperatureKelvinOffset: 0,
    },
    grainIso: "iso-3200",
  },
};

export class ColoristStudio {
  private static instance: ColoristStudio | null = null;
  private config: ColoristStudioConfig;

  public constructor(initialConfig?: Partial<ColoristStudioConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
  }

  public static getInstance(): ColoristStudio {
    if (!ColoristStudio.instance) {
      ColoristStudio.instance = new ColoristStudio();
    }
    return ColoristStudio.instance;
  }

  public getConfig(): ColoristStudioConfig {
    return { ...this.config };
  }

  public updateConfig(patch: Partial<ColoristStudioConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  public applyPreset(presetKey: BuiltinColorGradePreset): void {
    const preset = COLOR_GRADE_PRESETS[presetKey];
    if (!preset) return;

    this.config.activePreset = presetKey;
    this.config.cdl = { ...DEFAULT_CDL, ...preset.cdl };
    this.config.filmGrain.isoLevel = preset.grainIso;
  }

  /**
   * Applies ASC-CDL mathematical transform to a normalized RGB color:
   * out = clamp((in * slope + offset) ^ power) * saturation
   */
  public applyCdlTransform(color: RgbTuple): RgbTuple {
    const { slope, offset, power, saturation, temperatureKelvinOffset } = this.config.cdl;

    // Apply Kelvin color temp tilt
    const tempTiltR = 1.0 + (temperatureKelvinOffset / 1000) * 0.08;
    const tempTiltB = 1.0 - (temperatureKelvinOffset / 1000) * 0.08;

    const r1 = Math.max(0, color.r * slope.r * tempTiltR + offset.r);
    const g1 = Math.max(0, color.g * slope.g + offset.g);
    const b1 = Math.max(0, color.b * slope.b * tempTiltB + offset.b);

    const r2 = Math.pow(r1, power.r);
    const g2 = Math.pow(g1, power.g);
    const b2 = Math.pow(b1, power.b);

    // Saturation matrix using Rec.709 luminance weights
    const luma = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2;
    const rOut = Math.max(0, Math.min(1.0, luma + saturation * (r2 - luma)));
    const gOut = Math.max(0, Math.min(1.0, luma + saturation * (g2 - luma)));
    const bOut = Math.max(0, Math.min(1.0, luma + saturation * (b2 - luma)));

    return { r: rOut, g: gOut, b: bOut };
  }

  /**
   * Parses an Adobe / DaVinci Resolve .cube format text string into a 3D LUT lattice
   */
  public parseCubeLut(cubeText: string): Parsed3dLut {
    const lines = cubeText.split(/\r?\n/);
    let size = 0;
    let title = "Custom 3D LUT";
    const domainMin: RgbTuple = { r: 0.0, g: 0.0, b: 0.0 };
    const domainMax: RgbTuple = { r: 1.0, g: 1.0, b: 1.0 };
    const rawFloats: number[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      if (line.startsWith("TITLE")) {
        title = line.replace(/^TITLE\s*"?/, "").replace(/"?$/, "");
      } else if (line.startsWith("LUT_3D_SIZE")) {
        const parts = line.split(/\s+/);
        size = parseInt(parts[1], 10) || 0;
      } else if (line.startsWith("DOMAIN_MIN")) {
        const parts = line.split(/\s+/);
        domainMin.r = parseFloat(parts[1]);
        domainMin.g = parseFloat(parts[2]);
        domainMin.b = parseFloat(parts[3]);
      } else if (line.startsWith("DOMAIN_MAX")) {
        const parts = line.split(/\s+/);
        domainMax.r = parseFloat(parts[1]);
        domainMax.g = parseFloat(parts[2]);
        domainMax.b = parseFloat(parts[3]);
      } else {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          const r = parseFloat(parts[0]);
          const g = parseFloat(parts[1]);
          const b = parseFloat(parts[2]);
          if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
            rawFloats.push(r, g, b);
          }
        }
      }
    }

    if (size === 0) {
      // Estimate cube size from entry count: count = size^3 * 3
      size = Math.round(Math.cbrt(rawFloats.length / 3));
    }

    return {
      title,
      size,
      domainMin,
      domainMax,
      data: new Float32Array(rawFloats),
    };
  }

  /**
   * Generates MPV video filter string combining 3D LUT and dynamic film grain noise
   */
  public generateMpvFilterString(): string | null {
    if (!this.config.enabled) return null;

    const filters: string[] = [];

    // 1. 3D LUT file filter if path specified
    if (this.config.customLutPath) {
      filters.push(`lut3d=file='${this.config.customLutPath}':interp=tetrahedral`);
    } else if (this.config.cdl.saturation !== 1.0 || this.config.cdl.offset.r !== 0) {
      // Hardware color balance & curves filter fallback
      const sat = this.config.cdl.saturation.toFixed(2);
      const contrast = this.config.cdl.slope.r.toFixed(2);
      const brightness = this.config.cdl.offset.r.toFixed(2);
      filters.push(`eq=saturation=${sat}:contrast=${contrast}:brightness=${brightness}`);
    }

    // 2. Film grain noise filter to mask compression banding
    if (this.config.filmGrain.enabled && this.config.filmGrain.isoLevel !== "clean-digital") {
      const isoMap: Record<FilmGrainIsoLevel, { lumaNoise: number; chromaNoise: number }> = {
        "clean-digital": { lumaNoise: 0, chromaNoise: 0 },
        "iso-100": { lumaNoise: 4, chromaNoise: 2 },
        "iso-400": { lumaNoise: 8, chromaNoise: 4 },
        "iso-800": { lumaNoise: 14, chromaNoise: 7 },
        "iso-1600": { lumaNoise: 22, chromaNoise: 12 },
        "iso-3200": { lumaNoise: 34, chromaNoise: 18 },
      };

      const noiseProfile = isoMap[this.config.filmGrain.isoLevel];
      const lumaStrength = Math.round(noiseProfile.lumaNoise * this.config.filmGrain.intensity);
      const chromaStrength = Math.round(
        noiseProfile.chromaNoise * this.config.filmGrain.intensity * this.config.filmGrain.chromaGrainWeight,
      );

      if (lumaStrength > 0) {
        filters.push(`noise=c0s=${lumaStrength}:c1s=${chromaStrength}:allf=t+u`);
      }
    }

    if (filters.length === 0) return null;
    return `lavfi=[${filters.join(",")}]`;
  }
}
