import assert from "node:assert/strict";
import test from "node:test";
import { demotedHashes, parseGroupList, parseHostList, recordPlayOutcome, streamHost } from "../src/lib/streams/dead-links.ts";

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

test("host list is normalized and stream hosts are read", () => {
  assert.deepEqual(parseHostList("https://www.PixelDrain.com/u/x, cdn.example.org:443\n"), [
    "pixeldrain.com",
    "cdn.example.org",
  ]);
  assert.equal(streamHost("https://pixeldrain.com/api/file/x"), "pixeldrain.com");
  assert.equal(streamHost("magnet:?xt=urn:btih:abc"), null);
  assert.equal(streamHost("not a url"), null);
});
