import { test } from "node:test";
import assert from "node:assert/strict";

// 1. Catch-Me-Up Zero-Spoiler Engine
import { CatchMeUpEngine } from "../src/lib/player/catch-me-up";

// 2. Adaptive Subtitle Luminance
import { AdaptiveSubtitleEngine } from "../src/lib/player/adaptive-subtitles";

// 3. Theater Automation & Climax Protector
import { TheaterAutomationEngine } from "../src/lib/player/theater-automation";

// 4. Couch Cinema Sync & Spatial Voice
import { CouchCinemaSyncEngine } from "../src/lib/player/couch-cinema";

// 5. Curator Notes & Study Guides
import { CuratorNotesEngine } from "../src/lib/player/curator-notes";

// --- 1. CATCH-ME-UP ZERO-SPOILER TESTS ---
test("CatchMeUpEngine: anti-spoiler invariant, active characters, and plot digest", () => {
  const cues = [
    { startSec: 10, endSec: 15, text: "DETECTIVE: We found a clue at the warehouse." },
    { startSec: 400, endSec: 405, text: "SUSPECT: I swear I was nowhere near there." },
    { startSec: 420, endSec: 425, text: "DETECTIVE: Hurry, we must escape before they arrive!" },
    { startSec: 800, endSec: 805, text: "FUTURE SPOILER: The detective was the mastermind!" }, // Must never be accessed at 430s!
  ];

  const engine = new CatchMeUpEngine(cues);
  const recap = engine.generateRecap(430, 600); // at 430s

  assert.equal(recap.antiSpoilerVerified, true);
  assert.equal(recap.currentSec, 430);
  assert.ok(recap.recentPlotDigest.length > 0);

  // Future cue at 800s must never appear
  const digestString = recap.recentPlotDigest.join(" ");
  assert.equal(digestString.includes("FUTURE SPOILER"), false);

  // Active characters at 430s
  assert.ok(recap.activeCharactersInScene.some((c) => c.name === "DETECTIVE"));
  assert.ok(recap.activeCharactersInScene.some((c) => c.name === "SUSPECT"));

  // Urgency objective detection
  assert.ok(recap.activeObjective.includes("escape") || recap.activeObjective.includes("departure"));
});

// --- 2. ADAPTIVE SUBTITLE LUMINANCE TESTS ---
test("AdaptiveSubtitleEngine: OLED glare protection dimming and color tinting", () => {
  const engine = new AdaptiveSubtitleEngine();

  // Test perceived luminance formula
  const lum = engine.calculateLuminance(100, 100, 100);
  assert.equal(lum, 100);

  // Test dark nighttime scene (e.g. 30/255 luminance)
  const darkSample = { r: 20, g: 30, b: 40, perceivedLuminance: 30 };
  const darkStyle = engine.processFrameSample(darkSample);
  assert.equal(darkStyle.contrastMode, "dark-scene-dimmed");
  assert.ok(darkStyle.opacity <= 0.65); // Dimmed to protect dark-adapted eyes

  // Test bright daylight scene (e.g. 210/255 luminance)
  const brightSample = { r: 210, g: 210, b: 210, perceivedLuminance: 210 };
  const brightStyle = engine.processFrameSample(brightSample);
  assert.equal(brightStyle.contrastMode, "daylight-high-contrast");
  assert.equal(brightStyle.opacity, 1.0);

  // Test warm candlelight tinting
  const warmSample = { r: 150, g: 100, b: 50, perceivedLuminance: 105 };
  const warmStyle = engine.processFrameSample(warmSample);
  assert.equal(warmStyle.textColor, "#eae4d5"); // Warm cream
});

