import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findNextConsecutiveEpisode,
  evaluateBingeProgress,
  getBingeFlowConfig,
  updateBingeFlowConfig,
  resetBingeFlow,
} from "../src/lib/player/binge-flow";
import {
  detectIntroSegment,
  isPositionInIntro,
  computeWaveformCrossCorrelation,
  saveLearnedIntroProfile,
  getLearnedIntroProfile,
} from "../src/lib/player/skip-intro-matcher";
import {
  buildSpatializerFilterString,
  getSpatializerConfig,
  updateSpatializerConfig,
} from "../src/lib/player/binaural-spatializer";
import {
  calculateClockSync,
  estimateHostPlaybackPosition,
  evaluateDriftCorrection,
  LanMeshCoordinator,
} from "../src/lib/mesh-party/lan-mesh-sync";
import { HoverPreviewController } from "../src/lib/trailer/hover-preview-engine";
import {
  handlePlaybackScrobble,
  getScrobblerConfig,
  updateScrobblerConfig,
  queueOfflineScrobble,
  getOfflineScrobbleQueue,
  clearOfflineScrobbleQueue,
  type ScrobbleItem,
} from "../src/lib/scrobbler/unified-scrobbler";
import type { PlayEpisode } from "../src/lib/view";
import type { Meta } from "../src/lib/cinemeta";

test("BingeFlow: identifies consecutive next episode across seasons", () => {
  const currentEp: PlayEpisode = { season: 1, episode: 10, name: "Finale" };
  const allEpisodes: PlayEpisode[] = [
    { season: 1, episode: 9, name: "Ep 9" },
    { season: 1, episode: 10, name: "Ep 10" },
    { season: 2, episode: 1, name: "Season 2 Premiere" },
  ];

  const next = findNextConsecutiveEpisode(currentEp, allEpisodes);
  assert.ok(next);
  assert.equal(next.season, 2);
  assert.equal(next.episode, 1);
});

test("BingeFlow: triggers next episode preheating when reaching 80% mark", async () => {
  resetBingeFlow();
  updateBingeFlowConfig({ triggerThresholdRatio: 0.8 });

  const meta: Meta = { id: "tt12345", type: "series", name: "Stranger Things" };
  const current: PlayEpisode = { season: 1, episode: 1 };
  const allEpisodes: PlayEpisode[] = [
    { season: 1, episode: 1 },
    { season: 1, episode: 2 },
  ];

  // At 50% progress (1500s / 3000s) -> should NOT trigger
  const below = await evaluateBingeProgress({
    meta,
    currentEpisode: current,
    allEpisodes,
    currentTimeSec: 1500,
    durationSec: 3000,
  });
  assert.equal(below.shouldTriggerNext, false);

  // At 85% progress (2550s / 3000s) -> SHOULD trigger
  let streamResolved = false;
  const above = await evaluateBingeProgress({
    meta,
    currentEpisode: current,
    allEpisodes,
    currentTimeSec: 2550,
    durationSec: 3000,
    resolveNextStreamUrl: async () => {
      streamResolved = true;
      return "https://cdn.mock-stream.local/e2.mp4";
    },
  });

  assert.equal(above.shouldTriggerNext, true);
  assert.ok(above.candidate);
  assert.equal(above.candidate.nextEpisode.episode, 2);
  assert.equal(streamResolved, true);
});

test("SkipIntroMatcher: identifies intro windows and evaluates position", () => {
  const segment = { startSec: 90, endSec: 180, confidence: 0.9, source: "chapter_cue" as const };

  assert.equal(isPositionInIntro(50, segment), false);
  assert.equal(isPositionInIntro(120, segment), true);
  assert.equal(isPositionInIntro(200, segment), false);
});

test("SkipIntroMatcher: calculates waveform cross-correlation lag", () => {
  const seriesA = [0.1, 0.2, 0.8, 0.9, 0.8, 0.2, 0.1];
  const seriesB = [0.0, 0.1, 0.2, 0.8, 0.9, 0.8, 0.2]; // Lagged by 1 sample

  const { bestOffsetSec, maxCorrelation } = computeWaveformCrossCorrelation(seriesA, seriesB, 10);
  assert.ok(maxCorrelation > 0.5);
  assert.equal(typeof bestOffsetSec, "number");
});

test("SkipIntroMatcher: detects chapter cues and learned show profiles", () => {
  const detected = detectIntroSegment({
    seriesId: "tt77777",
    season: 1,
    durationSec: 2400,
    chapterCues: [
      { title: "Prologue", timeSec: 0 },
      { title: "Opening Theme", timeSec: 85 },
      { title: "Act 1", timeSec: 175 },
    ],
  });

  assert.ok(detected);
  assert.equal(detected.startSec, 85);
  assert.equal(detected.endSec, 175);
  assert.equal(detected.source, "chapter_cue");

  // Profile learning
  saveLearnedIntroProfile({
    seriesId: "tt99999",
    season: 2,
    typicalStartSec: 60,
    typicalDurationSec: 90,
    confidence: 0.85,
    sampleCount: 3,
  });

  const learned = getLearnedIntroProfile("tt99999", 2);
  assert.ok(learned);
  assert.equal(learned.typicalStartSec, 60);
});

