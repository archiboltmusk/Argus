import { test } from "node:test";
import assert from "node:assert/strict";

// 1. Semantic Scene Search
import {
  SemanticSceneSearchIndex,
  parseSubtitleTextToCues,
} from "../src/lib/player/semantic-scene-search";

// 2. Attention-Aware Auto-Pause
import {
  AttentionPauseController,
  DEFAULT_ATTENTION_CONFIG,
} from "../src/lib/player/attention-pause";

// 3. Dynamic Ambient Lighting Sync
import {
  enhanceColor,
  smoothAmbientFrame,
  buildAmbientGlowCss,
  buildDdpPacket,
  type AmbientFrameColors,
} from "../src/lib/player/ambient-lighting";

// 4. Smart ClearVoice™ & Compressor
import {
  CLEARVOICE_PROFILES,
  buildClearVoiceMpvFilter,
} from "../src/lib/player/audio-clearvoice";

// 5. Audio-Haptic Engine
import { AudioHapticEngine } from "../src/lib/player/audio-haptics";

// 6. Narrative & Character Timeline Graph
import {
  extractSpeakerFromLine,
  buildNarrativeGraph,
} from "../src/lib/player/narrative-graph";

// --- 1. SEMANTIC SCENE SEARCH TESTS ---
test("Semantic Scene Search: cues parsing, exact phrase search, and semantic concept clustering", () => {
  const vttSample = `WEBVTT

1
00:01:10.000 --> 00:01:14.500
Look out, he has a gun! We need to run!

2
00:01:20.000 --> 00:01:25.000
The car is moving too fast on the highway! Catch him!

3
00:05:30.000 --> 00:05:35.000
I am sorry, but our breakup is final. Goodbye forever.
`;

  const cues = parseSubtitleTextToCues(vttSample);
  assert.equal(cues.length, 3);
  assert.equal(cues[0].startSec, 70);
  assert.equal(cues[1].startSec, 80);
  assert.equal(cues[2].startSec, 330);

  const chapters = [
    { startSec: 0, title: "Opening Chase" },
    { startSec: 300, title: "Heartbreak" },
  ];

  const index = new SemanticSceneSearchIndex(cues, chapters);
  assert.equal(index.totalCues, 3);

  // Exact search
  const exactRes = index.search("breakup");
  assert.ok(exactRes.length > 0);
  assert.equal(exactRes[0].badge, "exact");
  assert.equal(exactRes[0].timestampSec, 330);
  assert.equal(exactRes[0].chapterTitle, "Heartbreak");

  // Semantic concept search: "action" should match gun/run
  const conceptRes = index.search("action");
  assert.ok(conceptRes.length > 0);
  assert.ok(conceptRes.some((r) => r.timestampSec === 70));

  // Semantic concept search: "chase" should match car/highway
  const chaseRes = index.search("chase");
  assert.ok(chaseRes.length > 0);
  assert.ok(chaseRes.some((r) => r.timestampSec === 80));
});

// --- 2. ATTENTION-AWARE AUTO-PAUSE TESTS ---
test("Attention-Aware Auto-Pause: handles attention loss, smart rewind to sentence onset, and restore", () => {
  let pausedReason = "";
  let resumedTarget = 0;
  let rewoundAmount = 0;

  const controller = new AttentionPauseController(
    { enabled: true, rewindSeconds: 2.5, snapToSentence: true, minInactiveSec: 0 },
    {
      onPause: (r) => {
        pausedReason = r;
      },
      onResume: (target, rewound) => {
        resumedTarget = target;
        rewoundAmount = rewound;
      },
    }
  );

  controller.setCues([
    { startSec: 42.0, endSec: 47.0, text: "Wait, look what happened here!" },
    { startSec: 50.0, endSec: 54.0, text: "We cannot let them escape." },
  ]);

  // Player is at 52.5s, user looks away or switches tab
  const paused = controller.handleAttentionLoss(52.5, true, "tab-switch");
  assert.equal(paused, true);
  assert.equal(pausedReason, "tab-switch");
  assert.equal(controller.getState().isPausedByAttention, true);

  // Wait a moment then user returns
  const resume = controller.handleAttentionGained();
  assert.equal(resume.shouldResume, true);
  // Sentence boundary snaps back to ~49.8s (startSec 50.0 - 0.2s pre-roll)
  assert.ok(resume.targetSec <= 50.0);
  assert.ok(resume.rewoundSec >= 2.5);
  assert.equal(resumedTarget, resume.targetSec);
  assert.equal(controller.getState().isPausedByAttention, false);
});

