import assert from "node:assert/strict";
import test from "node:test";
import { findSeekrThumbnailCue, parseSeekrVtt } from "../src/lib/providers/seekr";

test("parseSeekrVtt correctly parses WebVTT time ranges and xywh coordinates", () => {
  const sampleVtt = `WEBVTT

00:00:00.000 --> 00:00:10.000
thumbnails.jpg#xywh=0,0,160,90

00:00:10.000 --> 00:00:20.000
thumbnails.jpg#xywh=160,0,160,90

00:01:00.000 --> 00:01:10.000
thumbnails2.jpg#xywh=0,90,160,90
`;

  const cues = parseSeekrVtt(sampleVtt, "https://cdn.seekr.tv");
  assert.equal(cues.length, 3);

  assert.equal(cues[0].startSec, 0);
  assert.equal(cues[0].endSec, 10);
  assert.equal(cues[0].url, "https://cdn.seekr.tv/thumbnails.jpg");
  assert.equal(cues[0].x, 0);
  assert.equal(cues[0].y, 0);
  assert.equal(cues[0].w, 160);
  assert.equal(cues[0].h, 90);

  assert.equal(cues[1].startSec, 10);
  assert.equal(cues[1].endSec, 20);
  assert.equal(cues[1].x, 160);

  assert.equal(cues[2].startSec, 60);
  assert.equal(cues[2].endSec, 70);
  assert.equal(cues[2].url, "https://cdn.seekr.tv/thumbnails2.jpg");
  assert.equal(cues[2].y, 90);
});

test("findSeekrThumbnailCue performs accurate lookup by playback time", () => {
  const cues = [
    { startSec: 0, endSec: 10, url: "https://example.com/1.jpg" },
    { startSec: 10, endSec: 20, url: "https://example.com/2.jpg" },
    { startSec: 20, endSec: 30, url: "https://example.com/3.jpg" },
  ];

  const matchAt5 = findSeekrThumbnailCue(cues, 5);
  assert.equal(matchAt5?.url, "https://example.com/1.jpg");

  const matchAt10 = findSeekrThumbnailCue(cues, 10);
  assert.equal(matchAt10?.url, "https://example.com/2.jpg");

  const matchAt25 = findSeekrThumbnailCue(cues, 25);
  assert.equal(matchAt25?.url, "https://example.com/3.jpg");

  const matchNegative = findSeekrThumbnailCue(cues, -1);
  assert.equal(matchNegative, null);
});
