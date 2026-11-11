import { test } from "node:test";
import assert from "node:assert/strict";
import "./_localstorage-stub.ts";

// 1. Soundtrack Radar
import {
  buildMusicServiceUrls,
  MediaSoundtrackRegistry,
  getSoundtrackRadarConfig,
  updateSoundtrackRadarConfig,
  type SoundtrackTrack,
} from "../src/lib/music/scene-soundtrack-radar";

// 2. Audio Hardware & Latency Calibrator
import {
  computeCalibrationOffsetMs,
  buildAudioHardwareMpvCommands,
  getAudioHardwareConfig,
  updateAudioHardwareConfig,
} from "../src/lib/audio/audio-latency-calibrator";

// 3. SafeCinema Shield (Harding FPA & Jump-Scare)
import {
  evaluatePhotosensitiveStrobe,
  evaluateJumpScareAcousticRise,
  buildSafeCinemaMpvProperties,
  type FrameLuminanceSample,
} from "../src/lib/player/safe-cinema-shield";

// 4. Neural Super-Resolution (Anime4K & FSRCNNX)
import {
  shouldApplyNeuralUpscale,
  buildSuperResolutionMpvCommands,
  getSuperResolutionConfig,
  updateSuperResolutionConfig,
} from "../src/lib/shaders/neural-super-resolution";

// 5. Multi-Debrid Speed-Race & Failover
import {
  executeDebridSpeedRace,
  StreamFailoverCoordinator,
  type DebridMirrorCandidate,
} from "../src/lib/debrid/multi-debrid-race";

// 6. Danmaku & Reaction Heatmap
import {
  generateReactionHeatmap,
  DanmakuCoordinator,
  getDanmakuConfig,
  updateDanmakuConfig,
  type DanmakuComment,
} from "../src/lib/danmaku/danmaku-engine";

// --- 1. SOUNDTRACK RADAR TESTS ---
test("Soundtrack Radar: URL builders, scene tracking, and playback position resolution", () => {
  const urls = buildMusicServiceUrls("Nightcall", "Kavinsky");
  assert.ok(urls.spotifySearchUrl.includes("Nightcall%20Kavinsky"));
  assert.ok(urls.appleMusicSearchUrl.includes("Nightcall%20Kavinsky"));
  assert.ok(urls.youtubeMusicSearchUrl.includes("Nightcall%20Kavinsky"));

  const registry = new MediaSoundtrackRegistry();
  const tracks: SoundtrackTrack[] = [
    {
      id: "track-1",
      title: "Nightcall",
      artist: "Kavinsky",
      sceneTimeStartSec: 60,
      sceneTimeEndSec: 180,
      confidence: 0.99,
    },
    {
      id: "track-2",
      title: "A Real Hero",
      artist: "College & Electric Youth",
      sceneTimeStartSec: 500,
      sceneTimeEndSec: 720,
      confidence: 0.95,
    },
  ];

  registry.registerTracks("movie:drive", tracks);

  // Position 100 is within Nightcall (60 - 180)
  const current1 = registry.findTrackAtPosition("movie:drive", 100);
  assert.equal(current1?.id, "track-1");
  assert.equal(current1?.title, "Nightcall");

  // Position 300 has no song
  const current2 = registry.findTrackAtPosition("movie:drive", 300);
  assert.equal(current2, null);

  // Position 600 is within A Real Hero
  const current3 = registry.evaluatePlaybackPosition("movie:drive", 600);
  assert.equal(current3?.id, "track-2");

  updateSoundtrackRadarConfig({ preferredStreamingService: "apple-music" });
  assert.equal(getSoundtrackRadarConfig().preferredStreamingService, "apple-music");
});

