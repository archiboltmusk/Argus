import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateTargetRefreshRate,
  getAutoDayNightProfile,
} from "../src/lib/projector/projector-afr";
import {
  convertWhisperSegmentsToCues,
  getDialogueFilterParameters,
  SPEAKER_COLOR_PALETTE,
} from "../src/lib/subtitles/neural-whisper-copilot";
import { getCachedPrebufferedStreams } from "../src/lib/streams/next-episode-prebuffer";

describe("Projector AFR & Cinema Optics Upgrades", () => {
  it("calculates exact 24Hz refresh rate for 23.976 cinema framerates", () => {
    assert.equal(calculateTargetRefreshRate(23.976), 24);
    assert.equal(calculateTargetRefreshRate(24.0), 24);
  });

  it("calculates 50Hz for PAL content and 60Hz for NTSC/HFR", () => {
    assert.equal(calculateTargetRefreshRate(25.0), 50);
    assert.equal(calculateTargetRefreshRate(50.0), 50);
    assert.equal(calculateTargetRefreshRate(29.97), 60);
    assert.equal(calculateTargetRefreshRate(60.0), 60);
  });

  it("determines daylight boost vs night deep cinema based on time", () => {
    const noon = new Date("2026-11-10T12:00:00");
    const dayProfile = getAutoDayNightProfile(noon);
    assert.equal(dayProfile.mode, "daylight");
    assert.ok(dayProfile.contrastBoost >= 12);

    const midnight = new Date("2026-11-10T23:30:00");
    const nightProfile = getAutoDayNightProfile(midnight);
    assert.equal(nightProfile.mode, "night");
    assert.ok(nightProfile.contrastBoost < 12);
  });
});

describe("Subtitles & Audio Engine Upgrades", () => {
  it("applies speaker diarization color palette to alternating dialogue", () => {
    const cues = convertWhisperSegmentsToCues([
      { id: 1, seek: 0, start: 1, end: 3, text: "Look at the stars.", confidence: 0.95 },
      { id: 2, seek: 0, start: 5, end: 7, text: "They are beautiful.", confidence: 0.92 },
    ]);

    assert.equal(cues.length, 2);
    assert.ok(cues[0].speakerColor !== undefined);
    assert.ok(SPEAKER_COLOR_PALETTE.includes(cues[0].speakerColor!));
  });

  it("includes explosion compressor and speech norm in dialogue filter parameters", () => {
    const params = getDialogueFilterParameters({ nightCompressorEnabled: true });
    assert.ok(params.afString.includes("acompressor"));
    assert.ok(params.afString.includes("speechnorm"));
    assert.ok(params.afString.includes("highpass"));
  });
});

describe("Stream Pre-buffering", () => {
  it("initializes empty prebuffer cache safely", () => {
    const cached = getCachedPrebufferedStreams("tt1234567", 1, 2);
    assert.equal(cached, null);
  });
});
