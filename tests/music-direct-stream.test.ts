import assert from "node:assert/strict";
import test from "node:test";
import { directMusicStream } from "../src/lib/music/direct-stream";
test("direct audio retains the explicit endpoint without inventing quality", () => {
 const track = directMusicStream("https://fixture.invalid/radio?station=1");
 assert.equal(track.playbackUrl, "https://fixture.invalid/radio?station=1");
 assert.equal(track.connectorId, "direct");
 assert.equal(track.id.includes("fixture.invalid"), false);
 assert.equal(track.id.includes("station=1"), false);
 assert.equal(track.quality, undefined);
});
test("direct input rejects local protocols and embedded credentials", () => {
 for (const url of ["file:///private.mp3", "javascript:alert(1)", "http://fixture.invalid/audio", "https://user:pass@fixture.invalid/a", "https://fixture.invalid/a#secret", "not a url"]) assert.throws(() => directMusicStream(url));
});