// --- 2. AUDIO LATENCY CALIBRATOR & BITSTREAM TESTS ---
test("Audio Hardware: latency calculation, outlier rejection and MPV bitstream commands", () => {
  // Test samples with motor reaction lag (~150ms) + 180ms hardware delay = ~330ms
  const samples = [
    { referencePulseMs: 1000, userClickMs: 1330 },
    { referencePulseMs: 2000, userClickMs: 2328 },
    { referencePulseMs: 3000, userClickMs: 3332 },
    { referencePulseMs: 4000, userClickMs: 4330 },
    { referencePulseMs: 5000, userClickMs: 5500 }, // Outlier
  ];

  const estimatedDelay = computeCalibrationOffsetMs(samples);
  // Expected delay ~180ms
  assert.ok(estimatedDelay >= 170 && estimatedDelay <= 190);

  updateAudioHardwareConfig({
    bluetoothDelayMs: 180,
    avPassthroughEnabled: true,
    bitstreamCodecs: ["truehd", "dts-hd", "eac3"],
    audioExclusiveMode: true,
  });

  const commands = buildAudioHardwareMpvCommands();
  assert.ok(commands.some((c) => c.name === "audio-delay" && c.value === "0.180"));
  assert.ok(commands.some((c) => c.name === "audio-spdif" && c.value === "truehd,dts-hd,eac3"));
  assert.ok(commands.some((c) => c.name === "audio-exclusive" && c.value === "yes"));
});

// --- 3. SAFECINEMA TRIGGER & STROBE SHIELD TESTS ---
test("SafeCinema Shield: Harding FPA strobe analysis and jump-scare acoustic crest detection", () => {
  // Simulate 4Hz rapid alternating strobe: 0.1 -> 0.9 -> 0.1 -> 0.9 in 1 second
  const strobeSamples: FrameLuminanceSample[] = [
    { timestampMs: 0, relativeLuminance: 0.1 },
    { timestampMs: 125, relativeLuminance: 0.85 },
    { timestampMs: 250, relativeLuminance: 0.1 },
    { timestampMs: 375, relativeLuminance: 0.85 },
    { timestampMs: 500, relativeLuminance: 0.1 },
    { timestampMs: 625, relativeLuminance: 0.85 },
    { timestampMs: 750, relativeLuminance: 0.1 },
    { timestampMs: 875, relativeLuminance: 0.85 },
    { timestampMs: 1000, relativeLuminance: 0.1 },
  ];

  const strobeResult = evaluatePhotosensitiveStrobe(strobeSamples);
  assert.equal(strobeResult.isHazardous, true);
  assert.ok(strobeResult.flashRateHz >= 3.0);
  assert.ok(strobeResult.recommendedContrastScale < 1.0);

  const mpvProps = buildSafeCinemaMpvProperties(strobeResult);
  assert.ok(mpvProps.some((p) => p.name === "contrast" && parseInt(p.value, 10) < 0));

  // Jump-scare acoustic crest: sudden 22dB jump from quiet whisper (-35dB) to scream (-13dB)
  const jumpScare = evaluateJumpScareAcousticRise(-35, -13);
  assert.equal(jumpScare.isJumpScareRisk, true);
  assert.equal(jumpScare.riseDb, 22.0);

  const calmScene = evaluateJumpScareAcousticRise(-25, -20);
  assert.equal(calmScene.isJumpScareRisk, false);
});

// --- 4. NEURAL SUPER-RESOLUTION (ANIME4K & FSRCNNX) TESTS ---
test("Super-Resolution: SD gating, Anime4K and FSRCNNX GLSL shader configurations", () => {
  updateSuperResolutionConfig({
    profile: "anime4k-reconstruct",
    autoEnableForSdOnly: true,
    debandPrepass: true,
  });

  // 720p source should apply upscale
  assert.equal(shouldApplyNeuralUpscale(720), true);
  // 4K source (2160p) should NOT apply upscale when autoEnableForSdOnly is active
  assert.equal(shouldApplyNeuralUpscale(2160), false);

  const anime4kCmds = buildSuperResolutionMpvCommands(720);
  assert.ok(anime4kCmds.some((c) => c.name === "deband" && c.value === "yes"));
  const shaderChain = anime4kCmds.find((c) => c.name === "glsl-shaders")?.value ?? "";
  assert.ok(shaderChain.includes("Anime4K_Restore_CNN_VL.glsl"));
  assert.ok(shaderChain.includes("Anime4K_Upscale_CNN_x2_VL.glsl"));

  // Switch to FSRCNNX
  updateSuperResolutionConfig({ profile: "fsrcnnx-texture-16" });
  const fsrcnnxCmds = buildSuperResolutionMpvCommands(1080);
  const fsrcnnxShaders = fsrcnnxCmds.find((c) => c.name === "glsl-shaders")?.value ?? "";
  assert.ok(fsrcnnxShaders.includes("FSRCNNX_x2_16-0-4-1.glsl"));

  // Off profile clears shaders
  updateSuperResolutionConfig({ profile: "off" });
  const offCmds = buildSuperResolutionMpvCommands(720);
  assert.ok(offCmds.some((c) => c.name === "glsl-shaders" && c.value === ""));
});

