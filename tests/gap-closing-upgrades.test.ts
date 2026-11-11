import { test } from "node:test";
import assert from "node:assert/strict";
import "./_localstorage-stub.ts";

// 1. Battery Eco-Matrix
import {
  isEcoModeActive,
  buildBatteryEcoMpvCommands,
  setMockBatteryStatus,
  updateBatteryEcoConfig,
  getBatteryEcoConfig,
} from "../src/lib/player/battery-eco-matrix";

// 2. Pinch-Zoom Canvas
import { PinchZoomCanvasController } from "../src/lib/player/pinch-zoom-canvas";

// 3. Audio Time-Stretch
import {
  setPlaybackSpeed,
  getCurrentPlaybackSpeed,
  getSteppedSpeed,
  buildAudioTimeStretchMpvCommands,
  updateAudioTimeStretchConfig,
  getAudioTimeStretchConfig,
  SPEED_LADDER,
} from "../src/lib/audio/audio-timestretch-engine";

// 4. IPTV Timeshift & DVR
import {
  IptvTimeshiftManager,
  DvrSchedulerQueue,
} from "../src/lib/iptv/iptv-dvr-timeshift";

// 5. Adaptive Stream Fallback
import {
  evaluateStreamAdaptation,
  type StreamQualityProfile,
  type NetworkHealthSample,
} from "../src/lib/streams/adaptive-stream-fallback";

// --- 1. BATTERY ECO-MATRIX TESTS ---
test("Battery Eco-Matrix: power state detection, policy gating and MPV commands", () => {
  updateBatteryEcoConfig({ policy: "auto-battery", engageBelowPercent: 80 });

  // On AC power -> Eco mode not active
  setMockBatteryStatus({ isCharging: true, level: 0.5, powerSource: "ac-power" });
  assert.equal(isEcoModeActive(), false);

  // On Battery at 95% (> 80%) -> Not active
  setMockBatteryStatus({ isCharging: false, level: 0.95, powerSource: "battery" });
  assert.equal(isEcoModeActive(), false);

  // On Battery at 70% (<= 80%) -> Engaged!
  setMockBatteryStatus({ isCharging: false, level: 0.7, powerSource: "battery" });
  assert.equal(isEcoModeActive(), true);

  const commands = buildBatteryEcoMpvCommands();
  assert.ok(commands.some((c) => c.name === "hwdec" && c.value === "auto"));
  assert.ok(commands.some((c) => c.name === "video-sync" && c.value === "audio"));
  assert.ok(commands.some((c) => c.name === "glsl-shaders" && c.value === ""));
});

// --- 2. PINCH-ZOOM CANVAS TESTS ---
test("Pinch-Zoom Canvas: multi-touch scaling, bounds clamping, reset and MPV coordinates", () => {
  const controller = new PinchZoomCanvasController({ minScale: 1.0, maxScale: 8.0 });
  controller.setViewportSize(1920, 1080);

  // Initial state
  const initial = controller.getTransform();
  assert.equal(initial.scale, 1.0);
  assert.equal(initial.isZoomed, false);
  assert.equal(controller.toCssTransform(), "none");

  // Zoom in 2.0x
  controller.handlePinchZoom(2.0, 960, 540);
  const zoomed = controller.getTransform();
  assert.equal(zoomed.scale, 2.0);
  assert.equal(zoomed.isZoomed, true);
  assert.ok(controller.toCssTransform().includes("scale(2)"));

  // Pan within bounds
  controller.handlePan(100, 50);
  const panned = controller.getTransform();
  assert.ok(panned.offsetX !== 0);

  // MPV properties
  const mpvProps = controller.toMpvProperties();
  assert.ok(mpvProps.some((p) => p.name === "video-zoom" && p.value === "1.000")); // log2(2) = 1

  // Reset
  controller.reset();
  assert.equal(controller.getTransform().scale, 1.0);
  assert.equal(controller.getTransform().isZoomed, false);
});

// --- 3. AUDIO TIME-STRETCH TESTS ---
test("Audio Time-Stretch: extreme speed ladder, pitch preservation and scaletempo2 filters", () => {
  assert.ok(SPEED_LADDER.includes(1.0));
  assert.ok(SPEED_LADDER.includes(2.5));
  assert.ok(SPEED_LADDER.includes(6.0));

  // Stepping speed
  assert.equal(getSteppedSpeed(1.0, "up"), 1.25);
  assert.equal(getSteppedSpeed(1.25, "up"), 1.5);
  assert.equal(getSteppedSpeed(1.0, "down"), 0.75);

  setPlaybackSpeed(2.0);
  assert.equal(getCurrentPlaybackSpeed(), 2.0);

  updateAudioTimeStretchConfig({ searchIntervalMs: 30, dialogueFormantCompensation: true });
  const cmds = buildAudioTimeStretchMpvCommands(2.0);

  assert.ok(cmds.some((c) => c.name === "speed" && c.value === "2"));
  assert.ok(cmds.some((c) => c.name === "audio-pitch-correction" && c.value === "yes"));
  const afFilter = cmds.find((c) => c.name === "af")?.value ?? "";
  assert.ok(afFilter.includes("scaletempo2=search-interval=30"));
  // Formant compensation at 2.0x includes equalizer
  assert.ok(afFilter.includes("equalizer="));
});

