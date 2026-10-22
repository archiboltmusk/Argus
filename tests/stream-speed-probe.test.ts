import assert from "node:assert/strict";
import test from "node:test";
import { gradeSpeed, probeStreamSpeed } from "../src/lib/streams/speed-probe";

function bodyOf(bytes: number): ReadableStream<Uint8Array> {
  let sent = false;
  return new ReadableStream({
    pull(controller) {
      if (sent) return controller.close();
      sent = true;
      controller.enqueue(new Uint8Array(bytes));
    },
  });
}

test("measures latency and throughput from a ranged read", async () => {
  let clock = 0;
  const times = [0, 120, 620];
  const result = await probeStreamSpeed("https://example.test/a.mkv", {
    sampleBytes: 1_000_000,
    now: () => times[clock++] ?? 620,
    fetchImpl: (async (_url: unknown, init?: RequestInit) => {
      assert.equal((init?.headers as Record<string, string>).Range, "bytes=0-999999");
      return new Response(bodyOf(1_000_000), { status: 206 });
    }) as typeof fetch,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.latencyMs, 120);
    assert.equal(result.mbps, 16);
  }
});

test("reports an http error status", async () => {
  const result = await probeStreamSpeed("https://example.test/a.mkv", {
    fetchImpl: (async () => new Response("no", { status: 403 })) as typeof fetch,
  });
  assert.deepEqual(result, { ok: false, reason: "http-error", status: 403 });
});

test("reports unreachable on a network failure", async () => {
  const result = await probeStreamSpeed("https://example.test/a.mkv", {
    fetchImpl: (async () => {
      throw new Error("down");
    }) as typeof fetch,
  });
  assert.deepEqual(result, { ok: false, reason: "unreachable" });
});

test("grades against the required bitrate", () => {
  assert.equal(gradeSpeed(100, 25), "fast");
  assert.equal(gradeSpeed(35, 25), "ok");
  assert.equal(gradeSpeed(10, 25), "slow");
  assert.equal(gradeSpeed(10), "ok");
});
