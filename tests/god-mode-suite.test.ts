import test from "node:test";
import assert from "node:assert/strict";
import { buildAudioFilterString, type AudioEnhancerConfig } from "../src/lib/player/audio-enhancer";
import { calculateDynamicSpeed, type SilenceSkipperConfig } from "../src/lib/player/silence-skipper";
import { deepRecallSearch } from "../src/lib/education/deep-recall";
import { searchKnowledgeBaseForTerm } from "../src/lib/player/argus-glance";

test("god-mode suite: audio enhancer, silence skipper, deep recall & glance", async (t) => {
  await t.test("builds voice clarity filter chain", () => {
    const config: AudioEnhancerConfig = {
      mode: "voice_clarity",
      vocalBoostDb: 5,
      noiseSuppression: true,
      dynamicRangeCompression: true,
      trebleCrispness: 2,
    };
    const filter = buildAudioFilterString(config);
    assert.ok(filter.includes("highpass=f=85"));
    assert.ok(filter.includes("equalizer=f=2600"));
    assert.ok(filter.includes("acompressor"));
  });

  await t.test("builds lecture hall denoise filter chain", () => {
    const config: AudioEnhancerConfig = {
      mode: "lecture_hall_denoise",
      vocalBoostDb: 4,
      noiseSuppression: true,
      dynamicRangeCompression: true,
      trebleCrispness: 2,
    };
    const filter = buildAudioFilterString(config);
    assert.ok(filter.includes("highpass=f=110"));
    assert.ok(filter.includes("lowpass=f=7800"));
  });

  await t.test("calculates dynamic elastic speed during silence", () => {
    const config: SilenceSkipperConfig = {
      enabled: true,
      baseSpeed: 1.5,
      fastSpeed: 3.0,
      silenceThresholdDb: -32,
      minSilenceDurationSec: 0.4,
    };
    // Loud speech (-15 dB) -> base speed
    const speechSpeed = calculateDynamicSpeed(-15, config);
    assert.equal(speechSpeed, 1.5);

    // Silent pause (-45 dB) -> fast speed
    const silenceSpeed = calculateDynamicSpeed(-45, config);
    assert.equal(silenceSpeed, 3.0);
  });

  await t.test("matches high-yield medical pearls in Argus Glance", () => {
    const result = searchKnowledgeBaseForTerm("pheochromocytoma");
    assert.ok(result.medicalTermDefinition);
    assert.ok(result.medicalTermDefinition.includes("Rule of 10s"));
  });

  await t.test("deep recall searches QBank and study notes cleanly", () => {
    const results = deepRecallSearch("cardiac", 10);
    assert.ok(Array.isArray(results));
  });
});
