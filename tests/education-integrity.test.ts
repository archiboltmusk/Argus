import assert from "node:assert/strict";
import test from "node:test";
import { fsrs, Rating } from "ts-fsrs";
import { parseQuestionCore, isCorrectAnswer } from "../src/lib/education/question-integrity.ts";
import {
  importQBankPack,
  getAllPacks,
  exportPackAsJson,
} from "../src/lib/education/qbank-store.ts";
import { createInitialCard, scheduleReview, toCard, fromCard } from "../src/lib/education/fsrs.ts";
import {
  newAttempt,
  attemptKey,
  saveAttempt,
  loadAttempt,
  elapsedSeconds,
} from "../src/lib/education/attempts.ts";
import {
  initialSimulation,
  investigationReady,
  transitionSimulation,
} from "../src/lib/education/simulation.ts";
import { CLINICAL_SIMULATOR_CASES } from "../src/lib/education/simulator-data.ts";
import { buildStudyPlan } from "../src/lib/education/study-plan.ts";
import { CLINICAL_QBANK_STARTER } from "../src/lib/education/qbank-data.ts";
import {
  saveStudyNote,
  getStudyNotes,
  reviewStudyNote,
  exportNotesAsJson,
  importNotesFromJson,
} from "../src/lib/education/notes.ts";

const storage = new Map<string, string>();
let quotaExceeded = false;
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (quotaExceeded) throw new Error("QuotaExceededError");
      storage.set(key, value);
    },
    removeItem: (key: string) => storage.delete(key),
    get length() {
      return storage.size;
    },
    key: (index: number) => [...storage.keys()][index] ?? null,
  },
});
const valid = {
  id: "valid",
  question: "Which option is explicitly keyed?",
  options: ["First", "Second"],
  answer: "B",
};

test("missing, conflicting, fractional and ambiguous keys never become option A", () => {
  for (const raw of [
    { ...valid, answer: undefined },
    { ...valid, options: [] },
    { ...valid, answer: 0.5 },
    { ...valid, answer: 1 },
    { ...valid, answer: "Sec" },
    { ...valid, answer: "Z" },
    { ...valid, correctIndex: 0 },
    { ...valid, options: ["same", "SAME"] },
    {
      ...valid,
      options: [
        { text: "A", correct: true },
        { text: "B", correct: true },
      ],
    },
  ]) {
    assert.throws(() => parseQuestionCore(raw));
  }
  assert.equal(parseQuestionCore(valid).answerSpec.kind, "single");
  assert.deepEqual(
    parseQuestionCore({
      ...valid,
      answer: undefined,
      options: { B: "Second", A: "First" },
      correctIndex: 1,
    }).options,
    ["First", "Second"],
  );
});

test("mixed import excludes every malformed item, persists a report, and round-trips accepted multi-answer questions", () => {
  const multi = {
    ...valid,
    id: "multi",
    answer: undefined,
    answerSpec: { kind: "multiple", correctIndices: [0, 1] },
  };
  const result = importQBankPack(
    JSON.stringify({
      id: "safe-pack",
      title: "Test",
      questions: [valid, { ...valid, answer: undefined }, multi, valid],
    }),
  );
  assert.equal(result.success, true);
  assert.equal(result.pack?.totalQuestions, 2);
  assert.deepEqual(
    result.report?.rejected.map((entry) => entry.item),
    [2, 4],
  );
  assert.equal(result.pack?.questions[0].provenance?.status, "unverified");
  const exported = exportPackAsJson("safe-pack");
  assert.equal(importQBankPack(exported).pack?.totalQuestions, 2);
  const failed = importQBankPack(
    JSON.stringify({
      id: "safe-pack",
      title: "Test",
      questions: [{ ...valid, answer: undefined }],
    }),
  );
  assert.equal(failed.success, false);
  assert.equal(getAllPacks().find((pack) => pack.id === "safe-pack")?.totalQuestions, 2);
});

