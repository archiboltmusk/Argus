// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import {
  detectDevicePlaybackCapabilities,
  evaluateDeviceStreamSupport,
  filterDeviceSupportedStreams,
} from "../src/lib/streams/device-stream-filter.ts";
import type { ScoredStream } from "../src/lib/streams/types.ts";

function createMockStream(overrides: Partial<ScoredStream>): ScoredStream {
  return {
    rawTitle: "Test.Movie.2024.1080p",
    normalizedTitle: "Test Movie 2024",
    tier: "TOP",
    score: 100,
    reasons: [],
    cached: {},
    inLibrary: {},
    audioChannels: 6,
    hdr: [],
    video: {
      resolution: "1080p",
      codec: "H264",
      source: "WEB-DL",
      bitdepth: "8bit",
      hdr: false,
      dv: false,
    },
    audio: {
      codec: "AAC",
      channels: "5.1",
      atmos: false,
    },
    ...overrides,
  } as ScoredStream;
}

test("Device Stream Filter: Web browser capabilities reject unsupported containers and codecs", () => {
  const webCaps = {
    ...detectDevicePlaybackCapabilities("html5"),
    isWeb: true,
    engine: "html5" as const,
    canPlayMkv: false,
    canPlayDts: false,
    canPlayTrueHd: false,
    canPlayDolbyVisionProfile7: false,
  };

  assert.equal(webCaps.isWeb, true);
  assert.equal(webCaps.canPlayMkv, false);

  // 1. MP4 with H264 & AAC is supported on web
  const webReadyStream = createMockStream({
    url: "https://debrid.example/video.mp4",
    video: { resolution: "1080p", codec: "H264", source: "WEB-DL", bitdepth: "8bit", hdr: false, dv: false },
    audio: { codec: "AAC", channels: "2.0", atmos: false },
  });
  const res1 = evaluateDeviceStreamSupport(webReadyStream, webCaps);
  assert.equal(res1.supported, true);

  // 2. MKV container fails on web browser
  const mkvStream = createMockStream({
    url: "https://debrid.example/video.mkv",
    video: { resolution: "1080p", codec: "H264", source: "WEB-DL", bitdepth: "8bit", hdr: false, dv: false },
    audio: { codec: "AAC", channels: "2.0", atmos: false },
  });
  const res2 = evaluateDeviceStreamSupport(mkvStream, webCaps);
  assert.equal(res2.supported, false);
  assert.match(res2.reason ?? "", /Matroska/i);

  // 3. notWebReady flag fails on web browser
  const notWebStream = createMockStream({
    url: "https://debrid.example/video.mp4",
    behaviorHints: { notWebReady: true },
  });
  const res3 = evaluateDeviceStreamSupport(notWebStream, webCaps);
  assert.equal(res3.supported, false);
  assert.match(res3.reason ?? "", /desktop player/i);

  // 4. DTS / TrueHD audio fails on web browser
  const dtsStream = createMockStream({
    url: "https://debrid.example/video.mp4",
    audio: { codec: "DTS-HD MA", channels: "7.1", atmos: false },
  });
  const res4 = evaluateDeviceStreamSupport(dtsStream, webCaps);
  assert.equal(res4.supported, false);
  assert.match(res4.reason ?? "", /DTS/i);

  // 5. Dual-track Dolby Vision Profile 7 fails on web browser
  const dvProfile7Stream = createMockStream({
    url: "https://debrid.example/video.mp4",
    hdrFormat: "DV",
    source: "REMUX",
  });
  const res5 = evaluateDeviceStreamSupport(dvProfile7Stream, webCaps);
  assert.equal(res5.supported, false);
  assert.match(res5.reason ?? "", /Dolby Vision/i);
});

test("Device Stream Filter: Desktop MPV engine supports all standard formats and lossless audio", () => {
  const mpvCaps = detectDevicePlaybackCapabilities("mpv");
  assert.equal(mpvCaps.engine, "mpv");
  assert.equal(mpvCaps.canPlayMkv, true);
  assert.equal(mpvCaps.canPlayDts, true);
  assert.equal(mpvCaps.canPlayTrueHd, true);

  const remuxMkv = createMockStream({
    url: "https://debrid.example/movie.remux.mkv",
    video: { resolution: "4K", codec: "HEVC", source: "REMUX", bitdepth: "10bit", hdr: true, dv: false },
    audio: { codec: "TrueHD", channels: "7.1", atmos: true },
  });
  const res = evaluateDeviceStreamSupport(remuxMkv, mpvCaps);
  assert.equal(res.supported, true);
});

test("Device Stream Filter: filterDeviceSupportedStreams filters out unplayable streams", () => {
  const webCaps = {
    ...detectDevicePlaybackCapabilities("html5"),
    isWeb: true,
    engine: "html5" as const,
    canPlayMkv: false,
  };
  const streams = [
    createMockStream({
      rawTitle: "Unplayable.MKV",
      url: "https://debrid.example/1.mkv",
    }),
    createMockStream({
      rawTitle: "Playable.MP4",
      url: "https://debrid.example/2.mp4",
    }),
  ];

  const filtered = filterDeviceSupportedStreams(streams, webCaps, { keepBestIfAllIncompatible: false });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].rawTitle, "Playable.MP4");
});

test("Device Stream Filter: Downloads allow all containers regardless of web player support", () => {
  const webCaps = {
    ...detectDevicePlaybackCapabilities("html5"),
    isWeb: true,
    engine: "html5" as const,
    canPlayMkv: false,
  };
  const mkvStream = createMockStream({
    rawTitle: "Downloadable.MKV",
    url: "https://debrid.example/download.mkv",
  });

  const res = evaluateDeviceStreamSupport(mkvStream, webCaps, { isDownload: true });
  assert.equal(res.supported, true);
});
