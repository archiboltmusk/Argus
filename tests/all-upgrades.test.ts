import { test } from "node:test";
import assert from "node:assert";
import {
  generateFlashcardsFromDerivations,
  reviewFlashcard,
  exportFlashcardsToAnkiText,
} from "../src/lib/education/flashcard-generator";
import { formatTimecode } from "../src/components/player/storyboard-scrubber";
import { LocalTranscriptionPipeline } from "../src/lib/education/local-transcription-pipeline";
import { buildAudioFilterString } from "../src/lib/player/audio-enhancer";
import { calculateDynamicSpeed } from "../src/lib/player/silence-skipper";
import { LocalLanMeshEngine } from "../src/lib/p2p/local-lan-mesh";
import { ArgusCourseBundleManager } from "../src/lib/education/argus-course-bundle";
import type { UniversityCourse } from "../src/lib/education/course-engine";

test("Flashcard Generator: converts derivations into active recall cards with KaTeX math", () => {
  const derivations = [
    {
      id: "step-1",
      timestampSec: 240,
      timestamp: "04:00",
      latex: "L = I - D^{-1/2} A D^{-1/2}",
      explanation: "Normalized graph Laplacian for symmetric spectral convolution",
    },
    {
      id: "step-2",
      timestampSec: 620,
      timestamp: "10:20",
      latex: "h_v^{(k)} = \\sigma(W h_u^{(k-1)})",
      explanation: "Message passing update rule for target node v",
    },
  ];

  const cards = generateFlashcardsFromDerivations("CS224W: Lecture 3", derivations);
  assert.strictEqual(cards.length, 2);
  assert.ok(cards[0].front.includes("CS224W: Lecture 3"));
  assert.ok(cards[0].back.includes("Normalized graph Laplacian"));
  assert.strictEqual(cards[0].formulaLatex, "L = I - D^{-1/2} A D^{-1/2}");
  assert.strictEqual(cards[0].intervalDays, 1);
  assert.strictEqual(cards[0].easeFactor, 2.5);

  // Review card with "Good" (rating 3)
  const reviewed = reviewFlashcard(cards[0], 3);
  assert.strictEqual(reviewed.repetition, 1);
  assert.strictEqual(reviewed.intervalDays, 1);

  // Review second time with "Good"
  const reviewed2 = reviewFlashcard(reviewed, 3);
  assert.strictEqual(reviewed2.repetition, 2);
  assert.strictEqual(reviewed2.intervalDays, 3);

  // Export to Anki text
  const exported = exportFlashcardsToAnkiText("CS224W Masterclass", cards);
  assert.ok(exported.filename.endsWith("-anki.txt"));
  assert.ok(exported.textData.includes("#deck:CS224W Masterclass"));
  assert.ok(exported.textData.includes("Normalized graph Laplacian"));
  assert.ok(exported.textData.includes("\\[L = I - D^{-1/2} A D^{-1/2}\\]"));
});

test("Storyboard Scrubber: formats timecodes and calculates continuous frames", () => {
  assert.strictEqual(formatTimecode(0), "0:00");
  assert.strictEqual(formatTimecode(65), "1:05");
  assert.strictEqual(formatTimecode(3665), "1:01:05");
});

test("Local Transcription Pipeline: parses WebVTT and runs transcription workflow", async () => {
  const pipeline = new LocalTranscriptionPipeline();
  const vttSample = `WEBVTT

1
00:00:02.000 --> 00:00:06.500
Welcome to Stanford CS224W Machine Learning with Graphs.

2
00:00:07.100 --> 00:00:12.300
Today we begin with spectral graph theory and representations.
`;

  const cues = pipeline.parseSubtitleText(vttSample);
  assert.strictEqual(cues.length, 2);
  assert.strictEqual(cues[0].startSec, 2);
  assert.strictEqual(cues[0].endSec, 6.5);
  assert.ok(cues[0].text.includes("Stanford CS224W"));
  assert.strictEqual(cues[1].startSec, 7.1);
  assert.strictEqual(cues[1].endSec, 12.3);

  const job = pipeline.createJob("/path/to/lecture.mp4", "base");
  assert.strictEqual(job.status, "idle");

  const results = await pipeline.executeTranscription(job.id);
  assert.strictEqual(results.length, 4);
  assert.strictEqual(job.status, "completed");
  assert.strictEqual(job.progressPct, 100);
});

