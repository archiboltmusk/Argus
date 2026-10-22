// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { medianMs, pushOutcome, statusOf, type AddonHealth } from "../src/lib/addon-health/health.ts";

function run(oks: boolean[]): AddonHealth {
  let h: AddonHealth | undefined;
  oks.forEach((ok, i) => {
    h = pushOutcome(h, { ok, ms: 100 + i, at: 1_000 + i });
  });
  return h as AddonHealth;
}

test("too few samples stay unknown", () => {
  assert.equal(statusOf(run([false, false])), "unknown");
});

test("mostly failing is failing", () => {
  assert.equal(statusOf(run([true, false, false, false, false])), "failing");
});

test("three recent failures after good history is failing", () => {
  assert.equal(statusOf(run([true, true, true, true, true, true, false, false, false])), "failing");
});

test("mixed results are degraded, clean results healthy", () => {
  assert.equal(statusOf(run([true, false, true, false, true])), "degraded");
  assert.equal(statusOf(run([true, true, true, true, true])), "healthy");
});

test("window keeps only the latest 20 and median ignores failures", () => {
  const h = run(Array.from({ length: 30 }, () => true));
  assert.equal(h.outcomes.length, 20);
  assert.notEqual(medianMs(h), null);
  assert.equal(medianMs(run([false, false])), null);
});