test("storage failure never replaces a previously durable pack in the live cache", () => {
  const previous = getAllPacks();
  quotaExceeded = true;
  try {
    assert.equal(importQBankPack(JSON.stringify([valid])).success, false);
    assert.strictEqual(getAllPacks(), previous);
  } finally {
    quotaExceeded = false;
  }
});

test("single, multiple and matching use exact grading without first-option shortcuts", () => {
  const question = CLINICAL_QBANK_STARTER[0];
  const multiple = {
    ...question,
    answerSpec: { kind: "multiple" as const, correctIndices: [0, 2] },
  };
  assert.equal(isCorrectAnswer(multiple, [2, 0]), true);
  for (const answer of [[0], [0, 2, 1], [0, 0], 0])
    assert.equal(isCorrectAnswer(multiple, answer), false);
  const matching = {
    ...question,
    answerSpec: { kind: "matching" as const, prompts: ["One", "Two"], correctMatches: [1, 0] },
  };
  assert.equal(isCorrectAnswer(matching, { 0: 1, 1: 0 }), true);
  assert.equal(isCorrectAnswer(matching, { 0: 1 }), false);
});

test("twenty answered questions restore exactly after process loss; changed content and profiles cannot inherit an attempt", () => {
  const questions = Array.from({ length: 20 }, (_, i) => ({
    ...CLINICAL_QBANK_STARTER[0],
    id: `q${i}`,
  }));
  const state = newAttempt(1000);
  for (const question of questions) {
    state.selectedAnswers[question.id] = 1;
    state.eliminatedOptions[question.id] = [0, 2];
    state.isSubmitted[question.id] = true;
    state.timeSpentSec[question.id] = 12;
  }
  state.bookmarks = ["q3", "q9"];
  state.guessedQuestions = { q5: true };
  state.markedForReview = ["q7"];
  state.activeQuestionIndex = 19;
  const key = attemptKey(questions, false);
  saveAttempt(key, questions, state);
  assert.deepEqual(loadAttempt(key, questions), state);
  assert.equal(elapsedSeconds(loadAttempt(key, questions), 61000), 60);
  const changed = questions.map((question) => ({ ...question, vignette: "Changed" }));
  assert.deepEqual(loadAttempt(key, changed, 9000).selectedAnswers, {});
  localStorage.setItem(
    "argus.profiles.v1",
    JSON.stringify({ activeId: "other", profiles: [{ id: "other" }] }),
  );
  assert.notEqual(attemptKey(questions, false), key);
  localStorage.removeItem("argus.profiles.v1");
  quotaExceeded = true;
  try {
    assert.throws(() => saveAttempt(key, questions, state));
  } finally {
    quotaExceeded = false;
  }
});

test("FSRS adapter exactly follows the canonical scheduler across learning, lapse and delayed recall", () => {
  const scheduler = fsrs({ request_retention: 0.9, maximum_interval: 365, enable_fuzz: false });
  let current = createInitialCard(100000);
  for (const [rating, grade, now] of [
    ["good", Rating.Good, 100000],
    ["easy", Rating.Easy, 700000],
    ["again", Rating.Again, 900000000],
    ["hard", Rating.Hard, 900060000],
  ] as const) {
    const expected = fromCard(scheduler.next(toCard(current), new Date(now), grade).card);
    current = scheduleReview(current, rating, now);
    assert.deepEqual(current, expected);
  }
  assert.throws(() => scheduleReview(current, "good", 1));
});

test("note reviews save their history atomically and keep it through export/import", () => {
  const note = saveStudyNote({
    itemId: "lesson",
    itemTitle: "Lesson",
    timestampSec: 90,
    timestampLabel: "01:30",
    markdown: "Recall",
  });
  reviewStudyNote(note.id, "good");
  const before = getStudyNotes().find((item) => item.id === note.id)!;
  assert.equal(before.reviewHistory?.length, 1);
  quotaExceeded = true;
  try {
    assert.throws(() => reviewStudyNote(note.id, "easy"));
  } finally {
    quotaExceeded = false;
  }
  assert.strictEqual(
    getStudyNotes().find((item) => item.id === note.id),
    before,
  );
  assert.equal(importNotesFromJson(exportNotesAsJson()).success, true);
  assert.equal(getStudyNotes().find((item) => item.id === note.id)?.reviewHistory?.length, 1);
});

