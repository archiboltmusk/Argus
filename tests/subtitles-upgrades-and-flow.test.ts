import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSubSyncOffset,
  applySubSyncOffset,
} from "../src/lib/subtitles/subsync-ai";
import {
  mergeDualSubtitles,
  formatCompositeVtt,
} from "../src/lib/subtitles/dual-subtitles";
import {
  cleanSdhText,
  cleanSdhCues,
} from "../src/lib/subtitles/sdh-cleaner";
import {
  buildMpvSubtitleProperties,
  computeCollisionAvoidanceMargin,
  SUBTITLE_PRESETS,
} from "../src/lib/subtitles/typography-presets";
import {
  tokenizeSubtitleSentence,
  saveFlashcard,
  getSavedFlashcards,
  clearFlashcards,
  exportToAnkiCsv,
} from "../src/lib/subtitles/interactive-dictionary";
import {
  generateVttFromSpeechSegments,
  createGeneratedSubtitleBlobUrl,
} from "../src/lib/subtitles/whisper-generator";
import {
  parseSubtitle,
  findActiveCue,
  findActiveCues,
  type SubCue,
} from "../src/lib/subtitles/parser";

test("SubSyncAI: calculates speech-to-subtitle offset and applies correction", () => {
  // Cues are delayed by 1.5 seconds compared to speech onsets
  const speechOnsets = [10.0, 15.0, 20.0, 25.0, 30.0];
  const cueOnsets = [11.5, 16.5, 21.5, 26.5, 31.5]; // offset = -1.5s

  const result = calculateSubSyncOffset(speechOnsets, cueOnsets);
  assert.equal(result.isAligned, true);
  assert.equal(result.offsetSec, -1.5);

  const initialCues: SubCue[] = [
    { start: 11.5, end: 14.0, text: "Hello" },
    { start: 16.5, end: 19.0, text: "World" },
  ];

  const aligned = applySubSyncOffset(initialCues, result.offsetSec);
  assert.equal(aligned[0].start, 10.0);
  assert.equal(aligned[0].end, 12.5);
  assert.equal(aligned[1].start, 15.0);
});

test("DualSubtitles: merges primary and secondary subtitle tracks into composite layout", () => {
  const primary: SubCue[] = [
    { start: 10.0, end: 15.0, text: "Where are we going?" },
  ];
  const secondary: SubCue[] = [
    { start: 10.0, end: 15.0, text: "どこへ行くの？" },
  ];

  const merged = mergeDualSubtitles(primary, secondary);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].primaryText, "Where are we going?");
  assert.equal(merged[0].secondaryText, "どこへ行くの？");
  assert.ok(merged[0].combinedText.includes("どこへ行くの？"));

  const vtt = formatCompositeVtt(merged);
  assert.ok(vtt.includes("WEBVTT"));
  assert.ok(vtt.includes("c.secondary"));
  assert.ok(vtt.includes("Where are we going?"));
});

test("SdhCleaner: removes sound effect brackets and speaker tags from subtitles", () => {
  const dirty = "[DRAMATIC MUSIC PLAYING]\nJOHN: (SIGHS) Don't look back! [GUNSHOT]";
  const cleaned = cleanSdhText(dirty);
  assert.equal(cleaned, "Don't look back!");

  const dirtyCues: SubCue[] = [
    { start: 1.0, end: 3.0, text: "[DOOR SLAMS]" }, // Only sound effect -> should be dropped
    { start: 4.0, end: 6.0, text: "SARAH: Help me! [SOBBING]" }, // Spoken dialogue -> kept and cleaned
  ];

  const cleanCues = cleanSdhCues(dirtyCues);
  assert.equal(cleanCues.length, 1);
  assert.equal(cleanCues[0].text, "Help me!");
});

test("TypographyPresets: generates accurate MPV properties and avoids lower-third collision", () => {
  const netflixProps = buildMpvSubtitleProperties("netflix-cinema");
  const fontProp = netflixProps.find((p) => p.name === "sub-font");
  const backColorProp = netflixProps.find((p) => p.name === "sub-back-color");
  assert.ok(fontProp);
  assert.ok(backColorProp?.value.includes("#B3000000")); // Translucent box

  const oledProps = buildMpvSubtitleProperties("oled-amber");
  const colorProp = oledProps.find((p) => p.name === "sub-color");
  assert.equal(colorProp?.value, "#FDE047");

  // Collision avoidance lifts margin
  const baseMargin = SUBTITLE_PRESETS["netflix-cinema"].marginV;
  const avoidedMargin = computeCollisionAvoidanceMargin(baseMargin, true, true);
  assert.ok(avoidedMargin > baseMargin);
});

test("InteractiveDictionary: tokenizes sentence into clickable tokens and exports Anki flashcards", () => {
  clearFlashcards();

  const sentence = 'Cobb said, "We need to go deeper."';
  const tokens = tokenizeSubtitleSentence(sentence);

  const words = tokens.filter((t) => t.isLookupable).map((t) => t.cleanWord);
  assert.ok(words.includes("Cobb"));
  assert.ok(words.includes("deeper"));

  saveFlashcard({
    word: "deeper",
    phonetic: "/ˈdiːpər/",
    definition: "further down; more profound",
    sentenceContext: sentence,
    mediaTitle: "Inception",
  });

  const cards = getSavedFlashcards();
  assert.equal(cards.length, 1);
  assert.equal(cards[0].word, "deeper");

  const csv = exportToAnkiCsv(cards);
  assert.ok(csv.includes("#separator:tab"));
  assert.ok(csv.includes("deeper\t/ˈdiːpər/\tfurther down"));

  clearFlashcards();
});

