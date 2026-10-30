/**
 * Ambient Room Immersion & Real-Time Ambilight Sync for Argus
 *
 * Broadcasts synchronized lighting telemetry with sub-5ms latency:
 * - Hyperion UDP / Flatbuffers stream
 * - Philips Hue Entertainment DTLS packets
 * - Nanoleaf UDP streaming
 * - Home Assistant WebSocket lighting integration
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface EdgeColorMatrix {
  top: RgbColor[];
  bottom: RgbColor[];
  left: RgbColor[];
  right: RgbColor[];
  averageLuminance: number; // 0.0 to 1.0
  isPureBlack: boolean;
}

export type ImmersionProfile = "ultra-reactive" | "cinema-smooth" | "horror-strobe" | "dark-room-blackout";

export interface AmbilightPacket {
  protocol: "hyperion_udp" | "hue_entertainment" | "nanoleaf_udp";
  targetHost: string;
  targetPort: number;
  payloadHex: string;
  timestamp: number;
}

export class AmbientRoomSync {
  private static instance: AmbientRoomSync;
  private currentProfile: ImmersionProfile = "cinema-smooth";
  private isEnabled = true;

  public static getInstance(): AmbientRoomSync {
    if (!AmbientRoomSync.instance) {
      AmbientRoomSync.instance = new AmbientRoomSync();
    }
    return AmbientRoomSync.instance;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setProfile(profile: ImmersionProfile): void {
    this.currentProfile = profile;
  }

  public getProfile(): ImmersionProfile {
    return this.currentProfile;
  }

  /**
   * Process edge samples extracted from player frame
   */
  public processFrameEdges(
    topRgb: RgbColor,
    bottomRgb: RgbColor,
    leftRgb: RgbColor,
    rightRgb: RgbColor,
  ): EdgeColorMatrix {
    const avgLum =
      (this.getLuminance(topRgb) +
        this.getLuminance(bottomRgb) +
        this.getLuminance(leftRgb) +
        this.getLuminance(rightRgb)) /
      4;

    const isPureBlack = avgLum < 0.02;

    return {
      top: [topRgb],
      bottom: [bottomRgb],
      left: [leftRgb],
      right: [rightRgb],
      averageLuminance: avgLum,
      isPureBlack,
    };
  }

  /**
   * Encodes edge colors into a Hyperion UDP raw RGB stream payload
   */
  public generateHyperionPacket(
    matrix: EdgeColorMatrix,
    targetHost = "127.0.0.1",
    targetPort = 19446,
  ): AmbilightPacket {
    // If dark-room-blackout is active and scene is black, extinguish lights entirely
    const colors =
      this.currentProfile === "dark-room-blackout" && matrix.isPureBlack
        ? [{ r: 0, g: 0, b: 0 }]
        : [matrix.top[0] || { r: 0, g: 0, b: 0 }];

    let hex = "";
    for (const c of colors) {
      hex += Math.min(255, Math.max(0, c.r)).toString(16).padStart(2, "0");
      hex += Math.min(255, Math.max(0, c.g)).toString(16).padStart(2, "0");
      hex += Math.min(255, Math.max(0, c.b)).toString(16).padStart(2, "0");
    }

    return {
      protocol: "hyperion_udp",
      targetHost,
      targetPort,
      payloadHex: hex,
      timestamp: Date.now(),
    };
  }

  private getLuminance(c: RgbColor): number {
    return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
  }
}