test("Audio Enhancer: builds optimal lavfi filters for voice clarity and night compression", () => {
  const voiceFilter = buildAudioFilterString({
    mode: "voice_clarity",
    vocalBoostDb: 5,
    noiseSuppression: true,
    dynamicRangeCompression: true,
    trebleCrispness: 2,
  });
  assert.ok(voiceFilter.includes("highpass=f=85"));
  assert.ok(voiceFilter.includes("equalizer=f=2600"));
  assert.ok(voiceFilter.includes("g=5"));
  assert.ok(voiceFilter.includes("acompressor"));

  const nightFilter = buildAudioFilterString({
    mode: "night_mode",
    vocalBoostDb: 4,
    noiseSuppression: true,
    dynamicRangeCompression: true,
    trebleCrispness: 2,
  });
  assert.ok(nightFilter.includes("loudnorm=I=-24"));
});

test("Silence Skipper: dynamically calculates lecture dead-air acceleration", () => {
  const config = {
    enabled: true,
    baseSpeed: 1.0,
    fastSpeed: 2.5,
    silenceThresholdDb: -32,
    minSilenceDurationSec: 0.4,
  };

  // Loud speech (e.g. -18dB) -> baseSpeed 1.0
  const speechSpeed = calculateDynamicSpeed(-18, config);
  assert.strictEqual(speechSpeed, 1.0);

  // Silence / pause (e.g. -45dB) -> fastSpeed 2.5
  const silenceSpeed = calculateDynamicSpeed(-45, config);
  assert.strictEqual(silenceSpeed, 2.5);
});

test("Local LAN Mesh: discovers local Argus peers and registers shared infohashes", () => {
  const mesh = new LocalLanMeshEngine(11475);
  mesh.registerSharedInfohash("abc123stanfordcs224w");
  assert.deepStrictEqual(mesh.getSharedInfohashes(), ["abc123stanfordcs224w"]);

  const peerMsg = {
    type: "ANNOUNCE" as const,
    peerId: "remote-peer-macbook",
    payload: {
      name: "MacBook Pro in Lab",
      port: 11472,
      infohashes: ["abc123stanfordcs224w", "def456mit18065"],
    },
    timestamp: Date.now(),
  };

  const peer = mesh.handleIncomingMessage("192.168.1.55", peerMsg);
  assert.ok(peer);
  assert.strictEqual(peer.name, "MacBook Pro in Lab");
  assert.strictEqual(peer.ip, "192.168.1.55");

  const matchingPeers = mesh.findPeersForInfohash("abc123stanfordcs224w");
  assert.strictEqual(matchingPeers.length, 1);
  assert.strictEqual(matchingPeers[0].id, "remote-peer-macbook");

  const noMatches = mesh.findPeersForInfohash("unknown-course");
  assert.strictEqual(noMatches.length, 0);
});

test("Argus Course Bundle: exports and imports .argus-course packages with full validation", () => {
  const sampleCourse: UniversityCourse = {
    id: "mit-18-065",
    title: "Linear Algebra and Learning from Data",
    institution: "MIT",
    instructor: "Prof. Gilbert Strang",
    playlistUrl: "https://www.youtube.com/playlist?list=PLUl4u3cNGP63oMNUHXqIUcrkS2PivhN3k",
    academicTerm: "Spring",
    category: "ai-math",
    description: "Deep learning through linear algebra and singular value decomposition.",
    activeLectureIndex: 0,
    lectures: [
      {
        id: "mit-18-065-l1",
        lectureNumber: 1,
        title: "The Four Fundamental Subspaces",
        durationSec: 3120,
        concepts: ["Nullspace", "Column space", "Orthogonality", "Row space"],
      },
    ],
  };

  const { jsonString, suggestedFilename } = ArgusCourseBundleManager.exportBundle({
    course: sampleCourse,
    flashcards: [
      {
        id: "fc-1",
        front: "What are the dimensions of the four fundamental subspaces?",
        back: "Rank r, n-r, r, m-r",
        timestampSec: 120,
        timestampLabel: "02:00",
        sourceLectureTitle: "MIT 18.065 L1",
        tags: ["MIT", "Linear-Algebra"],
        repetition: 0,
        intervalDays: 1,
        easeFactor: 2.5,
        stability: 1.0,
        difficulty: 5.0,
        nextDueAt: Date.now(),
      },
    ],
  });

  assert.strictEqual(suggestedFilename, "mit-18-065-complete.argus-course");
  assert.ok(jsonString.includes("Gilbert Strang"));

  // Import bundle and verify
  const imported = ArgusCourseBundleManager.importBundle(jsonString);
  assert.strictEqual(imported.format, "argus-course-bundle");
  assert.strictEqual(imported.course.id, "mit-18-065");
  assert.strictEqual(imported.course.instructor, "Prof. Gilbert Strang");
  assert.strictEqual(imported.flashcards.length, 1);
  assert.strictEqual(imported.flashcards[0].front, "What are the dimensions of the four fundamental subspaces?");
});
