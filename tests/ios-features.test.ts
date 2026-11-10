import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildIosPlayerUrl,
  isWebPlayableFormat,
  IOS_PLAYER_OPTIONS,
} from "../src/lib/player/ios-external-players.ts";

describe("iOS External Player & Streaming Suite", () => {
  it("provides full roster of iOS media player options", () => {
    const ids = IOS_PLAYER_OPTIONS.map((o) => o.id);
    assert.ok(ids.includes("outplayer"), "Must include Outplayer");
    assert.ok(ids.includes("infuse"), "Must include Infuse");
    assert.ok(ids.includes("vlc"), "Must include VLC");
    assert.ok(ids.includes("vidhub"), "Must include VidHub");
    assert.ok(ids.includes("nplayer"), "Must include nPlayer");

    const recommended = IOS_PLAYER_OPTIONS.find((o) => o.recommended);
    assert.equal(recommended?.id, "outplayer");
  });

  it("builds exact Outplayer URL scheme", () => {
    const testUrl = "https://rd.example.com/stream/movie.mkv?token=123";
    const outplayer = buildIosPlayerUrl("outplayer", testUrl, "Severance S02E01");
    assert.equal(outplayer, `outplayer://${testUrl}`);
  });

  it("builds exact Infuse URL scheme with title parameter", () => {
    const testUrl = "https://rd.example.com/stream/movie.mkv";
    const infuse = buildIosPlayerUrl("infuse", testUrl, "Dune: Part Two");
    assert.equal(
      infuse,
      `infuse://x-callback-url/play?url=${encodeURIComponent(testUrl)}&title=Dune%3A%20Part%20Two`,
    );
  });

  it("builds exact VLC for iOS URL scheme", () => {
    const testUrl = "https://rd.example.com/stream/video.mp4";
    const vlc = buildIosPlayerUrl("vlc", testUrl);
    assert.equal(vlc, `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(testUrl)}`);
  });

  it("builds exact VidHub and nPlayer schemes", () => {
    const testUrl = "https://mydebrid.com/video.mkv";
    const vidhub = buildIosPlayerUrl("vidhub", testUrl);
    const nplayer = buildIosPlayerUrl("nplayer", testUrl);

    assert.equal(vidhub, `vidhub://play?url=${encodeURIComponent(testUrl)}`);
    assert.equal(nplayer, `nplayer-${testUrl}`);
  });

  it("identifies web-safe vs non-web-safe iOS formats", () => {
    // WebKit natively plays MP4, M4V, MOV, and HLS (m3u8)
    assert.equal(isWebPlayableFormat("https://cdn.example.com/video.mp4"), true);
    assert.equal(isWebPlayableFormat("https://cdn.example.com/video.m4v"), true);
    assert.equal(isWebPlayableFormat("https://cdn.example.com/video.mov"), true);
    assert.equal(isWebPlayableFormat("https://cdn.example.com/live/playlist.m3u8"), true);
    assert.equal(isWebPlayableFormat("https://cdn.example.com/master.m3u8?token=xyz"), true);

    // WebKit cannot play MKV, AVI, TS, or FLV
    assert.equal(isWebPlayableFormat("https://cdn.example.com/movie.mkv"), false);
    assert.equal(isWebPlayableFormat("https://cdn.example.com/stream.ts"), false);
    assert.equal(isWebPlayableFormat("https://cdn.example.com/legacy.avi"), false);
  });
});
