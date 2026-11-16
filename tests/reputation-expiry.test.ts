import assert from "node:assert/strict";
import test from "node:test";
import { clearHostHealthStore, recordHostThroughput, getHostScoreBonus, getHostEwmaMbps } from "../src/lib/streams/host-health";
import { rateStream, calculateRatingScoreAdjustment } from "../src/lib/streams/stream-ratings";

test("host measurements expire without restarting the process", () => {
  const original = Date.now;
  let now = 1000000;
  Date.now = () => now;
  try {
    clearHostHealthStore();
    const url = "https://fixture.invalid/video";
    recordHostThroughput(url, 25, 50);
    recordHostThroughput(url, 25, 50);
    assert.equal(getHostScoreBonus(url), 35);
    now += 24 * 60 * 60 * 1000;
    assert.equal(getHostScoreBonus(url), 0);
    assert.equal(getHostEwmaMbps(url), null);
  } finally { Date.now = original; clearHostHealthStore(); }
});

test("old feedback stops influencing source selection", () => {
  const original = Date.now;
  let now = 1000000;
  Date.now = () => now;
  try {
    const stream = { infoHash: "fixture-reputation-expiry" };
    rateStream(stream, "downvote", "dead-or-buffering");
    assert.ok(calculateRatingScoreAdjustment(stream).delta < 0);
    now += 7 * 24 * 60 * 60 * 1000;
    assert.deepEqual(calculateRatingScoreAdjustment(stream), { delta: 0, isFlaggedWrong: false, isFlaggedDead: false, isVerifiedGood: false });
  } finally { Date.now = original; }
});