// --- 3. THEATER AUTOMATION & CLIMAX PROTECTOR TESTS ---
test("TheaterAutomationEngine: state dimming, climax protector postponement, and credits roll-off", () => {
  const auto = new TheaterAutomationEngine();

  const playLighting = auto.handlePlaybackTransition("playing");
  assert.equal(playLighting.mode, "theater-dark");
  assert.equal(playLighting.targetBrightnessPercent, 12);

  const pauseLighting = auto.handlePlaybackTransition("paused");
  assert.equal(pauseLighting.mode, "intermission-soft");
  assert.equal(pauseLighting.targetBrightnessPercent, 38);

  // Test Climax Protection: 2-hour movie (7200s), sleep scheduled at 6500s (final 15% zone)
  const chapters = [
    { title: "Rising Action", startSec: 4000, endSec: 6200 },
    { title: "Climax & Resolution", startSec: 6200, endSec: 7000 },
    { title: "End Credits", startSec: 7000, endSec: 7200 },
  ];

  const protectResult = auto.evaluateClimaxProtection(6500, 6400, 7200, chapters);
  assert.equal(protectResult.sleepExtended, true);
  assert.ok(protectResult.adjustedSleepSec >= 7000); // Postponed to end credits

  // Test Credits Volume Roll-Off
  const normalVol = auto.calculateCreditsVolumeMultiplier(3000, 7200, false);
  assert.equal(normalVol, 1.0);

  const creditsVol = auto.calculateCreditsVolumeMultiplier(7100, 7200, true);
  assert.equal(creditsVol, 0.40); // -8dB soft roll-off
});

// --- 4. COUCH CINEMA SYNC & SPATIAL VOICE TESTS ---
test("CouchCinemaSyncEngine: drift evaluation, spatial panning distribution, and audio ducking", () => {
  const sync = new CouchCinemaSyncEngine();

  // Low drift (0.04s) -> in-sync
  const inSync = sync.evaluateSyncDrift(100.04, 100.0);
  assert.equal(inSync.action, "in-sync");
  assert.equal(inSync.recommendedRate, 1.0);

  // Moderate drift (0.5s behind leader) -> rate adjust (speed up to 1.04x)
  const rateAdjust = sync.evaluateSyncDrift(99.5, 100.0);
  assert.equal(rateAdjust.action, "rate-adjust");
  assert.equal(rateAdjust.recommendedRate, 1.04);

  // Severe drift (4.0s) -> hard seek
  const hardSeek = sync.evaluateSyncDrift(96.0, 100.0);
  assert.equal(hardSeek.action, "hard-seek");
  assert.equal(hardSeek.targetSeekSec, 100.0);

  // Spatial Panning for 3 peers on the couch
  const p0 = sync.calculateSpatialPan(0, 3);
  const p1 = sync.calculateSpatialPan(1, 3);
  const p2 = sync.calculateSpatialPan(2, 3);
  assert.equal(p0.pan, -0.75); // Left
  assert.equal(p1.pan, 0.0);   // Center
  assert.equal(p2.pan, 0.75);  // Right

  // Voice Activity Movie Ducking
  sync.updatePeerState({
    peerId: "user-alice",
    displayName: "Alice",
    currentSec: 100,
    status: "playing",
    clockSkewMs: 0,
    speaking: true, // Alice is speaking!
  });

  const duck = sync.calculateMovieAudioDucking();
  assert.equal(duck.duckActive, true);
  assert.equal(duck.volumeMultiplier, 0.42);

  // Timeline Reactions
  sync.addReaction(120, "🔥");
  sync.addReaction(122, "🔥"); // Merges nearby
  const reactions = sync.getReactions();
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0].count, 2);
});

// --- 5. CURATOR NOTES TESTS ---
test("CuratorNotesEngine: active notes query and sample guide creation", () => {
  const sampleNotes = CuratorNotesEngine.createSampleStudyGuide(6000);
  assert.ok(sampleNotes.length >= 3);

  const engine = new CuratorNotesEngine(sampleNotes);
  const activeAt50 = engine.getActiveNotes(50);
  assert.equal(activeAt50.length, 1);
  assert.equal(activeAt50[0].category, "cinematography");
  assert.ok(activeAt50[0].headline.includes("Visual Framing"));
});