test("WhisperGenerator: creates WebVTT captions and playable blob URL from speech segments", () => {
  const segments = [
    { id: 1, seek: 0, start: 1.5, end: 3.5, text: "Welcome to the show.", confidence: 0.98 },
    { id: 2, seek: 350, start: 4.0, end: 6.2, text: "Let us begin.", confidence: 0.95 },
  ];

  const vtt = generateVttFromSpeechSegments(segments, "en");
  assert.ok(vtt.includes("WEBVTT"));
  assert.ok(vtt.includes("00:00:01.500 --> 00:00:03.500"));
  assert.ok(vtt.includes("Welcome to the show."));

  const blobUrl = createGeneratedSubtitleBlobUrl(vtt);
  assert.ok(blobUrl.length > 0);
});

test("SubtitleParser: handles overlapping cues and parses SRT/VTT robustly", () => {
  const cues: SubCue[] = [
    { start: 10.0, end: 14.0, text: "Character A: Wait!" },
    { start: 11.0, end: 13.0, text: "Character B: Look out!" },
    { start: 20.0, end: 25.0, text: "Safe now." },
  ];

  // At 12.0s, both cues are active!
  const activeAll = findActiveCues(cues, 12.0);
  assert.equal(activeAll.length, 2);

  const activeSingle = findActiveCue(cues, 12.0);
  assert.ok(activeSingle);
  assert.ok(activeSingle.text.includes("Character"));
});

test("SubtitleGenerationUpgrades: supports multilingual profiles and language options", async () => {
  const { SUBTITLE_LANGUAGES, GENERATION_PROFILES } = await import(
    "../src/lib/subtitles/live-transcription-service"
  );
  assert.ok(SUBTITLE_LANGUAGES.length >= 10);
  assert.ok(SUBTITLE_LANGUAGES.some((l) => l.code === "auto"));
  assert.ok(SUBTITLE_LANGUAGES.some((l) => l.code === "hi"));
  assert.ok(SUBTITLE_LANGUAGES.some((l) => l.code === "ja"));
  assert.ok(SUBTITLE_LANGUAGES.some((l) => l.code === "en"));

  assert.equal(GENERATION_PROFILES.length, 4);
  const ids = GENERATION_PROFILES.map((p) => p.id);
  assert.ok(ids.includes("verbatim"));
  assert.ok(ids.includes("translate"));
  assert.ok(ids.includes("bilingual"));
  assert.ok(ids.includes("academic"));
});

test("ReadingSpeedRegulator: pads rapid subtitle duration for comfortable reading pace", async () => {
  const { regulateReadingSpeed } = await import(
    "../src/lib/subtitles/reading-speed-regulator"
  );

  const rapidCues = [
    // 10 words in 0.5 seconds -> way too fast, needs at least ~3 seconds at 200 WPM
    { start: 1.0, end: 1.5, text: "The quick brown fox jumps over the lazy dog today." },
    { start: 6.0, end: 8.0, text: "Second line comes much later." },
  ];

  const regulated = regulateReadingSpeed(rapidCues, { maxWordsPerMinute: 200, minDurationSec: 2.0 });
  assert.ok(regulated[0].end > 2.5); // End time padded
  assert.ok(regulated[0].end <= 5.9); // Does not collide with next cue at 6.0s
});

test("MedicalPearlsGlossary: matches high-yield exam takeaways and clinical definitions", async () => {
  const { findMatchingPearl } = await import(
    "../src/lib/subtitles/medical-pearls-glossary"
  );

  const pearl1 = findMatchingPearl("Patients with Horner syndrome present with ptosis.");
  assert.ok(pearl1);
  assert.equal(pearl1?.term, "Horner Syndrome");
  assert.ok(pearl1?.pearl.includes("Ptosis"));

  const pearl2 = findMatchingPearl("Start Warfarin with heparin bridging.");
  assert.ok(pearl2);
  assert.equal(pearl2?.term, "Warfarin");
  assert.ok(pearl2?.pearl.includes("VKORC1"));

  assert.equal(findMatchingPearl("Unrelated sentence with no medical keywords"), null);
});

test("TranscriptStore: manages live cues, search queries, and playback tracking", async () => {
  const {
    openTranscriptDrawer,
    closeTranscriptDrawer,
    setTranscriptCues,
    updateTranscriptPlaybackTime,
    setTranscriptSearchQuery,
    useTranscriptState,
  } = await import("../src/lib/subtitles/transcript-store");

  const cues = [
    { start: 0.0, end: 5.0, text: "Welcome to today's CoreBTR session." },
    { start: 5.5, end: 12.0, text: "We will review the rule of 10s in pheochromocytoma." },
  ];

  setTranscriptCues(cues);
  openTranscriptDrawer();

  // Test playback time tracking
  updateTranscriptPlaybackTime(7.0); // should be cue index 1

  // Test search query
  setTranscriptSearchQuery("pheochromocytoma");

  closeTranscriptDrawer();
});

test("Widescreen & Embedded Subtitle Positioning: places subtitles in bottom letterbox bar", async () => {
  const { computeSubtitleLayout } = await import("../src/lib/subtitles/letterbox-subtitle-dodger");

  // 2.39:1 movie (e.g. Tintin / blockbuster) on standard 16:9 display (1080p)
  const layout = computeSubtitleLayout({
    videoAspect: 2.39,
    displayAspect: 1.777,
    displayHeightPx: 1080,
    isProjectorOrOled: false,
  });

  assert.equal(layout.placement, "bottom-letterbox");
  assert.equal(layout.hasLetterbox, true);
  // Total letterbox bar is ~138px tall. Subtitle offset percentage lands comfortably inside the bar:
  assert.ok(layout.offsetYPercent >= 2 && layout.offsetYPercent <= 10);
  assert.equal(layout.textColor, "#FFFFFF");
});
