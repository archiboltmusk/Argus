import assert from "node:assert/strict";
import { test } from "node:test";
import { detectVlcPlatform, isVlcPlayableUrl, m3uPlaylist, vlcOpenLink } from "../src/lib/player/vlc-link";

test("detects mobile platforms from the user agent", () => {
  assert.equal(detectVlcPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)"), "ios");
  assert.equal(detectVlcPlatform("Mozilla/5.0 (Linux; Android 14)"), "android");
  assert.equal(detectVlcPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X)"), "desktop");
});

test("only http(s) urls are playable in VLC", () => {
  assert.equal(isVlcPlayableUrl("https://a.example/v.mkv"), true);
  assert.equal(isVlcPlayableUrl("magnet:?xt=urn:btih:abc"), false);
  assert.equal(vlcOpenLink("magnet:?xt=urn:btih:abc", "desktop"), null);
});

test("builds per-platform VLC links", () => {
  const url = "https://a.example/v.mkv?t=1";
  assert.equal(vlcOpenLink(url, "desktop"), `vlc://${url}`);
  assert.equal(
    vlcOpenLink(url, "ios"),
    `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(url)}`,
  );
  assert.equal(
    vlcOpenLink(url, "android"),
    "intent://a.example/v.mkv?t=1#Intent;scheme=https;package=org.videolan.vlc;type=video/*;end",
  );
});

test("m3u keeps the title on one line", () => {
  assert.equal(m3uPlaylist("https://a/v.mp4", "A\nB"), "#EXTM3U\n#EXTINF:-1,A B\nhttps://a/v.mp4\n");
});
