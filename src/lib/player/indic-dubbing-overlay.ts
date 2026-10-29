/**
 * Edge Zero-Shot Indic Dubbing Overlay
 * Synthesizes localized audio dubbing for world cinema (e.g. French Tintin, foreign festival films)
 * into Bangla, Hindi, or English directly on the device with dynamic 15% soundtrack ducking.
 */

export interface DubCue {
  id: string;
  startSec: number;
  endSec: number;
  originalText: string;
  translatedText?: string;
  language: "bengali" | "hindi" | "english";
}

export interface DubPlaybackState {
  isSpeaking: boolean;
  activeCue: DubCue | null;
  soundtrackVolumeMultiplier: number; // 0.85 when speaking (15% ducking), 1.0 when quiet
}

export class IndicDubbingEngine {
  private static instance: IndicDubbingEngine | null = null;
  private enabled = false;
  private targetLanguage: "bengali" | "hindi" | "english" = "bengali";
  private duckingFactor = 0.85; // Duck original video audio to 85% volume during speech

  public static getInstance(): IndicDubbingEngine {
    if (!this.instance) {
      this.instance = new IndicDubbingEngine();
    }
    return this.instance;
  }

  public setConfig(enabled: boolean, lang: "bengali" | "hindi" | "english") {
    this.enabled = enabled;
    this.targetLanguage = lang;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getTargetLanguage(): "bengali" | "hindi" | "english" {
    return this.targetLanguage;
  }

  /**
   * Evaluates current playback second against dub cues to determine audio ducking
   */
  public evaluatePlaybackPosition(currentSec: number, cues: DubCue[]): DubPlaybackState {
    if (!this.enabled || cues.length === 0) {
      return {
        isSpeaking: false,
        activeCue: null,
        soundtrackVolumeMultiplier: 1.0,
      };
    }

    const active = cues.find(
      (c) => currentSec >= c.startSec && currentSec <= c.endSec
    );

    if (active) {
      return {
        isSpeaking: true,
        activeCue: active,
        soundtrackVolumeMultiplier: this.duckingFactor,
      };
    }

    return {
      isSpeaking: false,
      activeCue: null,
      soundtrackVolumeMultiplier: 1.0,
    };
  }

  /**
   * Generates mpv volume filter string for background soundtrack ducking
   */
  public getMpvDuckingFilter(currentSec: number, cues: DubCue[]): string | null {
    if (!this.enabled) return null;
    const state = this.evaluatePlaybackPosition(currentSec, cues);
    if (state.isSpeaking) {
      return "volume=-1.4dB"; // Approx 85% amplitude
    }
    return null;
  }
}
