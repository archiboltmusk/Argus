import assert from "node:assert/strict";
import test from "node:test";
import { loadLabState, saveLabState, resetLabState, importLabState, allowsAutomaticRecovery } from "../src/lib/argus-lab.ts";
import { getStreamRating, rateStream } from "../src/lib/streams/stream-ratings.ts";

test("Lab commits atomically and preserves policy when storage fails", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  let fail = false;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { if (fail) throw new Error("quota"); values.set(key, value); },
  } });
  try {
    assert.equal(loadLabState().contract["auto-switch"], true);
    const state = loadLabState();
    state.contract["auto-switch"] = false;
    assert.equal(saveLabState(state), true);
    assert.equal(values.size, 1);
    fail = true;
    assert.equal(resetLabState(), null);
    assert.equal(allowsAutomaticRecovery(), false);
    values.set("argus.lab.state.v1", "broken");
    assert.equal(allowsAutomaticRecovery(), false);
    values.delete("argus.lab.state.v1");
    values.set("argus.experience-contract.v1", "broken");
    assert.equal(allowsAutomaticRecovery(), false);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("Lab rejects oversized backups and preserves missing defaults", () => {
  assert.equal(importLabState(" ".repeat(65537)), null);
  assert.equal(importLabState('{"version":1,"mode":"balanced"}')?.contract["auto-switch"], true);
});

test("rating snapshots stay stable between reads and change after each vote", () => {
  const stream = { infoHash: "regression-snapshot" };
  assert.equal(getStreamRating(stream), getStreamRating(stream));
  rateStream(stream, "downvote", "wrong-movie");
  const first = getStreamRating(stream);
  rateStream(stream, "upvote");
  const second = getStreamRating(stream);
  assert.notEqual(first, second);
  assert.equal(first.downvotes, 1);
  assert.equal(first.reasons["wrong-movie"], 1);
  assert.equal(second.downvotes, 0);
  assert.equal(second.upvotes, 1);
  assert.equal(second.reasons["wrong-movie"], 0);
  rateStream(stream, "upvote");
  assert.equal(getStreamRating(stream).upvotes, 0);
});
