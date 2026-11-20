// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import {
  hasExactAutoplayPackFile,
  isEarlyAutoplaySource,
} from "../src/views/play-picker/autoplay-readiness.ts";
import type { ScoredStream } from "../src/lib/streams/types.ts";

test("autoplay requires an indexed file matching the requested episode in a season pack", () => {
  const pack = {
    seasonPack: true,
    fileIdx: 0,
    behaviorHints: { filename: "Show.S02E03.mkv" },
  } as ScoredStream;
  assert.equal(hasExactAutoplayPackFile(pack, 2, 3), true);
  assert.equal(hasExactAutoplayPackFile(pack, 1, 3), false);
  assert.equal(hasExactAutoplayPackFile(pack, 2, 4), false);
  assert.equal(hasExactAutoplayPackFile({ ...pack, fileIdx: undefined }, 2, 3), false);
  assert.equal(hasExactAutoplayPackFile({ ...pack, behaviorHints: {} }, 2, 3), false);
});

test("provider-verified cache hits and direct links qualify for early selection", () => {
  const advertised = { title: "⚡ Instant", cached: { rd: true } } as ScoredStream;
  assert.equal(isEarlyAutoplaySource(advertised), false);
  assert.equal(isEarlyAutoplaySource({ ...advertised, cacheVerified: { rd: true } }), true);
  assert.equal(
    isEarlyAutoplaySource({ ...advertised, url: "https://cdn.example/watch.mp4" }),
    true,
  );
});