// --- 3. DYNAMIC AMBIENT LIGHTING SYNC TESTS ---
test("Dynamic Screen-Edge Ambient Lighting: color enhancement, smoothing, CSS generation, and DDP packet", () => {
  const c1 = { r: 50, g: 100, b: 200 };
  const enhanced = enhanceColor(c1, 1.4);
  assert.ok(enhanced.r >= 0 && enhanced.r <= 255);
  assert.ok(enhanced.b >= 0 && enhanced.b <= 255);

  const frameA: AmbientFrameColors = {
    top: { r: 100, g: 0, b: 0 },
    right: { r: 0, g: 100, b: 0 },
    bottom: { r: 0, g: 0, b: 100 },
    left: { r: 50, g: 50, b: 50 },
    dominant: { r: 30, g: 30, b: 30 },
  };

  const frameB: AmbientFrameColors = {
    top: { r: 200, g: 0, b: 0 },
    right: { r: 0, g: 200, b: 0 },
    bottom: { r: 0, g: 0, b: 200 },
    left: { r: 100, g: 100, b: 100 },
    dominant: { r: 60, g: 60, b: 60 },
  };

  const smoothed = smoothAmbientFrame(frameA, frameB, 0.5);
  assert.equal(smoothed.top.r, 150);
  assert.equal(smoothed.right.g, 150);
  assert.equal(smoothed.bottom.b, 150);

  const css = buildAmbientGlowCss(smoothed, 0.7);
  assert.ok(css.includes("radial-gradient"));
  assert.ok(css.includes("rgba(150, 0, 0"));

  const ddpPacket = buildDdpPacket(smoothed);
  assert.equal(ddpPacket.length, 22); // 10 header + 12 payload
  assert.equal(ddpPacket[0], 0x41);  // DDP magic flag
  assert.equal(ddpPacket[10], 150);  // Top R
});

// --- 4. CLEARVOICE™ AUDIO DSP & MPV FILTER TESTS ---
test("Smart ClearVoice™: MPV lavfi filter generation and DSP frequency curves", () => {
  const clearVoiceAf = buildClearVoiceMpvFilter("clear-voice");
  assert.ok(clearVoiceAf.includes("highpass=f=95"));
  assert.ok(clearVoiceAf.includes("equalizer=f=2850"));
  assert.ok(clearVoiceAf.includes("acompressor"));

  const nightModeAf = buildClearVoiceMpvFilter("night-mode");
  assert.ok(nightModeAf.includes("highpass=f=120"));
  assert.ok(nightModeAf.includes("equalizer=f=2900"));

  const offAf = buildClearVoiceMpvFilter("off");
  assert.equal(offAf, "");

  assert.equal(CLEARVOICE_PROFILES["night-mode"].compressorRatio, 6.5);
});

// --- 5. AUDIO-HAPTIC TRANSIENT ENGINE TESTS ---
test("Audio-Haptic Engine: frequency analysis, transient spike detection, and hardware rumble generation", () => {
  const haptics = new AudioHapticEngine({
    enabled: true,
    transientThreshold: 1.5,
    minCooldownMs: 50,
  });

  const flatSpectrum = new Uint8Array(512).fill(30);
  // Baseline initial frame
  const e1 = haptics.processFrequencyFrame(flatSpectrum);
  assert.equal(e1, null);

  // Sub-bass transient spike in bins 0-10 (<110Hz)
  const spikeSpectrum = new Uint8Array(512).fill(30);
  for (let i = 0; i <= 10; i++) {
    spikeSpectrum[i] = 180;
  }

  const e2 = haptics.processFrequencyFrame(spikeSpectrum);
  assert.ok(e2 !== null);
  assert.ok(e2!.intensity > 0.4);
  assert.ok(e2!.lowFrequencyMotor > 0.3);
  assert.ok(e2!.durationMs >= 100);
});

// --- 6. NARRATIVE & CHARACTER TIMELINE GRAPH TESTS ---
test("Narrative & Character Graph: speaker extraction, character presence spans, and interaction matrix", () => {
  const line1 = extractSpeakerFromLine("SHERLOCK: The game is afoot, Watson.");
  assert.equal(line1.speaker, "SHERLOCK");
  assert.equal(line1.dialogue, "The game is afoot, Watson.");

  const line2 = extractSpeakerFromLine("- WATSON: Are you certain?");
  assert.equal(line2.speaker, "WATSON");
  assert.equal(line2.dialogue, "Are you certain?");

  const cues = [
    { startSec: 10, endSec: 14, text: "SHERLOCK: The game is afoot, Watson." },
    { startSec: 16, endSec: 20, text: "WATSON: Are you certain?" },
    { startSec: 22, endSec: 26, text: "SHERLOCK: Elementary." },
    { startSec: 120, endSec: 125, text: "LESTRADE: Inspector Lestrade here." },
    { startSec: 126, endSec: 130, text: "LESTRADE: What happened?" },
  ];

  const graph = buildNarrativeGraph(cues, 150);
  assert.equal(graph.characters.length, 2); // Sherlock and Lestrade (>= 2 lines)
  const sherlock = graph.characters.find((c) => c.name === "SHERLOCK");
  assert.ok(sherlock);
  assert.equal(sherlock!.totalLines, 2);
  assert.equal(sherlock!.presenceSpans.length, 1); // Merged nearby spans
});
