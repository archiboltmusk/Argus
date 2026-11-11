/**
 * AI Beat-Synced Trailer & Teaser Synthesizer
 *
 * Automatically generates 30s/60s/90s cinematic trailers and episodic recaps.
 * Combines shot-boundary visual change detection, audio crest factor analysis,
 * face dialogue density, and rhythm-accelerated crescendo montage editing.
 */

export interface SceneCandidateCue {
  id: string;
  startSec: number;
  durationSec: number;
  visualCutDelta: number; // 0.0 to 1.0 (magnitude of scene change)
  audioPeakDb: number; // e.g. -2.0 dB
  audioRmsDb: number; // e.g. -14.0 dB
  dialogueDensity: number; // 0.0 to 1.0
  faceCount: number;
  description?: string;
}

export interface TrailerCutSegment {
  sourceStartSec: number;
  durationSec: number;
  phase: "setup" | "rising-action" | "climax-montage" | "impact-button";
  energyScore: number;
  titleCardOverlay?: string;
}

export interface SynthesizedTrailerPlan {
  totalDurationSec: number;
  cuts: TrailerCutSegment[];
  soundtrackPacingBpm: number;
  audioEnvelope: {
    fadeInSec: number;
    climaxSwellStartSec: number;
    impactDropSec: number;
  };
  filterChainDescription: string;
}

export interface TrailerGeneratorConfig {
  targetDurationSec: 30 | 60 | 90;
  includeTitleCards: boolean;
  movieTitle: string;
  releaseTagline?: string;
}

const DEFAULT_CONFIG: TrailerGeneratorConfig = {
  targetDurationSec: 60,
  includeTitleCards: true,
  movieTitle: "Cinema Feature",
  releaseTagline: "Experience the Untold",
};

export class SmartTrailerGenerator {
  private static instance: SmartTrailerGenerator | null = null;
  private config: TrailerGeneratorConfig;

  public constructor(initialConfig?: Partial<TrailerGeneratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
  }

  public static getInstance(): SmartTrailerGenerator {
    if (!SmartTrailerGenerator.instance) {
      SmartTrailerGenerator.instance = new SmartTrailerGenerator();
    }
    return SmartTrailerGenerator.instance;
  }

  public getConfig(): TrailerGeneratorConfig {
    return { ...this.config };
  }

  public updateConfig(patch: Partial<TrailerGeneratorConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  /**
   * Computes composite tension energy score [0 - 100] for a scene cue
   */
  public scoreSceneEnergy(cue: SceneCandidateCue): number {
    // Audio dynamic crest = peak - RMS (higher difference implies explosive transients)
    const crestFactor = Math.max(0, Math.min(20, cue.audioPeakDb - cue.audioRmsDb));
    const normalizedCrest = crestFactor / 20;

    const visualScore = Math.min(1.0, cue.visualCutDelta) * 35;
    const audioScore = normalizedCrest * 35;
    const dialogScore = Math.min(1.0, cue.dialogueDensity) * 15;
    const faceScore = Math.min(1.0, cue.faceCount / 3) * 15;

    return Math.round((visualScore + audioScore + dialogScore + faceScore) * 10) / 10;
  }

  /**
   * Assembles a rhythmic crescendo montage plan tailored to target trailer duration
   */
  public synthesizeTrailer(cues: SceneCandidateCue[]): SynthesizedTrailerPlan {
    if (cues.length === 0) {
      return {
        totalDurationSec: 0,
        cuts: [],
        soundtrackPacingBpm: 120,
        audioEnvelope: { fadeInSec: 1.5, climaxSwellStartSec: 40, impactDropSec: 56 },
        filterChainDescription: "empty",
      };
    }

    // Rank candidate cues by energy
    const scored = cues.map((c) => ({
      cue: c,
      energy: this.scoreSceneEnergy(c),
    })).sort((a, b) => b.energy - a.energy);

    const totalTarget = this.config.targetDurationSec;
    const cuts: TrailerCutSegment[] = [];

    // Phase pacing distributions:
    // Setup (2 cuts, slower) -> Rising (3 cuts, medium) -> Climax (rapid fire) -> Impact button
    const setupDuration = totalTarget === 30 ? 4.0 : 6.0;
    const risingDuration = totalTarget === 30 ? 2.5 : 3.5;
    const climaxDuration = totalTarget === 30 ? 1.0 : 1.4;
    const impactDuration = 2.0;

    let cueIndex = 0;

    // 1. Setup Phase
    for (let i = 0; i < 2 && cueIndex < scored.length; i++) {
      const s = scored[cueIndex++];
      cuts.push({
        sourceStartSec: s.cue.startSec,
        durationSec: setupDuration,
        phase: "setup",
        energyScore: s.energy,
        titleCardOverlay: i === 0 && this.config.includeTitleCards ? this.config.releaseTagline : undefined,
      });
    }

    // 2. Rising Action Phase
    const risingCount = totalTarget === 30 ? 2 : 4;
    for (let i = 0; i < risingCount && cueIndex < scored.length; i++) {
      const s = scored[cueIndex++];
      cuts.push({
        sourceStartSec: s.cue.startSec,
        durationSec: risingDuration,
        phase: "rising-action",
        energyScore: s.energy,
      });
    }

    // 3. Climax Montage (Rapid cuts)
    const climaxCount = totalTarget === 30 ? 4 : 8;
    for (let i = 0; i < climaxCount && cueIndex < scored.length; i++) {
      const s = scored[cueIndex++];
      cuts.push({
        sourceStartSec: s.cue.startSec,
        durationSec: climaxDuration,
        phase: "climax-montage",
        energyScore: s.energy,
      });
    }

    // 4. Final Impact Button / Title Reveal
    if (cueIndex < scored.length) {
      const s = scored[cueIndex++];
      cuts.push({
        sourceStartSec: s.cue.startSec,
        durationSec: impactDuration,
        phase: "impact-button",
        energyScore: s.energy,
        titleCardOverlay: this.config.includeTitleCards ? this.config.movieTitle : undefined,
      });
    }

    let actualDuration = 0;
    for (const c of cuts) {
      actualDuration += c.durationSec;
    }

    const climaxSwellStart = Math.max(10, actualDuration - (climaxCount * climaxDuration + impactDuration + 2));
    const impactDrop = Math.max(15, actualDuration - impactDuration);

    return {
      totalDurationSec: Math.round(actualDuration * 10) / 10,
      cuts,
      soundtrackPacingBpm: totalTarget === 30 ? 140 : 128,
      audioEnvelope: {
        fadeInSec: 1.5,
        climaxSwellStartSec: Math.round(climaxSwellStart),
        impactDropSec: Math.round(impactDrop),
      },
      filterChainDescription: `concat=n=${cuts.length}:v=1:a=1[outv][outa]`,
    };
  }
}
