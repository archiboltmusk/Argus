/**
 * Reactive Ambilight & Smart Luminaire Sync Engine
 *
 * Real-time perimeter color extraction, perceptual Delta-E temporal smoothing,
 * negative lookahead latency compensation, and multi-protocol packet dispatch
 * for Philips Hue Entertainment (DTLS-UDP), Nanoleaf UDP, Razer Chroma, and Elgato.
 */

export interface RgbColor {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

export interface CieLabColor {
  l: number; // 0 - 100
  a: number; // -128 - 127
  b: number; // -128 - 127
}

export interface PerimeterEdgeZones {
  top: RgbColor[];
  bottom: RgbColor[];
  left: RgbColor[];
  right: RgbColor[];
  averageLuminance: number; // 0.0 - 1.0
  dominantColor: RgbColor;
}

export type AmbilightPreset =
  | "cinema-immersive"
  | "high-energy-action"
  | "gentle-warmth"
  | "blackout-oled";

export interface AmbilightDeviceTarget {
  id: string;
  name: string;
  protocol: "hue-entertainment" | "nanoleaf-udp" | "razer-chroma" | "elgato-keylight";
  host: string;
  port: number;
  channelIndex?: number;
  hardwareLatencyMs: number; // e.g. 35ms wireless bridge transmission lag
}

export interface ReactiveAmbilightConfig {
  enabled: boolean;
  preset: AmbilightPreset;
  smoothingFactor: number; // 0.0 (instant snap) to 0.95 (ultra-smooth slow fade)
  brightnessMultiplier: number; // 0.1 to 2.0
  blackoutThreshold: number; // 0.0 to 0.1 (luminance below which lights power down)
  lookaheadLatencyMs: number; // Compensates for bulb RF latency by reading ahead
  sampleDensityPerEdge: {
    horizontal: number; // e.g. 10 zones along top/bottom
    vertical: number; // e.g. 6 zones along left/right
  };
  targets: AmbilightDeviceTarget[];
}

export interface ProtocolPayload {
  protocol: AmbilightDeviceTarget["protocol"];
  targetHost: string;
  targetPort: number;
  binaryOrJson: Uint8Array | Record<string, unknown>;
  renderTimestamp: number;
}

const DEFAULT_CONFIG: ReactiveAmbilightConfig = {
  enabled: true,
  preset: "cinema-immersive",
  smoothingFactor: 0.65,
  brightnessMultiplier: 1.0,
  blackoutThreshold: 0.018,
  lookaheadLatencyMs: 40,
  sampleDensityPerEdge: {
    horizontal: 10,
    vertical: 6,
  },
  targets: [],
};

export class ReactiveAmbilightEngine {
  private static instance: ReactiveAmbilightEngine | null = null;
  private config: ReactiveAmbilightConfig;
  private previousEdgeState: PerimeterEdgeZones | null = null;

  public constructor(initialConfig?: Partial<ReactiveAmbilightConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
  }

  public static getInstance(): ReactiveAmbilightEngine {
    if (!ReactiveAmbilightEngine.instance) {
      ReactiveAmbilightEngine.instance = new ReactiveAmbilightEngine();
    }
    return ReactiveAmbilightEngine.instance;
  }

  public getConfig(): ReactiveAmbilightConfig {
    return { ...this.config };
  }

