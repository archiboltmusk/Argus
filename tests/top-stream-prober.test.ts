import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applySpeedProbeBonuses } from "../src/lib/streams/top-stream-prober";
import type { ScoredStream } from "../src/lib/streams/types";
import type { SpeedProbeResult } from "../src/lib/streams/speed-probe";

describe("Top Stream Speed Prober", () => {
  const streamA: ScoredStream = {
    name: "Stream A (4K high score)",
    url: "https://cdn.example.com/streamA.mp4",
    score: 100,
    resolution: "4K",
  } as any;

  const streamB: ScoredStream = {
    name: "Stream B (1080p solid)",
    url: "https://cdn.example.com/streamB.mp4",
    score: 95,
    resolution: "1080p",
  } as any;

  it("boosts stream with fast verified CDN speed over a slow link", () => {
    const probes = new Map<string, SpeedProbeResult>();
    // Stream A is throttled on CDN (only 1.5 Mbps)
    probes.set(streamA.url!, { ok: true, latencyMs: 350, mbps: 1.5, bytes: 500000 });
    // Stream B has blazing fast CDN (28 Mbps)
    probes.set(streamB.url!, { ok: true, latencyMs: 40, mbps: 28.0, bytes: 500000 });

    const ranked = applySpeedProbeBonuses([streamA, streamB], probes);
    // Stream B should jump to the top
    assert.strictEqual(ranked[0].name, streamB.name);
  });

  it("penalizes unreachable links", () => {
    const probes = new Map<string, SpeedProbeResult>();
    probes.set(streamA.url!, { ok: false, reason: "unreachable" });
    probes.set(streamB.url!, { ok: true, latencyMs: 50, mbps: 20.0, bytes: 500000 });

    const ranked = applySpeedProbeBonuses([streamA, streamB], probes);
    assert.strictEqual(ranked[0].name, streamB.name);
  });
});
