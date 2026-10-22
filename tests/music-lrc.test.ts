import assert from "node:assert/strict";
import test from "node:test";
import { activeLine, parseLrc } from "../src/lib/music/lrc.ts";

test("parses timed lines, multiple stamps and offset", () => {
  const { lines, synced } = parseLrc("[ti:Song]\n[offset:500]\n[00:01.00]one\n[00:03.50][00:09.00]two\n");
  assert.equal(synced, true);
  assert.deepEqual(lines.map((l) => l.text), ["one", "two", "two"]);
  assert.equal(lines[0].time, 1.5);
  assert.equal(lines[2].time, 9.5);
});

test("plain lyrics stay untimed", () => {
  const { lines, synced } = parseLrc("a\nb");
  assert.equal(synced, false);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].time, null);
});

test("activeLine finds the current line", () => {
  const { lines } = parseLrc("[00:01.00]a\n[00:05.00]b");
  assert.equal(activeLine(lines, 0.5), -1);
  assert.equal(activeLine(lines, 1), 0);
  assert.equal(activeLine(lines, 6), 1);
});
