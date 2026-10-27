import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateQualityUpgrade, findBestQualityUpgrade } from "../src/lib/player/quality-upgrade";
import type { ScoredStream } from "../src/lib/streams/types";
import type { DebridStore } from "../src/lib/debrid/types";

describe("Quality Upgrade Detection", () => {
  const activeDebrid: DebridStore = {
    slug: "realdebrid",
    name: "RealDebrid",
    enabled: true,
  } as any;

  const currentStream: ScoredStream = {
    resolution: "1080p",
    hdrFormat: undefined,
    remux: false,
    score: 80,
    url: "https://real-debrid.com/d/1080p.mp4",
    infoHash: "hash1080p",
    audio: { codec: "AAC", channels: 2 },
    cached: { realdebrid: true },
  } as any;

  it("identifies 4K UHD with HDR as a quality upgrade over 1080p SDR", () => {
    const candidate4k: ScoredStream = {
      resolution: "4K",
      hdrFormat: "DV+HDR10",
      remux: true,
      score: 115,
      url: "https://real-debrid.com/d/4k.mkv",
      infoHash: "hash4k",
      audio: { codec: "Atmos", channels: 8 },
      cached: { realdebrid: true },
    } as any;

    const upgrade = evaluateQualityUpgrade(currentStream, candidate4k, [activeDebrid]);
    assert.ok(upgrade != null);
    assert.ok(upgrade.reasons.includes("4K"));
    assert.ok(upgrade.reasons.includes("DV+HDR10"));
    assert.ok(upgrade.reasons.includes("Atmos"));
    assert.ok(upgrade.reasons.includes("Lossless REMUX"));
  });

  it("rejects screeners (CAM/TS) even if score is somehow high", () => {
    const camCandidate: ScoredStream = {
      resolution: "4K",
      source: "CAM",
      score: 95,
      url: "https://real-debrid.com/d/cam.mp4",
      infoHash: "hashcam",
      audio: { codec: "AAC", channels: 2 },
      cached: { realdebrid: true },
    } as any;

    const upgrade = evaluateQualityUpgrade(currentStream, camCandidate, [activeDebrid]);
    assert.strictEqual(upgrade, null);
  });

  it("rejects uncached streams without debrid", () => {
    const uncached: ScoredStream = {
      resolution: "4K",
      score: 120,
      infoHash: "uncachedhash",
      audio: { codec: "Atmos", channels: 8 },
      cached: { realdebrid: false },
    } as any;

    const upgrade = evaluateQualityUpgrade(currentStream, uncached, [activeDebrid]);
    assert.strictEqual(upgrade, null);
  });

  it("findBestQualityUpgrade picks the highest score improvement candidate", () => {
    const stream720p: ScoredStream = {
      resolution: "720p",
      score: 50,
      url: "https://real-debrid.com/d/720p.mp4",
      infoHash: "hash720p",
      cached: { realdebrid: true },
    } as any;

    const stream1080p: ScoredStream = {
      resolution: "1080p",
      score: 80,
      url: "https://real-debrid.com/d/1080p.mp4",
      infoHash: "hash1080p",
      cached: { realdebrid: true },
    } as any;

    const stream4kAtmos: ScoredStream = {
      resolution: "4K",
      hdrFormat: "HDR10",
      score: 110,
      url: "https://real-debrid.com/d/4khdr.mp4",
      infoHash: "hash4khdr",
      audio: { codec: "Atmos", channels: 8 },
      cached: { realdebrid: true },
    } as any;

    const best = findBestQualityUpgrade(
      [stream720p, stream1080p, stream4kAtmos],
      stream1080p,
      stream1080p.url,
      stream1080p.infoHash,
      [activeDebrid],
    );

    assert.ok(best != null);
    assert.strictEqual(best.stream.infoHash, "hash4khdr");
    assert.ok(best.reasons.includes("4K"));
    assert.ok(best.reasons.includes("HDR10"));
  });
});
