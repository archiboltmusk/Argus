import assert from "node:assert/strict";
import test from "node:test";
import {
  demotedHashes,
  isStreamTargetDead,
  isStreamTargetVerified,
  markStreamAsCorrect,
  markStreamAsDead,
  parseGroupList,
  parseHostList,
  recordPlayOutcome,
  streamHost,
  streamTargetKey,
  unmarkStreamCorrect,
  verifiedCorrectHashes,
} from "../src/lib/streams/dead-links.ts";

function fakeKv() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

test("two quick exits demote a hash, a real watch clears it", () => {
  const kv = fakeKv();
  recordPlayOutcome("ABC", 5, kv, 1000);
  assert.deepEqual(demotedHashes(kv, 1000), []);
  recordPlayOutcome("abc", 8, kv, 2000);
  assert.deepEqual(demotedHashes(kv, 2000), ["abc"]);
  recordPlayOutcome("abc", 600, kv, 3000);
  assert.deepEqual(demotedHashes(kv, 3000), []);
});

test("entries expire after a week", () => {
  const kv = fakeKv();
  recordPlayOutcome("h", 1, kv, 0);
  recordPlayOutcome("h", 1, kv, 1);
  assert.equal(demotedHashes(kv, 8 * 24 * 3600 * 1000).length, 0);
});

test("group list is normalized", () => {
  assert.deepEqual(parseGroupList("flux, NTb\n qxr ,,"), ["FLUX", "NTB", "QXR"]);
});

test("streamTargetKey and markStream functions support non-torrent HTTP streams", () => {
  const kv = fakeKv();
  const directStream = { url: "https://example.com/video.mp4?token=123", addonId: "cinemeta" };
  const key = streamTargetKey(directStream);
  assert.equal(key, "u:example.com/video.mp4");

  assert.equal(isStreamTargetVerified(directStream, kv), false);
  assert.equal(isStreamTargetDead(directStream, kv), false);

  markStreamAsCorrect(directStream, kv, 1000);
  assert.equal(isStreamTargetVerified(directStream, kv, 1000), true);
  assert.equal(verifiedCorrectHashes(kv, 1000).includes(key!), true);

  unmarkStreamCorrect(directStream, kv);
  assert.equal(isStreamTargetVerified(directStream, kv, 1000), false);

  markStreamAsDead(directStream, kv, 1000);
  assert.equal(isStreamTargetDead(directStream, kv, 1000), true);
});