// --- 4. IPTV TIMESHIFT & DVR TESTS ---
test("IPTV Timeshift & DVR: live buffering, backwards scrub, jump to live, and scheduler ticks", () => {
  const manager = new IptvTimeshiftManager(3600);
  const now = 10000000;
  manager.initializeChannel("ch-espn", now);

  // Fast forward live head by 600 seconds (10 minutes)
  manager.updateLiveHead(now + 600 * 1000);
  const stateLive = manager.getState();
  assert.equal(stateLive?.isLiveHead, true);

  // Seek 300 seconds (5 mins) behind live head
  manager.seekTimeshift(-300);
  const stateBehind = manager.getState();
  assert.equal(stateBehind?.isLiveHead, false);
  assert.equal(stateBehind?.currentPlaybackMs, stateBehind?.liveHeadMs! - 300 * 1000);

  // Jump to live restores head
  manager.jumpToLive();
  assert.equal(manager.getState()?.isLiveHead, true);

  // DVR Scheduler Queue
  const queue = new DvrSchedulerQueue();
  const schedule = queue.scheduleProgram(
    "ch-espn",
    "ESPN HD",
    "https://iptv.example.com/stream.m3u8",
    "Champions League Final",
    now + 1000,
    120,
  );

  assert.equal(schedule.status, "scheduled");
  assert.equal(queue.getAllSchedules().length, 1);

  // Tick before start -> Still scheduled
  const tick1 = queue.evaluateTick(now);
  assert.equal(tick1.toStart.length, 0);

  // Tick during match -> Starts recording
  const tick2 = queue.evaluateTick(now + 2000);
  assert.equal(tick2.toStart.length, 1);
  assert.equal(schedule.status, "recording");

  // Tick after match -> Completed
  const tick3 = queue.evaluateTick(now + 130 * 60 * 1000);
  assert.equal(tick3.toFinish.length, 1);
  assert.equal(schedule.status, "completed");
});

// --- 5. ADAPTIVE STREAM QUALITY FALLBACK TESTS ---
test("Adaptive Stream Fallback: emergency downscale on buffer low and opportunistic upscale", () => {
  const profiles: StreamQualityProfile[] = [
    { id: "p4k", resolution: "4k", bitrateMbps: 45, url: "https://cdn.example.com/4k.mkv" },
    { id: "p1080", resolution: "1080p", bitrateMbps: 12, url: "https://cdn.example.com/1080.mkv" },
    { id: "p720", resolution: "720p", bitrateMbps: 4, url: "https://cdn.example.com/720.mkv" },
  ];

  const active4k = profiles[0];

  // 1. Emergency downscale: Buffer health fell to 2.5s (< 4s min threshold)
  const criticalHealth: NetworkHealthSample = {
    measuredThroughputMbps: 50,
    bufferHealthSeconds: 2.5,
    packetDropRate: 0.05,
    timestampMs: Date.now(),
  };

  const decision1 = evaluateStreamAdaptation(active4k, profiles, criticalHealth);
  assert.equal(decision1.action, "downscale");
  assert.equal(decision1.recommendedProfile.resolution, "1080p");

  // 2. Insufficient Bandwidth: Measured throughput dropped to 8 Mbps (cannot support 12 Mbps)
  const active1080 = profiles[1];
  const lowBandwidthHealth: NetworkHealthSample = {
    measuredThroughputMbps: 8,
    bufferHealthSeconds: 8.0,
    packetDropRate: 0.01,
    timestampMs: Date.now(),
  };

  const decision2 = evaluateStreamAdaptation(active1080, profiles, lowBandwidthHealth);
  assert.equal(decision2.action, "downscale");
  assert.equal(decision2.recommendedProfile.resolution, "720p");

  // 3. Healthy stream -> Maintain
  const healthyHealth: NetworkHealthSample = {
    measuredThroughputMbps: 80,
    bufferHealthSeconds: 12.0,
    packetDropRate: 0.0,
    timestampMs: Date.now(),
  };

  const decision3 = evaluateStreamAdaptation(active4k, profiles, healthyHealth);
  assert.equal(decision3.action, "maintain");
});
