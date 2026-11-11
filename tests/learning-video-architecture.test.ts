import { test } from "node:test";
import assert from "node:assert/strict";
import "./_localstorage-stub.ts";

// 1. Whisper Transcription Pipeline
import {
  convertAudioToWhisperPcm,
  parseWhisperOutputToSegments,
  getActiveKaraokeWordIndex,
  getWhisperModelConfig,
  updateWhisperModelConfig,
} from "../src/lib/ai/whisper-transcription-pipeline";

// 2. WebGPU Frame Inference
import {
  convertRgbaToPlanarTensor,
  computeSimulatedDepthMap,
} from "../src/lib/ai/webgpu-video-inference";

// 3. AI Semantic Chaptering
import {
  detectVisualCutBoundaries,
  generateSemanticChapters,
} from "../src/lib/ai/semantic-chapter-segmenter";

// 4. OCR Slide & Code Grabber
import { formatOcrTextToMarkdown } from "../src/lib/study/ocr-slide-grabber";

// 5. Anki SRS Flashcard Generator
import {
  calculateNextSm2Interval,
  createFlashcardFromSubtitle,
  exportCardsToAnkiTsv,
} from "../src/lib/study/anki-deck-generator";

// 6. Timestamped Markdown Notebook
import {
  parseTimecodeToSeconds,
  formatSecondsToTimecode,
  extractTimestampsFromMarkdown,
  appendTimestampedEntry,
  TimestampedNotebookStore,
} from "../src/lib/study/timestamped-markdown-notebook";

// --- 1. WHISPER TRANSCRIPTION TESTS ---
test("Whisper Pipeline: audio PCM resampling, segment token parsing, and karaoke word tracking", () => {
  // Resample 48kHz to 16kHz
  const samples48k = new Float32Array(48000);
  const samples16k = convertAudioToWhisperPcm(samples48k, 48000);
  assert.equal(samples16k.length, 16000);

  const rawTokens = [
    { text: "Welcome", startMs: 0, endMs: 500, confidence: 0.98 },
    { text: "to", startMs: 510, endMs: 700, confidence: 0.99 },
    { text: "Argus.", startMs: 710, endMs: 1200, confidence: 0.97 },
  ];

  const segments = parseWhisperOutputToSegments(rawTokens);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].text, "Welcome to Argus.");
  assert.equal(segments[0].words.length, 3);

  // Karaoke tracking at 600ms (0.6s) -> Should be word index 1 ("to")
  const activeWordIdx = getActiveKaraokeWordIndex(segments[0], 0.6);
  assert.equal(activeWordIdx, 1);
  assert.equal(segments[0].words[activeWordIdx].word, "to");

  updateWhisperModelConfig({ modelSize: "small", language: "ja" });
  assert.equal(getWhisperModelConfig().modelSize, "small");
  assert.equal(getWhisperModelConfig().language, "ja");
});

// --- 2. WEBGPU FRAME INFERENCE TESTS ---
test("WebGPU Inference: planar tensor normalization and monocular depth estimation", () => {
  const width = 4;
  const height = 4;
  const pixelCount = width * height;
  const mockRgba = new Uint8ClampedArray(pixelCount * 4).fill(128);

  const tensor = convertRgbaToPlanarTensor(mockRgba, width, height);
  // Shape should be 3 * width * height
  assert.equal(tensor.length, 3 * pixelCount);

  // Depth map estimation
  const depthMap = computeSimulatedDepthMap(mockRgba, width, height);
  assert.equal(depthMap.width, width);
  assert.equal(depthMap.height, height);
  assert.equal(depthMap.data.length, pixelCount);
  assert.ok(depthMap.averageDepth >= 0.0 && depthMap.averageDepth <= 1.0);
});

// --- 3. AI SEMANTIC CHAPTERING TESTS ---
test("Semantic Chaptering: visual cut detection and topic clustering", () => {
  const frameSamples = [
    { timestampSec: 0, meanLuminance: 0.2 },
    { timestampSec: 10, meanLuminance: 0.22 },
    { timestampSec: 20, meanLuminance: 0.8 }, // Cut! Delta = 0.58
    { timestampSec: 30, meanLuminance: 0.78 },
  ];

  const cuts = detectVisualCutBoundaries(frameSamples, 0.35);
  assert.equal(cuts.length, 1);
  assert.equal(cuts[0].timestampSec, 20);

  const transcript = [
    { startSec: 0, endSec: 100, text: "Introduction to quantum physics and particle duality." },
    { startSec: 100, endSec: 250, text: "Now moving on to quantum entanglement and wave collapse." },
  ];

  const chapters = generateSemanticChapters(transcript, 300, 90);
  assert.ok(chapters.length >= 1);
  assert.ok(chapters[0].title.startsWith("Chapter"));
  assert.ok(chapters[0].keyConcepts.length > 0);
});

