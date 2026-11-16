import test from "node:test";
import assert from "node:assert/strict";
import {
  DualWindowPieceScheduler,
  ContentProfile,
} from "../src/lib/torrent/dual-window-piece-scheduler";

test("DualWindowPieceScheduler: calculates base high and low windows for 1080p standard stream at 1.0x", () => {
  const scheduler = new DualWindowPieceScheduler({
    currentTimeSec: 60,
    durationSec: 3600,
    playbackRate: 1.0,
    contentProfile: "standard_drama",
    bitrateBps: 8_000_000, // 8 Mbps = 1 MB/s
    totalBytes: 3_600_000_000,
    pieceLength: 2 * 1024 * 1024, // 2MB pieces
    totalPieces: 1800,
  });

  const bounds = scheduler.calculateWindows();

  // Playhead piece at 60s of 3600s: 60/3600 * 3.6GB = 60MB -> piece 30
  assert.equal(bounds.currentPieceIndex, 30);
  assert.equal(bounds.highWindow.startPiece, 30);

  // Standard drama: baseUrgentSec = 20s, burstMultiplier = 1.3
  // Bytes = 20s * (8Mbps / 8) * 1.3 = 26 MB -> 13 pieces (at 2MB/piece)
  assert.equal(bounds.urgentTargetSeconds, 20);
  assert.ok(bounds.highWindow.pieceCount >= 13, `High window piece count was ${bounds.highWindow.pieceCount}`);
  assert.equal(bounds.highWindow.endPiece, bounds.highWindow.startPiece + bounds.highWindow.pieceCount - 1);

  // Low window starts immediately after high window
  assert.equal(bounds.lowWindow.startPiece, bounds.highWindow.endPiece + 1);
  assert.ok(bounds.lowWindow.pieceCount > 20, "Low window covers forward lookahead pieces");
  assert.equal(bounds.burstMultiplier, 1.3);
});

test("DualWindowPieceScheduler: dynamically scales windows for university lectures at 1.5x speed", () => {
  const scheduler = new DualWindowPieceScheduler({
    currentTimeSec: 120,
    durationSec: 5400, // 90 min lecture
    playbackRate: 1.5, // 1.5x speed
    contentProfile: "lecture",
    bitrateBps: 2_000_000, // 2 Mbps
    totalBytes: 1_350_000_000,
    pieceLength: 1 * 1024 * 1024, // 1MB pieces
    totalPieces: 1350,
  });

  const bounds = scheduler.calculateWindows();

  // At 1.5x, urgent buffer scales from base 15s to 22.5s
  assert.equal(bounds.urgentTargetSeconds, 15 * 1.5);
  // Lookahead scales from base 120s to 180s
  assert.equal(bounds.lookaheadTargetSeconds, 120 * 1.5);
  assert.equal(bounds.burstMultiplier, 1.1);

  // Telemetry check: when downloading at 400 KB/s vs 1.5x drain rate (2Mbps/8 * 1.5 = 375 KB/s)
  // Seed pieces in high window
  scheduler.markPiecesBatch([30, 31, 32, 33, 34, 35, 36, 37, 38, 39], true);
  const telemetry = scheduler.evaluateTelemetry(400_000);

  assert.ok(telemetry.bufferedSeconds > 0, "Telemetry registers buffered seconds ahead");
  assert.equal(telemetry.underrunRisk, "none");
});

test("DualWindowPieceScheduler: adapts burst multiplier for 4K Action film", () => {
  const scheduler = new DualWindowPieceScheduler({
    currentTimeSec: 500,
    durationSec: 7200,
    playbackRate: 1.0,
    contentProfile: "action_4k",
    bitrateBps: 40_000_000, // 40 Mbps 4K
    pieceLength: 4 * 1024 * 1024, // 4MB pieces
    totalPieces: 9000,
  });

  const bounds = scheduler.calculateWindows();

  // 4K action has a 2.2x burst safety factor
  assert.equal(bounds.burstMultiplier, 2.2);
  assert.equal(bounds.urgentTargetSeconds, 30.0);
  assert.ok(bounds.highWindow.pieceCount >= 30, `High window piece count was ${bounds.highWindow.pieceCount}`);
});

test("DualWindowPieceScheduler: handles seek jumps with immediate Seek Halo and request invalidation", () => {
  const scheduler = new DualWindowPieceScheduler({
    currentTimeSec: 100,
    durationSec: 3600,
    totalPieces: 1800,
    pieceLength: 2 * 1024 * 1024,
    totalBytes: 3_600_000_000,
  });

  // Jump from 100s to 1800s (halfway through film)
  const bounds = scheduler.updateContext({ currentTimeSec: 1800, isSeeking: true });

  assert.ok(bounds.seekHalo, "Seek halo is generated on seek event");
  const halo = bounds.seekHalo!;

  // Target piece at 1800s (50%) of 1800 pieces is 900
  assert.equal(bounds.currentPieceIndex, 900);
  assert.equal(halo.startPiece, 898); // 2 pieces backward for container/keyframe
  assert.equal(halo.endPiece, 908); // 8 pieces forward

  const priorities = scheduler.getPiecePriorities();
  const criticalItems = priorities.filter((p) => p.priority === "critical");
  assert.ok(criticalItems.length > 0, "Critical tier contains seek halo pieces");
  assert.equal(criticalItems[0].reason, "seek_halo_instant_frame");
});

test("DualWindowPieceScheduler: prioritizes pieces with windowed rarest-first in low window", () => {
  const scheduler = new DualWindowPieceScheduler({
    currentTimeSec: 0,
    durationSec: 1000,
    totalPieces: 100,
    pieceLength: 1024 * 1024,
    bitrateBps: 8_000_000,
  });

  const bounds = scheduler.calculateWindows();

  // Mock swarm rarity map: lower number = rarer in swarm
  const rarityMap = new Map<number, number>();
  rarityMap.set(bounds.lowWindow.startPiece, 10); // Common
  rarityMap.set(bounds.lowWindow.startPiece + 1, 2); // Extremely rare!
  rarityMap.set(bounds.lowWindow.startPiece + 2, 5); // Moderately rare

  const priorities = scheduler.getPiecePriorities(rarityMap);
  const lowPriorities = priorities.filter((p) => p.priority === "low");

  assert.ok(lowPriorities.length >= 2);
  // The rarest piece (rarity = 2) should be scheduled first among low window pieces
  assert.equal(lowPriorities[0].pieceIndex, bounds.lowWindow.startPiece + 1);
  assert.equal(lowPriorities[0].reason, "lookahead_rarest_first_2");
});