  public updateConfig(patch: Partial<ReactiveAmbilightConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  public addTarget(target: AmbilightDeviceTarget): void {
    this.config.targets = [...this.config.targets.filter((t) => t.id !== target.id), target];
  }

  public removeTarget(targetId: string): void {
    this.config.targets = this.config.targets.filter((t) => t.id !== targetId);
  }

  /**
   * Convert sRGB to Perceptual CIE Lab coordinates for uniform color distance calculations
   */
  public rgbToLab(rgb: RgbColor): CieLabColor {
    // Normalize and linearize sRGB
    const rLinear = this.pivotRgb(rgb.r / 255);
    const gLinear = this.pivotRgb(rgb.g / 255);
    const bLinear = this.pivotRgb(rgb.b / 255);

    // Convert to XYZ using D65 illuminant
    const x = (rLinear * 0.4124 + gLinear * 0.3576 + bLinear * 0.1805) / 0.95047;
    const y = (rLinear * 0.2126 + gLinear * 0.7152 + bLinear * 0.0722) / 1.0;
    const z = (rLinear * 0.0193 + gLinear * 0.1192 + bLinear * 0.9505) / 1.08883;

    const fx = this.pivotXyz(x);
    const fy = this.pivotXyz(y);
    const fz = this.pivotXyz(z);

    return {
      l: Math.max(0, 116 * fy - 16),
      a: 500 * (fx - fy),
      b: 200 * (fy - fz),
    };
  }

  private pivotRgb(c: number): number {
    return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
  }

  private pivotXyz(c: number): number {
    return c > 0.008856 ? Math.cbrt(c) : 7.787 * c + 16 / 116;
  }

  /**
   * Calculates perceptual color delta (CIE76 Delta E)
   */
  public deltaE(c1: RgbColor, c2: RgbColor): number {
    const lab1 = this.rgbToLab(c1);
    const lab2 = this.rgbToLab(c2);
    const dl = lab1.l - lab2.l;
    const da = lab1.a - lab2.a;
    const db = lab1.b - lab2.b;
    return Math.sqrt(dl * dl + da * da + db * db);
  }

  /**
   * Smooths incoming raw frame samples using Exponential Moving Average and delta clamping
   */
  public processEdgeSamples(rawZones: {
    top: RgbColor[];
    bottom: RgbColor[];
    left: RgbColor[];
    right: RgbColor[];
  }): PerimeterEdgeZones {
    const allColors = [...rawZones.top, ...rawZones.bottom, ...rawZones.left, ...rawZones.right];
    let totalLum = 0;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;

    for (const c of allColors) {
      const lum = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
      totalLum += lum;
      sumR += c.r;
      sumG += c.g;
      sumB += c.b;
    }

    const avgLum = allColors.length > 0 ? totalLum / allColors.length : 0;
    const dominant: RgbColor =
      allColors.length > 0
        ? {
            r: Math.round(sumR / allColors.length),
            g: Math.round(sumG / allColors.length),
            b: Math.round(sumB / allColors.length),
          }
        : { r: 0, g: 0, b: 0 };

    // Apply blackout cut if room is pitch dark
    const isBlackout = avgLum < this.config.blackoutThreshold;

    const smoothColor = (curr: RgbColor, prev?: RgbColor): RgbColor => {
      if (isBlackout) {
        return { r: 0, g: 0, b: 0 };
      }
      if (!prev) return curr;
      const alpha = 1.0 - this.config.smoothingFactor;
      return {
        r: Math.round(prev.r + (curr.r - prev.r) * alpha),
        g: Math.round(prev.g + (curr.g - prev.g) * alpha),
        b: Math.round(prev.b + (curr.b - prev.b) * alpha),
      };
    };

    const prev = this.previousEdgeState;
    const smoothed: PerimeterEdgeZones = {
      top: rawZones.top.map((c, i) => smoothColor(c, prev?.top[i])),
      bottom: rawZones.bottom.map((c, i) => smoothColor(c, prev?.bottom[i])),
      left: rawZones.left.map((c, i) => smoothColor(c, prev?.left[i])),
      right: rawZones.right.map((c, i) => smoothColor(c, prev?.right[i])),
      averageLuminance: isBlackout ? 0 : avgLum,
      dominantColor: isBlackout ? { r: 0, g: 0, b: 0 } : dominant,
    };

    this.previousEdgeState = smoothed;
    return smoothed;
  }

  /**
   * Dispatch lighting frames formatted for each configured ecosystem
   */
  public generateDispatches(
    zones: PerimeterEdgeZones,
    playbackTimeSec: number,
  ): ProtocolPayload[] {
    if (!this.config.enabled || this.config.targets.length === 0) {
      return [];
    }

    const results: ProtocolPayload[] = [];
    const now = Date.now();

    for (const target of this.config.targets) {
      const renderTimestamp = now + (this.config.lookaheadLatencyMs - target.hardwareLatencyMs);

      switch (target.protocol) {
        case "hue-entertainment": {
          // Philips Hue Entertainment DTLS format:
          // Header: "HueStream" (9 bytes) + Protocol version 2.0 (2 bytes) + Sequence (1 byte)
          // Followed by channel structs [Type (1), LightID_High (1), LightID_Low (1), R_Hi, R_Lo, G_Hi, G_Lo, B_Hi, B_Lo]
          const lightColor = zones.dominantColor;
          const header = new TextEncoder().encode("HueStream\x02\x00\x00");
          const payload = new Uint8Array(header.length + 9);
          payload.set(header, 0);

          // Channel frame for 16-bit color
          const offset = header.length;
          payload[offset + 0] = 0x00; // Type 0 = RGB
          payload[offset + 1] = 0x00;
          payload[offset + 2] = (target.channelIndex ?? 1) & 0xff;
          // Scale to 16-bit
          payload[offset + 3] = lightColor.r;
          payload[offset + 4] = lightColor.r;
          payload[offset + 5] = lightColor.g;
          payload[offset + 6] = lightColor.g;
          payload[offset + 7] = lightColor.b;
          payload[offset + 8] = lightColor.b;

          results.push({
            protocol: "hue-entertainment",
            targetHost: target.host,
            targetPort: target.port || 2100,
            binaryOrJson: payload,
            renderTimestamp,
          });
          break;
        }

        case "nanoleaf-udp": {
          // Nanoleaf UDP external control packet: [numPanels (2 bytes), panelId (2 bytes), r, g, b, white, transitionTime (2 bytes)]
          const color = zones.top[0] || zones.dominantColor;
          const buffer = new Uint8Array(9);
          buffer[0] = 0x00;
          buffer[1] = 0x01; // 1 panel
          buffer[2] = 0x00;
          buffer[3] = (target.channelIndex ?? 1) & 0xff;
          buffer[4] = color.r;
          buffer[5] = color.g;
          buffer[6] = color.b;
          buffer[7] = 0x00; // white
          buffer[8] = 0x01; // 100ms transition time

          results.push({
            protocol: "nanoleaf-udp",
            targetHost: target.host,
            targetPort: target.port || 60222,
            binaryOrJson: buffer,
            renderTimestamp,
          });
          break;
        }

        case "razer-chroma": {
          results.push({
            protocol: "razer-chroma",
            targetHost: target.host,
            targetPort: target.port || 12005,
            binaryOrJson: {
              effect: "CHROMA_CUSTOM",
              param: [
                [zones.left[0]?.r ?? 0, zones.left[0]?.g ?? 0, zones.left[0]?.b ?? 0],
                [zones.top[0]?.r ?? 0, zones.top[0]?.g ?? 0, zones.top[0]?.b ?? 0],
                [zones.right[0]?.r ?? 0, zones.right[0]?.g ?? 0, zones.right[0]?.b ?? 0],
                [zones.bottom[0]?.r ?? 0, zones.bottom[0]?.g ?? 0, zones.bottom[0]?.b ?? 0],
              ],
              timestamp: playbackTimeSec,
            },
            renderTimestamp,
          });
          break;
        }

        case "elgato-keylight": {
          // Elgato Key Light HTTP API payload
          const lumPct = Math.min(100, Math.round(zones.averageLuminance * 100 * this.config.brightnessMultiplier));
          results.push({
            protocol: "elgato-keylight",
            targetHost: target.host,
            targetPort: target.port || 9123,
            binaryOrJson: {
              numberOfLights: 1,
              lights: [
                {
                  on: lumPct > 2 ? 1 : 0,
                  brightness: Math.max(3, lumPct),
                  temperature: 344, // 2900K warm cinema ambiance
                },
              ],
            },
            renderTimestamp,
          });
          break;
        }
      }
    }

    return results;
  }
}