// --- 4. OCR SLIDE & CODE GRABBER TESTS ---
test("OCR Grabber: auto-detecting Python, LaTeX math, and slide prose", () => {
  // 1. Python Code
  const pythonCode = "def calculate_loss(y_true, y_pred):\n    return np.mean((y_true - y_pred) ** 2)";
  const codeResult = formatOcrTextToMarkdown(pythonCode, 125);
  assert.equal(codeResult.detectedType, "code");
  assert.equal(codeResult.detectedLanguage, "python");
  assert.ok(codeResult.formattedMarkdown.includes("```python"));

  // 2. Math Formula
  const mathFormula = "E = mc^2 \\int_{0}^{\\infty} e^{-x} dx";
  const mathResult = formatOcrTextToMarkdown(mathFormula, 300);
  assert.equal(mathResult.detectedType, "math");
  assert.ok(mathResult.formattedMarkdown.includes("$$"));

  // 3. Prose
  const prose = "Deep learning models require balanced gradient flows.";
  const proseResult = formatOcrTextToMarkdown(prose, 45);
  assert.equal(proseResult.detectedType, "prose");
  assert.ok(proseResult.formattedMarkdown.includes("> **[00:45]**"));
});

// --- 5. ANKI SRS FLASHCARD GENERATOR TESTS ---
test("Anki SRS: SM-2 interval calculations and Anki TSV deck generation", () => {
  const card = createFlashcardFromSubtitle(
    "Attack on Titan",
    "心臓を捧げよ！",
    "Dedicate your heart!",
    140,
    143,
    undefined,
    "Military salute phrase",
  );

  assert.equal(card.timecode, "02:20");
  assert.equal(card.sourceText, "心臓を捧げよ！");
  assert.equal(card.intervalDays, 1);

  // Grade 5 (Perfect recall) updates interval
  const next1 = calculateNextSm2Interval(card, 5);
  assert.equal(next1.intervalDays, 1); // 1st rep = 1
  assert.equal(next1.repetitionCount, 1);

  const cardRep1 = { ...card, ...next1 };
  const next2 = calculateNextSm2Interval(cardRep1, 5);
  assert.equal(next2.intervalDays, 6); // 2nd rep = 6

  // Export to TSV
  const tsv = exportCardsToAnkiTsv([card]);
  assert.ok(tsv.includes("心臓を捧げよ！\tDedicate your heart!"));
  assert.ok(tsv.includes("argus::attack_on_titan"));
});

// --- 6. TIMESTAMPED MARKDOWN NOTEBOOK TESTS ---
test("Timestamped Notebook: timecode parsing, extraction, and Obsidian export", () => {
  assert.equal(parseTimecodeToSeconds("14:32"), 872);
  assert.equal(parseTimecodeToSeconds("01:10:05"), 4205);
  assert.equal(formatSecondsToTimecode(872), "14:32");
  assert.equal(formatSecondsToTimecode(4205), "01:10:05");

  const notesMarkdown = `# Quantum Mechanics Notes
- Key experiment starts at [04:15]
- Mathematical derivation at [18:40] with formula.
`;

  const tags = extractTimestampsFromMarkdown(notesMarkdown);
  assert.equal(tags.length, 2);
  assert.equal(tags[0].timecode, "04:15");
  assert.equal(tags[0].seconds, 255);
  assert.equal(tags[1].timecode, "18:40");

  const appended = appendTimestampedEntry(notesMarkdown, 1250, "Schrodinger wave equation discussion.");
  assert.ok(appended.includes("- **[20:50]** Schrodinger wave equation"));

  const store = new TimestampedNotebookStore();
  const note = store.loadNote("lecture-101", "MIT 8.04 Quantum Physics");
  assert.equal(note.mediaKey, "lecture-101");

  const obsidianExport = store.exportToObsidianMarkdown(note);
  assert.ok(obsidianExport.includes("type: video-study-notes"));
});
