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

  it("promotes bandwidth-efficient 1080p HEVC over oversized 4K on modest 6 Mbps connection", () => {
    const stream4K: ScoredStream = {
      name: "4K REMUX (35 Mbps)",
      url: "https://cdn.example.com/4k.mkv",
      score: 110,
      resolution: "4K",
      size: 25 * 1024 * 1024 * 1024, // 25 GB
    } as any;

    const stream1080pHEVC: ScoredStream = {
      name: "1080p HEVC 10-bit (2.5 Mbps)",
      url: "https://cdn.example.com/1080p-hevc.mkv",
      score: 90,
      resolution: "1080p",
      codec: "HEVC",
      size: 2 * 1024 * 1024 * 1024, // 2 GB
    } as any;

    const probes = new Map<string, SpeedProbeResult>();
    // User connection is ~6 Mbps
    probes.set(stream4K.url!, { ok: true, latencyMs: 80, mbps: 6.0, bytes: 500000 });
    probes.set(stream1080pHEVC.url!, { ok: true, latencyMs: 80, mbps: 6.0, bytes: 500000 });

    const ranked = applySpeedProbeBonuses([stream4K, stream1080pHEVC], probes);
    // 1080p HEVC has >2x playback headroom (6 Mbps / ~2.9 Mbps > 2.0) and gets boosted
    // 4K has severe deficit (6 Mbps / ~37 Mbps < 0.85) and gets demoted
    assert.strictEqual(ranked[0].name, stream1080pHEVC.name);
  });
});
