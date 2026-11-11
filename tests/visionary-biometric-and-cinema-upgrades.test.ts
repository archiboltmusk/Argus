import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  LosslessSceneClipper,
  ClipRequest,
} from "../src/lib/video/lossless-scene-clipper.ts";

import {
  BiometricImmersionReactor,
  ThrillSpikeEvent,
} from "../src/lib/biometrics/biometric-immersion-reactor.ts";

import {
  SmartTrailerGenerator,
  SceneCandidateCue,
} from "../src/lib/ai/smart-trailer-generator.ts";

import {
  CinemaLoreBot,
  LoreCharacter,
  LoreFaction,
} from "../src/lib/ai/cinema-lore-bot.ts";

import {
  NeuralVoiceCloneDub,
  ActorAcousticTimbre,
  DubbingCueRequest,
} from "../src/lib/audio/neural-voice-clone-dub.ts";

describe("Visionary Biometric, Lore & Cinema Suite (v3.14.0)", () => {
  describe("1. Lossless Scene Clipper & Smart 9:16 Re-framer", () => {
    it("should validate clipping boundaries and reject invalid time ranges", () => {
      const clipper = new LosslessSceneClipper();
      assert.equal(clipper.validateTimeRange(-5, 10).valid, false);
      assert.equal(clipper.validateTimeRange(20, 10).valid, false);
      assert.equal(clipper.validateTimeRange(10, 50, 40).valid, false);
      assert.equal(clipper.validateTimeRange(10, 30, 100).valid, true);
    });

    it("should generate zero-reencode stream copy plan for pure lossless extraction", () => {
      const clipper = new LosslessSceneClipper();
      const req: ClipRequest = {
        sourceFilePath: "/movies/interstellar.mkv",
        startSec: 120.0,
        endSec: 145.0,
        outputFormat: "lossless-mp4",
      };

      const plan = clipper.buildClipPlan(req, 12000);
      assert.equal(plan.isLosslessStreamCopy, true);
      assert.ok(plan.commandArgs.includes("-c"));
      assert.ok(plan.commandArgs.includes("copy"));
      assert.ok(plan.commandArgs.includes("make_zero"));
      assert.equal(plan.durationSec, 25.0);
    });

    it("should synthesize 9:16 vertical crop filter and two-pass animated GIF palette", () => {
      const clipper = new LosslessSceneClipper();
      const reqCrop: ClipRequest = {
        sourceFilePath: "/movies/action.mp4",
        startSec: 40.0,
        endSec: 50.0,
        outputFormat: "lossless-mp4",
        smartCropVertical916: true,
        subjectCenterNormX: 0.65,
      };

      const planCrop = clipper.buildClipPlan(reqCrop);
      assert.equal(planCrop.isLosslessStreamCopy, false);
      assert.ok(planCrop.videoFiltersApplied[0].includes("crop=ih*9/16:ih:"));

      const reqGif: ClipRequest = {
        sourceFilePath: "/movies/funny_moment.mp4",
        startSec: 10.0,
        endSec: 14.0,
        outputFormat: "animated-gif",
      };
      const planGif = clipper.buildClipPlan(reqGif);
      assert.ok(planGif.outputFileName.endsWith(".gif"));
      assert.ok(planGif.commandArgs.some((arg) => arg.includes("palettegen")));
    });
  });

  describe("2. Biometric Immersion & Sleep Reactor", () => {
    it("should detect sudden thrill & jump-scare heart rate spikes", () => {
      const reactor = new BiometricImmersionReactor({ thrillSpikeDeltaBpm: 20 });

      // Ingest normal resting baseline
      for (let i = 0; i < 10; i++) {
        reactor.ingestSample(70, i, 1000 + i * 1000);
      }

      // Sudden jump scare spike to 110 BPM (+40 BPM delta)
      const res = reactor.ingestSample(110, 10.5, 11000);
      assert.ok(res.spike);
      assert.equal(res.spike?.severity, "jump-scare");
      assert.ok(res.spike?.deltaBpm >= 35);
      assert.equal(reactor.getSpikes().length, 1);
    });

    it("should trigger Sleep Guard auto-pause and volume fade after sustained resting BPM", () => {
      const reactor = new BiometricImmersionReactor({
        restingBpmThreshold: 55,
        sleepConfirmationMinutes: 0.05, // short for testing: 3 seconds
      });

      // Low resting BPM simulation
      let state;
      for (let i = 0; i < 5; i++) {
        state = reactor.ingestSample(50, i, 1000 + i * 1000).sleepState;
      }

      assert.ok(state);
      assert.equal(state.isViewerAsleep, true);
      assert.equal(state.recommendedAction, "fade-and-pause");
      assert.equal(state.audioVolumeMultiplier, 0.0);
    });

    it("should modulate heartbeat ambilight pulse multiplier", () => {
      const reactor = new BiometricImmersionReactor({ pulseAmbilightEnabled: true });
      reactor.ingestSample(75, 1.0, 1000);

      const pulse = reactor.calculateHeartbeatPulseMultiplier(1200);
      assert.ok(pulse >= 0.85 && pulse <= 1.25);
    });
  });

  describe("3. AI Beat-Synced Trailer & Teaser Synthesizer", () => {
    it("should score candidate scenes by visual cuts, audio crest dynamics, and faces", () => {
      const gen = new SmartTrailerGenerator();
      const highTensionCue: SceneCandidateCue = {
        id: "cue-explosion",
        startSec: 1400.0,
        durationSec: 8.0,
        visualCutDelta: 0.85,
        audioPeakDb: -0.5,
        audioRmsDb: -16.0, // Large crest factor
        dialogueDensity: 0.7,
        faceCount: 2,
      };

      const score = gen.scoreSceneEnergy(highTensionCue);
      assert.ok(score > 70, "Explosive dynamic scene should score above 70");
    });

    it("should assemble a rhythm-accelerated trailer plan with title cards and audio envelopes", () => {
      const gen = new SmartTrailerGenerator({
        targetDurationSec: 60,
        movieTitle: "Dune Messiah",
      });

      const sampleCues: SceneCandidateCue[] = Array.from({ length: 20 }, (_, idx) => ({
        id: `cue-${idx}`,
        startSec: idx * 100,
        durationSec: 10,
        visualCutDelta: 0.5 + (idx % 5) * 0.1,
        audioPeakDb: -1.0,
        audioRmsDb: -12.0,
        dialogueDensity: 0.5,
        faceCount: 1,
      }));

      const plan = gen.synthesizeTrailer(sampleCues);
      assert.ok(plan.cuts.length > 5);
      assert.ok(plan.totalDurationSec > 30);
      assert.ok(plan.audioEnvelope.climaxSwellStartSec > 0);

      // Verify phase progression: setup -> rising-action -> climax-montage -> impact-button
      assert.equal(plan.cuts[0].phase, "setup");
      const climaxCut = plan.cuts.find((c) => c.phase === "climax-montage");
      assert.ok(climaxCut);
      assert.ok(climaxCut.durationSec < plan.cuts[0].durationSec, "Climax cuts must be faster paced");
    });
  });

  describe("4. Cinema Lore Bot & Anti-Spoiler Canon Guard", () => {
    it("should shield future plot spoilers while revealing current status", () => {
      const lore = new CinemaLoreBot();
      const faction: LoreFaction = {
        id: "house-atreides",
        name: "House Atreides",
        allegiance: "Caladan",
      };
      const char: LoreCharacter = {
        id: "paul",
        name: "Paul Atreides",
        factionId: "house-atreides",
        firstAppearanceSec: 60,
        initialRole: "Ducal Heir",
      };

      lore.registerFaction(faction);
      lore.registerCharacter(char);

      lore.addMilestone({
        characterId: "paul",
        revealTimestampSec: 1800,
        status: "active",
        publicLoreUpdate: "Survives the Arrakis Harkonnen ambush and escapes into the deep desert",
      });

      lore.addMilestone({
        characterId: "paul",
        revealTimestampSec: 5400,
        status: "active",
        publicLoreUpdate: "Rides the Grandfather Sandworm and claims the mantle of Muad'Dib",
      });

      // Query at timestamp 30s (before first appearance)
      const resEarly = lore.queryCharacter("paul", 30);
      assert.equal(resEarly.isSpoilerShielded, true);
      assert.ok(resEarly.answer.includes("not yet been introduced"));

      // Query at timestamp 2000s (after ambush, before sandworm)
      const resMid = lore.queryCharacter("paul", 2000);
      assert.equal(resMid.isSpoilerShielded, true);
      assert.ok(resMid.answer.includes("Survives the Arrakis Harkonnen ambush"));
      assert.ok(!resMid.answer.includes("Muad'Dib"), "Future milestone must not leak");

      // Verify safe graph view at timestamp 2000s
      const graph = lore.getLoreGraphAtTimestamp(2000);
      assert.equal(graph.characters.length, 1);
      assert.equal(graph.characters[0].factionName, "House Atreides");
    });
  });

  describe("5. Neural Voice Clone Dubbing & Timbre Matcher", () => {
    it("should match actor vocal timbre and compute duration scale factor", () => {
      const dubber = new NeuralVoiceCloneDub();
      const timbre: ActorAcousticTimbre = {
        actorId: "actor-bale",
        actorName: "Christian Bale",
        fundamentalPitchF0Hz: 110,
        vocalWarmthIndex: 0.8,
        formantShiftRatio: 0.95,
        speakingRateWpm: 130,
        breathiness: 0.35,
      };

      dubber.registerActorTimbre(timbre);
      assert.equal(dubber.getActorTimbre("actor-bale")?.fundamentalPitchF0Hz, 110);

      const cue: DubbingCueRequest = {
        cueId: "cue-batman-1",
        startSec: 45.0,
        endSec: 48.0, // 3.0 seconds duration
        sourceText: "It's not who I am underneath, but what I do that defines me.",
        translatedText: "No es quién soy en el interior, sino lo que hago lo que me define.",
        targetLanguage: "es",
        actorId: "actor-bale",
        screenPanX: -0.6, // On screen left
        roomReverbDecaySec: 0.5,
      };

      const plan = dubber.planDubbedCue(cue);
      assert.equal(plan.durationSec, 3.0);
      assert.ok(plan.rateScalingFactor >= 0.75 && plan.rateScalingFactor <= 1.35);
      assert.equal(plan.panningAngleDeg, -27);
      assert.ok(plan.audioFilterString.includes("pan=stereo"));
      assert.ok(plan.audioFilterString.includes("aecho="));
    });
  });
});