test("simulation respects turnaround time, authored prerequisites and explicit reassessment", () => {
  const original = CLINICAL_SIMULATOR_CASES[0];
  const investigation = original.availableInvestigations[0];
  const procedure = original.availableInterventions.find(
    (item) => item.isCorrect && item.category === "procedure",
  )!;
  const caseData = {
    ...original,
    availableInterventions: [{ ...procedure, requiresInvestigations: [investigation.id] }],
  };
  let state = initialSimulation(caseData);
  assert.strictEqual(
    transitionSimulation(caseData, state, { type: "perform", id: procedure.id }),
    state,
  );
  state = transitionSimulation(caseData, state, { type: "order", id: investigation.id });
  assert.equal(investigationReady(state, investigation.id), investigation.turnaroundTimeSec === 0);
  state = transitionSimulation(caseData, state, {
    type: "advance",
    seconds: investigation.turnaroundTimeSec || 1,
  });
  assert.equal(investigationReady(state, investigation.id), true);
  state = transitionSimulation(caseData, state, { type: "perform", id: procedure.id });
  assert.equal(state.resolved, false);
  state = transitionSimulation(caseData, state, { type: "reassess" });
  assert.equal(state.resolved, true);
  assert.equal(state.timeline.at(-1)?.action, "Reassessed: scenario goals completed");
});

test("short duty plans prioritize confident errors and due reviews within budget", () => {
  const questions = CLINICAL_QBANK_STARTER.slice(0, 4);
  const attempt = newAttempt();
  const wrong = questions[3];
  attempt.selectedAnswers[wrong.id] = (wrong.correctIndex + 1) % wrong.options.length;
  attempt.isSubmitted[wrong.id] = true;
  attempt.confidence = { [wrong.id]: "confident" };
  const plan = buildStudyPlan(questions, [], [attempt], 10);
  assert.equal(plan.questions[0].id, wrong.id);
  assert.deepEqual(plan.confidentWrong, [wrong.id]);
  assert.ok(plan.questions.length * 2 + plan.reviews.length <= 10);
});

test("local reviews require attribution and retain the previous answer and rationale", async () => {
  const { reviewQBankQuestion } = await import("../src/lib/education/qbank-store.ts");
  const before = getAllPacks().find((pack) => pack.id === "safe-pack")!.questions[0];
  assert.throws(() =>
    reviewQBankQuestion("safe-pack", before.id, {
      source: "",
      edition: "",
      reviewer: "",
      rationale: "",
      reason: "",
    }),
  );
  reviewQBankQuestion("safe-pack", before.id, {
    source: "Reference supplied by reviewer",
    edition: "Test edition",
    reviewer: "Test reviewer",
    rationale: "Explicit explanation",
    reason: "Corrected source key",
    correctIndex: 0,
  });
  const updated = getAllPacks().find((pack) => pack.id === "safe-pack")!.questions[0];
  assert.equal(updated.provenance?.status, "reviewed");
  assert.equal(updated.provenance?.corrections?.[0].previous?.correctIndex, 1);
  assert.equal(updated.correctIndex, 0);
  quotaExceeded = true;
  try {
    assert.throws(() =>
      reviewQBankQuestion("safe-pack", before.id, {
        source: "Reference",
        edition: "",
        reviewer: "Test",
        rationale: "New rationale",
        reason: "New correction",
        correctIndex: 1,
      }),
    );
  } finally {
    quotaExceeded = false;
  }
  assert.strictEqual(getAllPacks().find((pack) => pack.id === "safe-pack")!.questions[0], updated);
});

test("JSONL keeps valid rows and identifies broken syntax by original item number", () => {
  const result = importQBankPack(
    [
      JSON.stringify({ ...valid, id: "jsonl1" }),
      "{broken",
      JSON.stringify({ ...valid, id: "jsonl3" }),
    ].join("\n"),
  );
  assert.equal(result.success, true);
  assert.equal(result.pack?.totalQuestions, 2);
  assert.deepEqual(result.report?.rejected, [
    { item: 2, reason: "Invalid JSON on this JSONL line." },
  ]);
});

