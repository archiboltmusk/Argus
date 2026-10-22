import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTimestamp,
  isReactionOnly,
  parseTimestampNote,
  timestampTag,
  tokenizeChat,
} from "../src/lib/together/chat-extras";

test("formats and parses time-coded notes", () => {
  assert.equal(formatTimestamp(754), "12:34");
  assert.equal(formatTimestamp(3725), "1:02:05");
  assert.equal(timestampTag(61), "[1:01] ");
  assert.deepEqual(parseTimestampNote("[12:34] best scene"), { sec: 754, note: "best scene" });
  assert.deepEqual(parseTimestampNote("[1:02:05]"), { sec: 3725, note: "" });
  assert.equal(parseTimestampNote("[12:99] nope"), null);
  assert.equal(parseTimestampNote("see [12:34]"), null);
});

test("detects reaction-only messages", () => {
  assert.equal(isReactionOnly("🔥"), true);
  assert.equal(isReactionOnly("❤️"), true);
  assert.equal(isReactionOnly("lol 🔥"), false);
  assert.equal(isReactionOnly("12"), false);
});

test("tokenizes bold, italic and code without touching other text", () => {
  assert.deepEqual(tokenizeChat("a **b** _c_ `d` *e* f_g_h"), [
    { kind: "text", value: "a " },
    { kind: "bold", value: "b" },
    { kind: "text", value: " " },
    { kind: "italic", value: "c" },
    { kind: "text", value: " " },
    { kind: "code", value: "d" },
    { kind: "text", value: " " },
    { kind: "italic", value: "e" },
    { kind: "text", value: " f_g_h" },
  ]);
  assert.deepEqual(tokenizeChat("<b>hi</b> 2 * 3 * 4"), [{ kind: "text", value: "<b>hi</b> 2 * 3 * 4" }]);
});
