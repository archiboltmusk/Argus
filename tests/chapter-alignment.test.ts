// @ts-expect-error Node types are outside the browser tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node types are outside the browser tsconfig.
import test from "node:test";
import { alignChapterPosition } from "../src/lib/player/chapter-alignment.ts";

test("named chapter anchors recover the same relative scene across a timeline shift", () => {
  const before = [
    { title: "Arrival", startSec: 20 },
    { title: "Departure", startSec: 50 },
  ];
  const after = [
    { title: "Arrival", startSec: 30 },
    { title: "Departure", startSec: 60 },
  ];
  assert.equal(alignChapterPosition(before, after, 35), 45);
  assert.equal(alignChapterPosition(before, [after[0]], 35), null);
  assert.equal(alignChapterPosition(before, [...after, after[0]], 35), null);
  assert.equal(alignChapterPosition(before, [after[0], { ...after[1], startSec: 90 }], 35), null);
});
