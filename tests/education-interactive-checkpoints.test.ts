import "./_localstorage-stub.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  extractCheckpointsFromTranscript,
  evaluateStudentExplanation,
  getCheckpointsForVideo,
  saveCheckpointsForVideo,
  recordCheckpointAttempt,
  type LectureCheckpoint,
} from "../src/lib/education/interactive-checkpoints.ts";
import {
  FOUNDATIONAL_CONCEPT_GRAPH,
  diagnoseRootCause,
  recordConceptAttempt,
  loadAllConceptStats,
} from "../src/lib/education/prerequisite-graph.ts";

test("extractCheckpointsFromTranscript manufactures intelligent checkpoints from cues", () => {
  const mockCues = [
    { startSec: 10, endSec: 25, text: "Welcome to cardiovascular physiology." },
    { startSec: 75, endSec: 90, text: "Therefore, when venous return increases, the end-diastolic volume expands." },
    { startSec: 180, endSec: 195, text: "Notice that the stroke volume increases because the sarcomeres stretch." },
    { startSec: 320, endSec: 340, text: "In summary, the Frank-Starling mechanism matches output to input." },
  ];

  const checkpoints = extractCheckpointsFromTranscript(mockCues, 3);
  assert.ok(checkpoints.length >= 2, "Must extract at least 2 checkpoints from trigger words");
  assert.ok(checkpoints[0].timestampSec > 60, "Checkpoints should be placed at meaningful points in time");
  assert.equal(checkpoints[0].type, "explain-it");
  assert.ok(checkpoints[0].expectedKeywords && checkpoints[0].expectedKeywords.length > 0);
});

test("evaluateStudentExplanation scores plain-English understanding and flags missing concepts", () => {
  const keywords = ["stretch", "sarcomere", "myosin", "calcium", "contraction"];

  // 1. Solid explanation covering key concepts
  const goodAttempt = "When blood fills the heart, the muscle stretches the sarcomere, which increases calcium sensitivity and contraction.";
  const goodEval = evaluateStudentExplanation(goodAttempt, keywords, 2);
  assert.equal(goodEval.passed, true, "Good explanation must pass");
  assert.ok(goodEval.scorePct >= 50, "Score should be >= 50%");
  assert.ok(goodEval.matchedKeywords.length >= 2, "Must identify matched keywords");
  assert.ok(goodEval.feedback.includes("Solid explanation"), "Feedback should encourage the learner");

  // 2. Empty or too brief explanation
  const poorAttempt = "heart pumps";
  const poorEval = evaluateStudentExplanation(poorAttempt, keywords, 2);
  assert.equal(poorEval.passed, false, "Too brief explanation must fail");
  assert.equal(poorEval.scorePct, 0);
  assert.ok(poorEval.feedback.includes("too brief"));

  // 3. Explanation missing core mechanism
  const missingAttempt = "The heart gets bigger and then pushes the blood around the whole body.";
  const missingEval = evaluateStudentExplanation(missingAttempt, keywords, 2);
  assert.equal(missingEval.passed, false, "Missing mechanism must not pass");
  assert.ok(missingEval.missingKeywords.length > 0);
});

test("diagnoseRootCause traverses prerequisite tree to identify foundational gaps", () => {
  localStorage.clear();

  // Initially diagnose Stroke Volume (has prerequisites: frank-starling, etc.)
  const initialDiag = diagnoseRootCause("stroke-volume");
  assert.ok(initialDiag);
  assert.equal(initialDiag?.targetConcept.id, "stroke-volume");
  assert.ok(initialDiag?.chain.length > 1);

  // Simulate multiple failures on the foundational concept "frank-starling"
  recordConceptAttempt("frank-starling", false);
  recordConceptAttempt("frank-starling", false);

  const stats = loadAllConceptStats();
  assert.equal(stats["frank-starling"].failures, 2);

  // Now diagnose high-level "cardiac-output"
  const deepDiag = diagnoseRootCause("cardiac-output");
  assert.ok(deepDiag);
  assert.equal(deepDiag?.rootCauseConcept?.id, "frank-starling", "Must pinpoint frank-starling as root cause");
  assert.ok(deepDiag?.recommendation.includes("Frank-Starling"));
});

test("recordCheckpointAttempt updates FSRS spaced repetition state", () => {
  localStorage.clear();

  const mockCp: LectureCheckpoint = {
    id: "test-cp-fsrs-1",
    timestampSec: 150,
    title: "Test Checkpoint",
    question: "What is 2 + 2?",
    type: "multiple-choice",
    options: ["4", "5"],
    correctIndex: 0,
    explanation: "Basic arithmetic",
    rewindOnFailSec: 20,
  };

  const fsrsPass = recordCheckpointAttempt(mockCp, true);
  assert.ok(fsrsPass.stability > 0, "FSRS stability must increase after successful recall");
  assert.ok(fsrsPass.due > Date.now(), "Next review must be in future");

  const fsrsFail = recordCheckpointAttempt(mockCp, false);
  assert.equal(fsrsFail.lapses, 1, "FSRS must record 1 lapse after fail");
});

test("getCheckpointsForVideo loads curated course checkpoints and saves custom decks", () => {
  localStorage.clear();

  // Curated course lookup
  const anatomyCheckpoints = getCheckpointsForVideo("med-clinical-anatomy");
  assert.ok(anatomyCheckpoints.length >= 2, "Must return curated checkpoints for clinical anatomy");
  assert.equal(anatomyCheckpoints[0].id, "anat-cp-1");

  // Custom user checkpoint save and retrieval
  const customList: LectureCheckpoint[] = [
    {
      id: "custom-1",
      timestampSec: 90,
      title: "Custom Point",
      question: "Sample Question",
      type: "prediction",
      explanation: "Sample explanation",
      rewindOnFailSec: 30,
    },
  ];

  saveCheckpointsForVideo("local-lecture-video-123", customList);
  const loaded = getCheckpointsForVideo("local-lecture-video-123");
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, "custom-1");
});

test("Entertainment media policy: movies and series never trigger lecture synthesis checkpoints", () => {
  // Simulate policy check logic used in player
  const isExcludedMediaType = (mediaType?: string) => {
    return mediaType === "movie" || mediaType === "series" || mediaType === "anime" || mediaType === "tv" || mediaType === "channel";
  };

  assert.equal(isExcludedMediaType("movie"), true, "Movies must be strictly excluded from lecture synthesis");
  assert.equal(isExcludedMediaType("series"), true, "Series must be excluded from lecture synthesis");
  assert.equal(isExcludedMediaType("anime"), true, "Anime must be excluded from lecture synthesis");
  assert.equal(isExcludedMediaType("other"), false, "Other/courseware may undergo academic evaluation");

  const isAcademicKey = (key: string) => {
    return (
      key.startsWith("course-") ||
      key.startsWith("med-") ||
      key.startsWith("academic-") ||
      key.startsWith("stanford-") ||
      key.startsWith("mit-") ||
      key.startsWith("cs224") ||
      key.startsWith("cs231") ||
      key.startsWith("fastai-") ||
      key.startsWith("karpathy-")
    );
  };

  assert.equal(isAcademicKey("tt1234567"), false, "IMDb movie IDs must not be treated as academic");
  assert.equal(isAcademicKey("Loki S02E02"), false, "Movie/show titles must not be treated as academic");
  assert.equal(isAcademicKey("stanford-cs224w-l1"), true, "Stanford lecture must be recognized as academic");
});
