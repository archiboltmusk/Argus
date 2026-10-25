// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import {
  recordHostThroughput,
  recordHostFailure,
  getHostScoreBonus,
  clearHostHealthStore,
} from "../src/lib/streams/host-health.ts";

test("Host Health EWMA penalizes failing hosts and boosts consistent fast hosts", () => {
  clearHostHealthStore();

  const fastUrl = "https://fast-cdn.video-delivery.org/stream.mp4";
  const failingUrl = "https://slow-flakey-cdn.example.net/stream.mp4";

  // Initially unmeasured host has 0 bonus
  assert.equal(getHostScoreBonus(fastUrl), 0);

  // Record 2 fast samples for fastUrl (>= 15 Mbps)
  recordHostThroughput(fastUrl, 25, 60);
  recordHostThroughput(fastUrl, 28, 55);
  assert.equal(getHostScoreBonus(fastUrl), 35); // Stellar CDN bonus

  // Record 2 failures for failingUrl
  recordHostFailure(failingUrl);
  recordHostFailure(failingUrl);
  assert.equal(getHostScoreBonus(failingUrl), -35); // Soft penalty for 2 failures

  // 3rd failure trips the circuit breaker
  recordHostFailure(failingUrl);
  assert.equal(getHostScoreBonus(failingUrl), -75); // Circuit breaker penalty
});
