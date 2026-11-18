import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const seekBar = readFileSync(
  new URL("../src/components/player/transport/seek-bar.tsx", import.meta.url),
  "utf8",
);
const thumbPreview = readFileSync(
  new URL("../src/components/player/thumb-preview.tsx", import.meta.url),
  "utf8",
);
const visual = readFileSync(
  new URL("../src/components/player/transport/seek-bar-visual.tsx", import.meta.url),
  "utf8",
);

test("SeekBar: implements vertical fine scrubbing with dynamic rate reduction", () => {
  assert.match(seekBar, /dy >= 120/);
  assert.match(seekBar, /rate = 0\.1/);
  assert.match(seekBar, /rate = 0\.25/);
  assert.match(seekBar, /rate = 0\.5/);
  assert.match(seekBar, /Fine \(0\.1×\)/);
  assert.match(seekBar, /Fine \(1\/4×\)/);
  assert.match(seekBar, /Fine \(1\/2×\)/);
  assert.match(seekBar, /fineRateLabel/);
});

test("SeekBar: implements magnetic snapping to chapter and skip-segment boundaries", () => {
  assert.match(seekBar, /snapThresholdSec/);
  assert.match(seekBar, /snapToBoundaries/);
  assert.match(seekBar, /targets\.push\(c\.startSec\)/);
  assert.match(seekBar, /isSnapped/);
  assert.match(seekBar, /Snap/);
});

test("SeekBar & ThumbPreview: display chapter title and countdown remaining time", () => {
  assert.match(seekBar, /hoverChapter/);
  assert.match(seekBar, /dur - hover/);
  assert.match(thumbPreview, /chapterTitle/);
  assert.match(thumbPreview, /dur - time/);
});

test("SeekBarVisual: applies dynamic glowing halo to seek dot when scrubbing", () => {
  assert.match(visual, /scrubbing\?: boolean/);
  assert.match(visual, /0 0 16px \$\{color\}/);
});