// --- 5. MULTI-DEBRID SPEED-RACE & FAILOVER TESTS ---
test("Multi-Debrid: speed race ranking and in-stream failover coordination", async () => {
  const candidates: DebridMirrorCandidate[] = [
    {
      providerId: "premiumize",
      streamUrl: "https://mock-cdn.example.com/stream-prem.mkv",
      sourceLabel: "PM 4K",
      measuredLatencyMs: 250,
      isAlive: true,
    },
    {
      providerId: "realdebrid",
      streamUrl: "https://mock-cdn.example.com/stream-rd.mkv",
      sourceLabel: "RD 4K",
      measuredLatencyMs: 65,
      isAlive: true,
    },
    {
      providerId: "alldebrid",
      streamUrl: "https://mock-cdn.example.com/stream-ad.mkv",
      sourceLabel: "AD 4K",
      measuredLatencyMs: 140,
      isAlive: true,
    },
  ];

  // Mock race
  const raceResult = await executeDebridSpeedRace(candidates, {
    parallelRaceEnabled: false, // Use direct ranking
    probeTimeoutMs: 1000,
    autoFailoverOnStall: true,
    maxStallDurationSec: 5,
  });

  assert.ok(raceResult.winner);

  // Coordinator failover
  const coordinator = new StreamFailoverCoordinator();
  coordinator.initialize(candidates[1], [candidates[0], candidates[2]]); // RD active, PM and AD backup
  assert.equal(coordinator.getActive()?.providerId, "realdebrid");
  assert.equal(coordinator.getBackups().length, 2);

  // Trigger failover at 1240s playback position
  const failover = coordinator.triggerFailover(1240);
  assert.ok(failover);
  assert.equal(failover.resumePositionSec, 1240);
  assert.equal(coordinator.getActive()?.providerId, "premiumize");
  assert.equal(coordinator.getBackups().length, 1);
});

// --- 6. DANMAKU BULLET COMMENTS & REACTION HEATMAP TESTS ---
test("Danmaku: reaction heatmap density calculation and collision-free lane assignment", () => {
  const comments: DanmakuComment[] = [
    { id: "c1", timeSec: 10, text: "OMG!!", colorHex: "#ffffff", mode: "scroll", fontSizePx: 20 },
    { id: "c2", timeSec: 10.5, text: "NO WAY", colorHex: "#ff0000", mode: "scroll", fontSizePx: 20 },
    { id: "c3", timeSec: 11, text: "LMAOO", colorHex: "#ffff00", mode: "scroll", fontSizePx: 20 },
    { id: "c4", timeSec: 50, text: "plot twist", colorHex: "#00ffff", mode: "scroll", fontSizePx: 20 },
  ];

  // 100-second movie split into 10 buckets (10 seconds each)
  const heatmap = generateReactionHeatmap(comments, 100, 10);
  assert.equal(heatmap.length, 10);
  // Bucket 1 (10s - 20s) has 3 comments -> highest intensity (1.0)
  assert.equal(heatmap[1], 1.0);
  // Bucket 5 (50s - 60s) has 1 comment -> ~0.33 intensity
  assert.ok(heatmap[5] > 0 && heatmap[5] < 1.0);
  // Bucket 0 (0s - 10s) has 0 comments
  assert.equal(heatmap[0], 0);

  // Coordinator active bullets
  const coordinator = new DanmakuCoordinator(5);
  coordinator.loadComments(comments);

  updateDanmakuConfig({ displayMode: "dense", durationSec: 6.0 });
  const activeAt12s = coordinator.getActiveBullets(12.0);
  // Comments c1, c2, c3 are active at 12s (since 12 - 10 <= 6)
  assert.equal(activeAt12s.length, 3);
  // Lanes should be assigned
  assert.equal(activeAt12s[0].laneIndex, 0);
  assert.ok(activeAt12s[0].progressFraction > 0);
});
