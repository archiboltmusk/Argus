// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import {
  evaluateStallStatus,
  findNextFallbackStream,
  isStreamPlayable,
  STALL_TIMEOUT_MS,
} from "../src/lib/player/stall-fallback.ts";
import type { ScoredStream } from "../src/lib/streams/types.ts";
import type { DebridStore } from "../src/lib/debrid/types.ts";

function createMockStream(overrides: Partial<ScoredStream>): ScoredStream {
  return {
    addonId: "test-addon",
    addonName: "Test Addon",
    parsedTitle: "Movie.1080p.BluRay",
    resolution: "1080p",
    codec: "HEVC",
    source: "BluRay",
    audio: { codec: "AAC", channels: 2 },
    audioLanguages: ["en"],
    cached: {},
    inLibrary: {},
    remux: false,
    repackIteration: 0,
    proper: false,
    hardcoded: false,
    scamScore: 0,
    score: 100,
    reasons: [],
    tier: "1080p",
    ...overrides,
  };
}

const mockDebrids: DebridStore[] = [
  {
    slug: "rd",
    name: "Real-Debrid",
    token: "valid-token",
    expiresAt: Date.now() + 100000,
  } as unknown as DebridStore,
];

test("isStreamPlayable identifies playable direct HTTP and cached debrid streams", () => {
  const httpStream = createMockStream({ url: "https://cdn.example.com/movie.mp4" });
  assert.equal(isStreamPlayable(httpStream, []), true);

  const uncachedTorrent = createMockStream({ infoHash: "abc123hash" });
  assert.equal(isStreamPlayable(uncachedTorrent, mockDebrids), false);

  const cachedTorrent = createMockStream({
    infoHash: "abc123hash",
    cached: { rd: true },
  });
  assert.equal(isStreamPlayable(cachedTorrent, mockDebrids), true);
  assert.equal(isStreamPlayable(cachedTorrent, []), false);
});

test("findNextFallbackStream selects next best stream skipping current URL and hash", () => {
  const s1 = createMockStream({ url: "https://current.example.com/play.mp4" });
  const s2 = createMockStream({ infoHash: "uncached_hash" });
  const s3 = createMockStream({ infoHash: "cached_rd_hash", cached: { rd: true } });
  const s4 = createMockStream({ url: "https://backup.example.com/play.mp4" });

  const candidates = [s1, s2, s3, s4];

  // Currently playing s1 (by url): skips s1 and uncached s2, returns cached s3
  const next = findNextFallbackStream(
    candidates,
    "https://current.example.com/play.mp4",
    null,
    mockDebrids,
  );
  assert.equal(next, s3);

  // Currently playing s3 (by hash): skips s3, returns direct HTTP s4
  const nextAfterS3 = findNextFallbackStream(
    candidates,
    null,
    "CACHED_RD_HASH", // case insensitive check
    mockDebrids,
  );
  assert.equal(nextAfterS3, s1);
});

test("evaluateStallStatus respects user pause and ended states", () => {
  const now = 100_000;
  const paused = evaluateStallStatus({
    status: "paused",
    buffering: true,
    coreIdle: true,
    lastProgressAt: now - 15_000,
    now,
  });
  assert.equal(paused.isStalled, false);

  const ended = evaluateStallStatus({
    status: "ended",
    buffering: true,
    lastProgressAt: now - 15_000,
    now,
  });
  assert.equal(ended.isStalled, false);
});

test("evaluateStallStatus triggers after 8s buffering (paused-for-cache)", () => {
  const now = 100_000;
  const underThreshold = evaluateStallStatus({
    status: "playing",
    buffering: true,
    lastProgressAt: now - 7_000,
    now,
  });
  assert.equal(underThreshold.isStalled, false);

  const overThreshold = evaluateStallStatus({
    status: "playing",
    buffering: true,
    lastProgressAt: now - 8_500,
    now,
  });
  assert.equal(overThreshold.isStalled, true);
  assert.equal(overThreshold.reason, "buffering");
});

test("evaluateStallStatus triggers after 8s core-idle while playing", () => {
  const now = 100_000;
  const idle = evaluateStallStatus({
    status: "playing",
    buffering: false,
    coreIdle: true,
    lastProgressAt: now - 8_001,
    now,
  });
  assert.equal(idle.isStalled, true);
  assert.equal(idle.reason, "core-idle");
});

test("evaluateStallStatus triggers after 8s elapsed since last decoded frame", () => {
  const now = 100_000;
  const frozen = evaluateStallStatus({
    status: "playing",
    buffering: false,
    coreIdle: false,
    lastDecodedFrameAt: now - 9_000,
    lastProgressAt: now - 9_000,
    now,
  });
  assert.equal(frozen.isStalled, true);
  assert.equal(frozen.reason, "frozen-clock");
});

test("frame stall detection preserves healthy progress, startup and cached playback", () => {
  const now = 100_000;
  const base = {
    status: "playing",
    buffering: false,
    lastDecodedFrameAt: now - 9_000,
    lastProgressAt: now - 9_000,
    now,
  };
  for (const overrides of [
    { lastProgressAt: now - 100 },
    { lastDecodedFrameAt: 0 },
    { lastDecodedFrameAt: now + 100 },
    { bufferedSec: 0.5 },
    { status: "paused" },
    { status: "ended" },
    { status: "idle" },
  ]) {
    assert.equal(evaluateStallStatus({ ...base, ...overrides }).isStalled, false);
  }
  assert.equal(evaluateStallStatus({ ...base, lastDecodedFrameAt: now - 7_999 }).isStalled, false);
  assert.equal(evaluateStallStatus({ ...base, lastDecodedFrameAt: now - 8_000 }).isStalled, true);
});