test("numeric aliases require an explicit index base", () => {
  assert.throws(() => parseQuestionCore({ ...valid, answer: 1 }));
  assert.deepEqual(parseQuestionCore({ ...valid, answer: 1, answerIndexBase: 1 }).answerSpec, {
    kind: "single",
    correctIndex: 0,
  });
  assert.deepEqual(parseQuestionCore({ ...valid, answer: 1, answerIndexBase: 0 }).answerSpec, {
    kind: "single",
    correctIndex: 1,
  });
});

test("letter-plus-text keys must agree, and rejected questions cannot fall through into flashcards", async () => {
  assert.equal(parseQuestionCore({ ...valid, answer: "B. Second" }).answerSpec.kind, "single");
  assert.throws(() => parseQuestionCore({ ...valid, answer: "B. First" }));
  const { importEducationalFile } = await import("../src/lib/education/json-gz-importer.ts");
  const before = getStudyNotes().length;
  const result = await importEducationalFile(
    JSON.stringify([{ text: "Question without key", options: ["A", "B"] }]),
  );
  assert.equal(result.success, false);
  assert.equal(result.type, "qbank");
  assert.equal(result.report?.rejected.length, 1);
  assert.equal(getStudyNotes().length, before);
});

test("new attempts keep completed history and corrected content cannot inherit old error priorities", async () => {
  const { listAttempts } = await import("../src/lib/education/attempts.ts");
  const questions = [{ ...CLINICAL_QBANK_STARTER[0], id: "history-question" }];
  const key = attemptKey(questions, false);
  const old = newAttempt(100);
  old.selectedAnswers[questions[0].id] =
    (questions[0].correctIndex + 1) % questions[0].options.length;
  old.isSubmitted[questions[0].id] = true;
  old.result = {
    id: "history-result",
    examTitle: "Practice",
    timestamp: 101,
    totalQuestions: 1,
    attempted: 1,
    correct: 0,
    incorrect: 1,
    score: -1,
    maxScore: 4,
    accuracyPct: 0,
    timeSpentMinutes: 1,
  };
  saveAttempt(key, questions, old);
  saveAttempt(key, questions, newAttempt(200));
  assert.ok(listAttempts(questions).some((attempt) => attempt.result?.id === "history-result"));
  const corrected = questions.map((question) => ({
    ...question,
    correctIndex: Number(old.selectedAnswers[question.id]),
  }));
  assert.ok(
    listAttempts(corrected).every(
      (attempt) => attempt.selectedAnswers[questions[0].id] === undefined,
    ),
  );
  localStorage.setItem(key, "broken-json");
  saveAttempt(key, questions, newAttempt(300));
  assert.equal(loadAttempt(key, questions).startedAt, 300);
});

test("large question stems are fingerprinted rather than duplicated into every attempt", () => {
  const questions = [
    { ...CLINICAL_QBANK_STARTER[0], id: "large-stem", vignette: "clinical-context ".repeat(10000) },
  ];
  const key = attemptKey(questions, false);
  saveAttempt(key, questions, newAttempt());
  assert.ok(localStorage.getItem(key)!.length < 2000);
  assert.notEqual(
    attemptKey([{ ...questions[0], imageUrl: "https://example.invalid/new-image.jpg" }], false),
    key,
  );
});

test("every shipped simulation can finish after its authored goals, including medication-only cases", () => {
  for (const caseData of CLINICAL_SIMULATOR_CASES) {
    let state = initialSimulation(caseData);
    for (const intervention of caseData.availableInterventions.filter((item) => item.isCorrect)) {
      state = transitionSimulation(caseData, state, { type: "perform", id: intervention.id });
    }
    assert.equal(state.resolved, false);
    state = transitionSimulation(caseData, state, { type: "reassess" });
    assert.equal(state.resolved, true, caseData.id);
  }
});
