/**
 * Smart Home Theater Lighting Automation & Climax Protector
 * Automates smart ambient lighting dimming on playback transitions,
 * protects narrative climaxes from premature sleep timer cutoff,
 * and rolls off sudden loud end-credit soundtrack spikes.
 */

export interface TheaterLightingState {
  targetBrightnessPercent: number; // 0 to 100
  fadeDurationSec: number;
  mode: "theater-dark" | "intermission-soft" | "house-bright";
}

export interface ClimaxProtectionResult {
  sleepExtended: boolean;
  originalSleepSec: number;
  adjustedSleepSec: number;
  reason: string;
}

export interface ChapterMark {
  title: string;
  startSec: number;
  endSec: number;
}

export class TheaterAutomationEngine {
  private lightingState: TheaterLightingState = {
    targetBrightnessPercent: 75,
    fadeDurationSec: 1,
    mode: "house-bright",
  };

  /**
   * Calculates lighting transitions when playback state changes.
   */
  public handlePlaybackTransition(status: "playing" | "paused" | "stopped"): TheaterLightingState {
    if (status === "playing") {
      this.lightingState = {
        targetBrightnessPercent: 12,
        fadeDurationSec: 5.0,
        mode: "theater-dark",
      };
    } else if (status === "paused") {
      this.lightingState = {
        targetBrightnessPercent: 38,
        fadeDurationSec: 1.5,
        mode: "intermission-soft",
      };
    } else {
      this.lightingState = {
        targetBrightnessPercent: 80,
        fadeDurationSec: 3.0,
        mode: "house-bright",
      };
    }
    return { ...this.lightingState };
  }

  /**
   * Protects the climax from abrupt sleep timer cutoffs.
   * If a sleep timer expires during the final 15% of the film or within a climax chapter,
   * delays the sleep action until the end credits roll.
   */
  public evaluateClimaxProtection(
    scheduledSleepTimestampSec: number,
    _currentPlaybackSec: number,
    totalDurationSec: number,
    chapters: ChapterMark[] = []
  ): ClimaxProtectionResult {
    if (totalDurationSec <= 300) {
      return {
        sleepExtended: false,
        originalSleepSec: scheduledSleepTimestampSec,
        adjustedSleepSec: scheduledSleepTimestampSec,
        reason: "Duration too short for climax protection.",
      };
    }

    const climaxThresholdSec = totalDurationSec * 0.85; // Final 15% of film
    const isInsideClimaxWindow =
      scheduledSleepTimestampSec >= climaxThresholdSec && scheduledSleepTimestampSec < totalDurationSec;

    // Check if an explicit Climax chapter exists at scheduled sleep time
    const climaxChapter = chapters.find(
      (c) => /climax|final|resolution/i.test(c.title) && scheduledSleepTimestampSec >= c.startSec && scheduledSleepTimestampSec <= c.endSec
    );

    if (isInsideClimaxWindow || climaxChapter) {
      // Find credits start or default to duration minus 60s
      const creditsChapter = chapters.find((c) => /credits|end/i.test(c.title));
      const adjustedSleepSec = creditsChapter ? creditsChapter.startSec + 30 : Math.max(0, totalDurationSec - 30);

      return {
        sleepExtended: true,
        originalSleepSec: scheduledSleepTimestampSec,
        adjustedSleepSec,
        reason: `Sleep timer extended past ${climaxChapter ? climaxChapter.title : "the narrative climax"} until end credits.`,
      };
    }

    return {
      sleepExtended: false,
      originalSleepSec: scheduledSleepTimestampSec,
      adjustedSleepSec: scheduledSleepTimestampSec,
      reason: "Sleep timer outside climax zone; no adjustment required.",
    };
  }

  /**
   * Calculates volume attenuation for end credits to avoid blasting house.
   */
  public calculateCreditsVolumeMultiplier(
    currentSec: number,
    totalDurationSec: number,
    isCreditsChapter: boolean = false
  ): number {
    if (totalDurationSec <= 0) return 1.0;

    const nearEnd = currentSec >= totalDurationSec - 180; // Final 3 mins
    if (isCreditsChapter || nearEnd) {
      // Gentle -8dB roll-off (approx 0.40 linear multiplier)
      return 0.40;
    }
    return 1.0;
  }
}