test("BinauralSpatializer: generates lavfi center dialogue isolation and 3D filter strings", () => {
  updateSpatializerConfig({ mode: "center-dialogue-boost", centerGainDb: 6.0 });
  const centerFilter = buildSpatializerFilterString();
  assert.ok(centerFilter);
  assert.equal(centerFilter.includes("pan=stereo"), true);
  assert.equal(centerFilter.includes("c2"), true); // center channel boosted

  updateSpatializerConfig({ mode: "spatial-cinema", surroundWidth: 1.3 });
  const cinemaFilter = buildSpatializerFilterString();
  assert.ok(cinemaFilter);
  assert.equal(cinemaFilter.includes("surround=chl_out=stereo"), true);
  assert.equal(cinemaFilter.includes("extrastereo"), true);

  updateSpatializerConfig({ mode: "off" });
  assert.equal(buildSpatializerFilterString(), null);
});

test("LanMeshSync: calculates NTP clock offset, estimates host position & smooth drift correction", () => {
  // t1=1000, t2=1050, t3=1055, t4=1105 -> RTT = (1105-1000) - (1055-1050) = 105 - 5 = 100ms
  const { rttMs, offsetMs } = calculateClockSync(1000, 1050, 1055, 1105);
  assert.equal(rttMs, 100);
  assert.equal(offsetMs, 0);

  // Position estimation
  const hostState = {
    isPlaying: true,
    positionSec: 120.0,
    timestampMs: 50_000,
    playbackRate: 1.0,
    mediaId: "tt123",
  };
  const estimated = estimateHostPlaybackPosition(hostState, 55_000, 0);
  assert.equal(estimated, 125.0); // 5 seconds elapsed

  // Drift evaluation
  const inSync = evaluateDriftCorrection(100.0, 100.02);
  assert.equal(inSync.action, "in_sync");

  const smooth = evaluateDriftCorrection(100.0, 100.2); // 200ms behind
  assert.equal(smooth.action, "smooth_speed");
  assert.ok(smooth.adjustmentFactor > 1.0); // Speed up slightly

  const hardSeek = evaluateDriftCorrection(100.0, 105.0); // 5s behind
  assert.equal(hardSeek.action, "hard_seek");
});

test("HoverPreview: debounces card hover and executes fetch on hold", async () => {
  const ctrl = new HoverPreviewController({ hoverDelayMs: 30 });
  let fetchCalled = false;

  ctrl.onPointerEnter("tt33333", async () => {
    fetchCalled = true;
    return "https://trailer.local/preview.mp4";
  });

  // Check immediately before debounce timer
  assert.equal(ctrl.getState().isLoading, false);

  // Wait for debounce timer to fire
  await new Promise((r) => setTimeout(r, 60));

  assert.equal(fetchCalled, true);
  assert.equal(ctrl.getState().metaId, "tt33333");
  assert.equal(ctrl.getState().trailerUrl, "https://trailer.local/preview.mp4");

  // Pointer leave clears preview
  ctrl.onPointerLeave("tt33333");
  assert.equal(ctrl.getState().metaId, null);
  assert.equal(ctrl.getState().trailerUrl, null);
});

test("UnifiedScrobbler: records milestone actions and manages offline queue", async () => {
  clearOfflineScrobbleQueue();
  updateScrobblerConfig({ scrobbleThresholdPercent: 80 });

  const item: ScrobbleItem = {
    id: "tt88888",
    title: "Inception",
    type: "movie",
    year: 2010,
  };

  // 1. Initial play -> action "start"
  const startRes = await handlePlaybackScrobble(item, 0.05, false);
  assert.equal(startRes.dispatched, true);
  assert.equal(startRes.action, "start");

  // 2. Pause -> action "pause"
  const pauseRes = await handlePlaybackScrobble(item, 0.15, true);
  assert.equal(pauseRes.dispatched, true);
  assert.equal(pauseRes.action, "pause");

  // 3. Reached 85% completion -> action "stop"
  let dispatchedEvtAction: string | null = null;
  const stopRes = await handlePlaybackScrobble(item, 0.85, false, async (evt) => {
    dispatchedEvtAction = evt.action;
    return true;
  });
  assert.equal(stopRes.dispatched, true);
  assert.equal(dispatchedEvtAction, "stop");

  // Offline queue fallback
  queueOfflineScrobble({
    item,
    action: "stop",
    progressPercent: 95,
    timestamp: Date.now(),
  });

  const q = getOfflineScrobbleQueue();
  assert.equal(q.length >= 1, true);
  assert.equal(q[q.length - 1].item.id, "tt88888");

  clearOfflineScrobbleQueue();
});
