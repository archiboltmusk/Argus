import test from "node:test";
import assert from "node:assert/strict";
import { applyTrust, titleMatches } from "../src/lib/streams/trust";
import { parseStream } from "../src/lib/streams/parser";
import { scoreStream } from "../src/lib/streams/scoring";
import type { Stream } from "../src/lib/streams/types";

test("single-word title guard rejects foreign multi-word titles and accepts authentic releases", () => {
  // Title: Romeo (2011)
  const expected = "Romeo";

  // Rejections: foreign movies with 'Romeo' in title
  assert.equal(titleMatches(expected, "Private Romeo", 2011, 2011), false);
  assert.equal(titleMatches(expected, "Romeo and Juliet", 2013, 2011), false);
  assert.equal(titleMatches(expected, "Romeo Akbar Walter", 2019, 2011), false);
  assert.equal(titleMatches(expected, "Romeo Must Die", 2000, 2011), false);

  // Acceptances: authentic releases with release noise and language tags
  assert.equal(titleMatches(expected, "Romeo Bangla Movie", 2011, 2011), true);
  assert.equal(titleMatches(expected, "Romeo Bengali Original", 2011, 2011), true);
  assert.equal(titleMatches(expected, "Romeo", 2011, 2011), true);
});

test("catalog year guard hard-rejects releases with 15-year discrepancies", () => {
  const fake2026Stream: Stream = {
    addonId: "vegamovies",
    addonName: "VegaMovies",
    title: "Oromeo.2026.2160p.AMZN.WEB-DL.Hindi.DDP5.1.H.265",
    url: "https://example.com/stream2026.mkv",
  };

  const parsed = parseStream(fake2026Stream);
  const { rejected } = applyTrust([parsed], {
    kind: "movie",
    expectedTitle: "Romeo",
    expectedYear: 2011,
    strict: true,
  });

  assert.equal(rejected.length, 1);
  assert.ok(
    rejected[0].reason.includes("title-mismatch") ||
    rejected[0].reason.includes("catalog-year-mismatch") ||
    rejected[0].reason.includes("year-mismatch"),
  );
});

test("authentic Bengali stream outranks mismatched language streams in scoring", () => {
  const authenticBengaliStream: Stream = {
    addonId: "torrentio",
    addonName: "Torrentio",
    title: "Romeo [2011] Bangla Movie 1080p HD WEB DL H264 AVC AAC.mp4",
    url: "https://example.com/bengali.mp4",
  };

  const parsedBengali = parseStream(authenticBengaliStream);
  const scoredBengali = scoreStream(parsedBengali, {
    activeDebrids: [],
    canonicalTitle: "Romeo",
    releaseDate: "2011-11-04",
  });

  assert.ok(scoredBengali.reasons.some((r) => r.signal === "bengali-audio-match"));
  assert.ok(scoredBengali.score > 100);
});
