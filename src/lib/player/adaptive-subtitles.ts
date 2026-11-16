/**
 * HDR OLED Glare-Buster & Scene-Adaptive Subtitle Engine
 * Dynamically prevents eye strain on OLED / Mini-LED displays by scaling subtitle brightness
 * and color tinting to match the real-time luminance and color grade of the video frame.
 */

export interface SceneLuminanceSample {
  r: number;
  g: number;
  b: number;
  perceivedLuminance: number; // 0 to 255
}

export interface AdaptiveSubtitleStyle {
  opacity: number;          // 0.40 (deep night) to 1.0 (bright daylight)
  textColor: string;        // hex color
  textShadow: string;       // CSS shadow
  contrastMode: "dark-scene-dimmed" | "daylight-high-contrast" | "balanced";
  mpvSubColorHex: string;   // Alpha-prefixed ARGB hex for mpv
}

export class AdaptiveSubtitleEngine {
  private currentStyle: AdaptiveSubtitleStyle = {
    opacity: 0.90,
    textColor: "#f0ede6",
    textShadow: "0 2px 4px rgba(0,0,0,0.85)",
    contrastMode: "balanced",
    mpvSubColorHex: "#FFE6EDE0",
  };

  /**
   * Calculates perceived scene luminance from RGB bytes.
   */
  public calculateLuminance(r: number, g: number, b: number): number {
    return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  /**
   * Processes a video frame luminance sample and generates optimized subtitle styling.
   */
  public processFrameSample(sample: SceneLuminanceSample): AdaptiveSubtitleStyle {
    const lum = sample.perceivedLuminance;

    let opacity = 0.90;
    let contrastMode: AdaptiveSubtitleStyle["contrastMode"] = "balanced";
    let textColor = "#f0ede6";
    let textShadow = "0 2px 4px rgba(0,0,0,0.85)";

    // 1. Dark scenes (under 70/255 luminance): OLED Glare Protection
    if (lum < 70) {
      // Scale smoothly from 0.45 to 0.75
      opacity = parseFloat((0.45 + (lum / 70) * 0.30).toFixed(2));
      contrastMode = "dark-scene-dimmed";
      textShadow = "0 1px 3px rgba(0,0,0,0.65)";
    } else if (lum > 175) {
      // 2. High brightness daylight scenes (> 175/255): Maximum contrast
      opacity = 1.0;
      contrastMode = "daylight-high-contrast";
      textShadow = "0 2px 6px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,1)";
    } else {
      // 3. Balanced mid-tones
      opacity = 0.85;
      contrastMode = "balanced";
    }

    // 2. Color Temperature Matching
    if (sample.r > sample.b + 25) {
      // Warm scene (amber / candlelight / golden hour)
      textColor = "#eae4d5";
    } else if (sample.b > sample.r + 25) {
      // Cool scene (moonlight / sci-fi blue)
      textColor = "#dde6ed";
    } else {
      textColor = "#ededeb";
    }

    // Convert opacity to 2-digit hex for MPV alpha channel [00 = transparent, FF = opaque]
    const alphaByte = Math.round(opacity * 255).toString(16).padStart(2, "0").toUpperCase();
    const cleanHex = textColor.replace("#", "").toUpperCase();
    const mpvSubColorHex = `#${alphaByte}${cleanHex}`;

    this.currentStyle = {
      opacity,
      textColor,
      textShadow,
      contrastMode,
      mpvSubColorHex,
    };

    return this.currentStyle;
  }

  public getCurrentStyle(): AdaptiveSubtitleStyle {
    return { ...this.currentStyle };
  }
}
