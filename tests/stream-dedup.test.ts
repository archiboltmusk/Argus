import test from "node:test";
import assert from "node:assert/strict";
import { streamKey, mergeAndDedupe } from "@/lib/streams/pipeline";
import type { Stream } from "@/lib/streams/types";

test("streamKey normalizes infoHash and fileIdx", () => {
  const s1: Stream = {
    addonId: "torrentio",
    addonName: "Torrentio",
    infoHash: "4A5B6C7D8E",
    fileIdx: 0,
  };
  const s2: Stream = {
    addonId: "mediafusion",
    addonName: "MediaFusion",
    infoHash: "4a5b6c7d8e",
  };
  assert.equal(streamKey(s1), "hash:4a5b6c7d8e:0");
  assert.equal(streamKey(s2), "hash:4a5b6c7d8e:0");
  assert.equal(streamKey(s1), streamKey(s2));
});

test("streamKey matches videoHash directly", () => {
  const s1: Stream = {
    addonId: "addon-a",
    addonName: "Addon A",
    behaviorHints: { videoHash: "AABBCCDDEEFF0011" },
  };
  const s2: Stream = {
    addonId: "addon-b",
    addonName: "Addon B",
    behaviorHints: { videoHash: "aabbccddeeff0011" },
  };
  assert.equal(streamKey(s1), "vhash:aabbccddeeff0011");
  assert.equal(streamKey(s1), streamKey(s2));
});

test("streamKey normalizes clean release titles across different debrid providers", () => {
  const s1: Stream = {
    addonId: "torrentio",
    addonName: "Torrentio",
    title: "[RD+] Dune.Part.Two.2024.2160p.UHD.Remux.DV.HDR.mkv",
    behaviorHints: {
      filename: "Dune.Part.Two.2024.2160p.UHD.Remux.DV.HDR.mkv",
      videoSize: 52_000_000_000,
    },
  };
  const s2: Stream = {
    addonId: "comet",
    addonName: "Comet",
    title: "⚡ TorBox: Dune.Part.Two.2024.2160p.UHD.Remux.DV.HDR.mkv",
    behaviorHints: {
      filename: "[TB+] Dune.Part.Two.2024.2160p.UHD.Remux.DV.HDR.mkv",
      videoSize: 52_050_000_000,
    },
  };
  assert.equal(streamKey(s1), streamKey(s2));
});

test("mergeAndDedupe combines contributors and preserves mirror URLs", () => {
  const s1: Stream = {
    addonId: "torrentio",
    addonName: "Torrentio",
    url: "https://real-debrid.com/d/abc",
    infoHash: "11223344556677889900",
    sources: ["Tracker A"],
  };
  const s2: Stream = {
    addonId: "comet",
    addonName: "Comet",
    url: "https://torbox.app/download/xyz",
    infoHash: "11223344556677889900",
    sources: ["Tracker B"],
  };

  const merged = mergeAndDedupe([], [s1, s2]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].contributors?.length, 2);
  assert.deepEqual(merged[0].contributors, [
    { id: "torrentio", name: "Torrentio" },
    { id: "comet", name: "Comet" },
  ]);
  assert.deepEqual(merged[0].sources?.sort(), ["Tracker A", "Tracker B"].sort());
});
