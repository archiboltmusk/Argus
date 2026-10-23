import assert from "node:assert/strict";
import test from "node:test";
import { formatTimestamp, timestampNote } from "../src/lib/study-note.ts";

test("formats timestamps", () => {
  assert.equal(formatTimestamp(863.9), "00:14:23");
  assert.equal(formatTimestamp(3725), "01:02:05");
  assert.equal(formatTimestamp(-4), "00:00:00");
});

test("builds a markdown note, with or without a link", () => {
  assert.equal(timestampNote("Fracture [Mechanics]", 863, "argus://x"), "[00:14:23 - Fracture Mechanics](argus://x)");
  assert.equal(timestampNote("Lecture", 5), "00:00:05 - Lecture");
});
