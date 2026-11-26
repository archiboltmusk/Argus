import { describe, expect, it } from "vitest";
import {
  evaluateDeviceStreamSupport,
  webPlayabilityScore,
  type DevicePlaybackCapabilities,
} from "../src/lib/streams/device-stream-filter";
import { buildWebRelayUrl } from "../src/lib/stream-proxy";

const webCaps: DevicePlaybackCapabilities = {
  platform: "web",
  isWeb: true,
  engine: "html5",
  isProjector: false,
  isSmartTv: false,
  canPlayMp4: true,
  canPlayWebm: true,
  canPlayMkv: false,
  canPlayHls: true,
  canPlayHevc: false,
  canPlayAv1: true,
  canPlayVp9: true,
  canPlayMpeg2: false,
  canPlayHi10p: false,
  canPlayDolbyVisionProfile5: false,
  canPlayDolbyVisionProfile7: false,
  canPlayDts: false,
  canPlayTrueHd: false,
  canPlayAc3: false,
  canPlayEac3: false,
  canPlayAac: true,
  maxRecommendedBitrateMbps: 120,
};

describe("Web playback upgrades", () => {
  it("flags AC3/EAC3 and raw infoHash without Debrid on Web", () => {
    const ac3Stream = {
      url: "https://cdn.example.com/movie.mp4",
      audio: { codec: "AC3" },
    } as any;
    const ac3Res = evaluateDeviceStreamSupport(ac3Stream, webCaps, { hasCompanion: false });
    expect(ac3Res.supported).toBe(false);
    expect(ac3Res.badgeLabel).toBe("Unsupported audio");

    const p2pStream = {
      infoHash: "0123456789abcdef0123456789abcdef01234567",
      title: "Movie.1080p.WEB-DL",
    } as any;
    const p2pRes = evaluateDeviceStreamSupport(p2pStream, webCaps, {
      hasCompanion: false,
      hasDebrid: false,
    });
    expect(p2pRes.supported).toBe(false);
    expect(p2pRes.badgeLabel).toBe("Needs Debrid / Desktop");
  });

  it("allows MKV, HEVC, and AC3 on Web when a Companion Server is connected", () => {
    const mkvHevcAc3 = {
      url: "https://cdn.example.com/movie.mkv",
      video: { codec: "HEVC" },
      audio: { codec: "AC3" },
    } as any;
    const res = evaluateDeviceStreamSupport(mkvHevcAc3, webCaps, { hasCompanion: true });
    expect(res.supported).toBe(true);
  });

  it("ranks HLS/MP4 H.264/AAC cached streams above raw torrents on Web", () => {
    const hlsStream = {
      url: "https://cdn.example.com/master.m3u8",
      cached: true,
      video: { codec: "H264" },
      audio: { codec: "AAC" },
    } as any;
    const rawTorrent = {
      infoHash: "abcdef0123456789abcdef0123456789abcdef01",
      behaviorHints: { notWebReady: true },
    } as any;

    expect(webPlayabilityScore(hlsStream, webCaps)).toBeGreaterThan(
      webPlayabilityScore(rawTorrent, webCaps),
    );
  });

  it("builds a valid Web CORS relay URL with encoded headers", () => {
    const url = buildWebRelayUrl("https://relay.example.com/", "https://host.example.com/video.m3u8", {
      Referer: "https://host.example.com/",
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://relay.example.com");
    expect(parsed.pathname).toBe("/proxy");
    expect(parsed.searchParams.get("url")).toBe("https://host.example.com/video.m3u8");
    expect(parsed.searchParams.get("headers")).toBeTruthy();
  });
});
