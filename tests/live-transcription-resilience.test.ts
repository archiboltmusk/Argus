// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { convertWhisperSegmentsToCues, getDialogueFilterParameters } from "../src/lib/subtitles/neural-whisper-copilot.ts";
import { NeuralSubtitleSnapper } from "../src/lib/subtitles/neural-subtitle-snapper.ts";

test("whisper audio dialogue filter preserves speech frequencies and reduces rumble", () => {
  const filter = getDialogueFilterParameters({
    fanNoiseReduction: true,
    dialogueBoostDb: 6,
    highPassCutoffHz: 100,
  });

  assert.ok(filter.afString.includes("highpass=f=100"), "Cuts rumble below 100Hz");
  assert.ok(filter.afString.includes("equalizer=f=3000"), "Boosts human dialogue frequencies");
  assert.equal(filter.centerGain, 6);
});

test("whisper segments to cues filters blank/repetitive artifacts and keeps continuous dialogue", () => {
  const rawSegments = [
    { id: 1, seek: 0, start: 0.0, end: 2.5, text: "Hello and welcome to Argus.", confidence: 0.95 },
    { id: 2, seek: 250, start: 2.5, end: 5.0, text: "   ...   ", confidence: 0.2 },
    { id: 3, seek: 500, start: 5.0, end: 8.2, text: "Visit 1xbet for free betting", confidence: 0.8 },
    { id: 4, seek: 820, start: 8.2, end: 11.0, text: "Continuous subtitles now stay active when minimized.", confidence: 0.98 },
  ];

  const cues = convertWhisperSegmentsToCues(rawSegments);

  // Blank segment 2 and spam segment 3 should be stripped
  assert.equal(cues.length, 2);
  assert.equal(cues[0].text, "Hello and welcome to Argus.");
  assert.equal(cues[1].text, "Continuous subtitles now stay active when minimized.");
  assert.equal(cues[1].start, 8.2);
  assert.equal(cues[1].end, 11.0);
});

test("neural subtitle snapper aligns continuous speech anchors and eliminates spam", () => {
  const snapper = NeuralSubtitleSnapper.getInstance();
  const rawCues = [
    { id: 1, startSec: 1.0, endSec: 3.5, text: "Join telegram @spammovie" },
    { id: 2, startSec: 4.0, endSec: 7.0, text: "Welcome to the cinema experience" },
    { id: 3, startSec: 7.2, endSec: 10.0, text: "Enjoy the continuous stream" },
  ];

  const speechAnchors = [
    { timestampSec: 4.5, textSnippet: "Welcome to the cinema" },
  ];

  const result = snapper.snapSubtitles(rawCues, speechAnchors);

  assert.equal(result.removedSpamCount, 1);
  assert.equal(result.alignedCues.length, 2);
  // Offset of 0.5s applied (4.5 - 4.0 = +0.5s)
  assert.equal(result.computedOffsetSec, 0.5);
  assert.equal(result.alignedCues[0].startSec, 4.5);
  assert.equal(result.alignedCues[1].startSec, 7.7);
});
