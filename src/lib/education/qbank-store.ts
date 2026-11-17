import { useSyncExternalStore } from "react";
import type {
  ClinicalQuestion,
  QBankPack,
  QuestionDepthLevel,
  SubjectCategory,
} from "./qbank-types";
import { CLINICAL_QBANK_STARTER } from "./qbank-data";
import { classifyInicetQuestion } from "./inicet-classifier";
import { cleanExplanationPayload } from "./explanation-cleaner";

import { parseQuestionCore, type ImportReport } from "./question-integrity";

export type QBankImportResult = {
  success: boolean;
  pack?: QBankPack;
  error?: string;
  report?: ImportReport;
};

const PACKS_KEY = "argus.qbank.packs.v1";

const STARTER_PACK: QBankPack = {
  id: "argus-starter-pack",
  title: "Argus High-Yield AIIMS & NEET PG Starter Pack",
  description:
    "Core clinical questions with Socratic distractor analysis, trap radar, and bottom lines.",
  author: "Argus Medical Collective",
  version: "1.0.0",
  subject: "Mixed",
  totalQuestions: CLINICAL_QBANK_STARTER.length,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  questions: CLINICAL_QBANK_STARTER,
};

let packsCache: QBankPack[] | null = null;
const listeners = new Set<() => void>();

function readPacks(): QBankPack[] {
  if (packsCache) return packsCache;
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(PACKS_KEY);
      if (raw) {
        packsCache = JSON.parse(raw) as QBankPack[];
      } else {
        packsCache = [STARTER_PACK];
      }
    } else {
      packsCache = [STARTER_PACK];
    }
  } catch {
    packsCache = [STARTER_PACK];
  }
  return packsCache;
}

function commitPacks(packs: QBankPack[]): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(PACKS_KEY, JSON.stringify(packs));
  }
  packsCache = packs;
  for (const l of listeners) l();
}

export function subscribeQBankPacks(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAllPacks(): QBankPack[] {
  return readPacks();
}

export function useQBankPacks(): QBankPack[] {
  return useSyncExternalStore(subscribeQBankPacks, getAllPacks, getAllPacks);
}

export function getAllQuestions(): ClinicalQuestion[] {
  const packs = readPacks();
  return packs.flatMap((p) => p.questions);
}

/**
 * Filter questions by INICET cognitive depth level
 */
export function getQuestionsByDepth(levels: QuestionDepthLevel[]): ClinicalQuestion[] {
  const all = getAllQuestions();
  const set = new Set(levels);
  return all.filter((q) => q.depthLevel && set.has(q.depthLevel));
}

/**
 * Returns only authentic multi-step clinical vignettes and INICET traps
 */
export function getInicetHighYieldQuestions(): ClinicalQuestion[] {
  return getQuestionsByDepth(["L3_MultiStepClinical", "L4_InicetTrap"]);
}

/**
 * Heuristically parses and sanitizes any clinical question from arbitrary JSON formats
 * Handles:
 * - MedQA JSON / JSONL formats
 * - Object options: {"A": "text", "B": "text"} or array options ["text", "text"]
 * - Character answers: "A", "B", "C" or index answers 0, 1, 2
 * - Varied field names: prompt, stem, query, vignette, options, choices, answer, solution, etc.
 */
export function sanitizePolyglotQuestion(
  raw: any,
  index: number,
  packId: string,
): ClinicalQuestion {
  const { vignette, options, answerSpec } = parseQuestionCore(raw);
  const correctIndex =
    answerSpec.kind === "single"
      ? answerSpec.correctIndex
      : answerSpec.kind === "multiple"
        ? answerSpec.correctIndices[0]
        : answerSpec.correctMatches[0];
  // 4. Extract Explanation / Rationale & Distractor Breakdown
  let rawExplanation =
    raw.explanation?.correctRationale ||
    raw.explanation?.text ||
    raw.explanation ||
    raw.rationale ||
    raw.solution ||
    raw.analysis ||
    "Explanation not supplied. This answer has not been independently verified.";

  if (typeof rawExplanation !== "string") {
    rawExplanation = "Explanation not supplied. This answer has not been independently verified.";
  }

  // 5. Extract Distractor Breakdown
  let distractorBreakdown: { option: string; reason: string }[] = [];
  if (Array.isArray(raw.explanation?.distractorBreakdown)) {
    distractorBreakdown = raw.explanation.distractorBreakdown;
  } else if (raw.distractors && typeof raw.distractors === "object") {
    distractorBreakdown = Object.entries(raw.distractors).map(([opt, reason]) => ({
      option: String(opt),
      reason: String(reason),
    }));
  }

  // Clean raw HTML artifacts, customMeta tags, and parse embedded distractor breakdown & references
  const cleaned = cleanExplanationPayload(rawExplanation, distractorBreakdown);
  const correctRationale = cleaned.correctRationale;
  distractorBreakdown = cleaned.distractorBreakdown;

  // 6. Extract Trap & Bottom Line
  const examinerTrap =
    raw.examinerTrap ||
    raw.trap ||
    raw.pitfall ||
    raw.trick ||
    "Watch out for distractors that sound plausible but lack key clinical criteria.";

  const bottomLine =
    raw.explanation?.bottomLine ||
    raw.bottomLine ||
    raw.takeaway ||
    raw.pearl ||
    (cleaned.reference
      ? `Reference: ${cleaned.reference}`
      : "Core high-yield principle for clinical recall.");

  // 7. Extract Subject
  const validSubjects: SubjectCategory[] = [
    "Pathology",
    "Pharmacology",
    "Medicine",
    "Surgery",
    "OBGYN",
    "Microbiology",
    "Radiology",
    "Biochemistry",
    "Anatomy",
    "Physiology",
    "Pediatrics",
    "Orthopedics",
    "Ophthalmology",
    "ENT",
    "Dermatology",
    "Psychiatry",
    "Anesthesia",
    "FMT",
    "PSM",
  ];
  const rawSubject = raw.subject || raw.category || raw.system || "Medicine";
  const matchedSubject =
    validSubjects.find((s) => s.toLowerCase() === String(rawSubject).toLowerCase()) || "Medicine";
  const imgUrl = raw.imageUrl || raw.image || raw.figure;

  // Run INICET cognitive depth and pattern classifier
  const classification = classifyInicetQuestion(vignette, options, Boolean(imgUrl));

  const tags = Array.isArray(raw.highYieldTags)
    ? [...raw.highYieldTags]
    : Array.isArray(raw.tags)
      ? [...raw.tags]
      : ["Open Data", matchedSubject];

  if (classification.depthLevel === "L4_InicetTrap") {
    tags.push("INICET Trap");
  } else if (classification.depthLevel === "L3_MultiStepClinical") {
    tags.push("Clinical Vignette");
  }

  return {
    id: raw.id || `q_${packId}_${index}`,
    subject: matchedSubject,
    topic:
      typeof (raw.topic ?? raw.theme) === "string" ? (raw.topic ?? raw.theme) : "Clinical Case",
    vignette,
    imageUrl: typeof imgUrl === "string" ? imgUrl : undefined,
    options,
    correctIndex: correctIndex,
    answerSpec,
    assertionReason:
      typeof raw.assertionReason?.assertion === "string" &&
      typeof raw.assertionReason?.reason === "string"
        ? { assertion: raw.assertionReason.assertion, reason: raw.assertionReason.reason }
        : undefined,
    provenance: {
      kind: ["original", "recalled", "generated"].includes(raw.provenance?.kind)
        ? raw.provenance.kind
        : "unknown",
      source:
        typeof raw.provenance?.source === "string"
          ? raw.provenance.source
          : cleaned.reference || undefined,
      edition: typeof raw.provenance?.edition === "string" ? raw.provenance.edition : undefined,
      publishedAt:
        typeof raw.provenance?.publishedAt === "string" ? raw.provenance.publishedAt : undefined,
      status: "unverified",
    },
    learningLink:
      typeof raw.learningLink?.url === "string" && /^https?:\/\//.test(raw.learningLink.url)
        ? {
            url: raw.learningLink.url,
            timestampSec:
              Number.isFinite(raw.learningLink.timestampSec) && raw.learningLink.timestampSec >= 0
                ? raw.learningLink.timestampSec
                : undefined,
            relatedQuestionId:
              typeof raw.learningLink.relatedQuestionId === "string"
                ? raw.learningLink.relatedQuestionId
                : undefined,
          }
        : undefined,
    examinerTrap: typeof examinerTrap === "string" ? examinerTrap : "Trap not supplied.",
    explanation: {
      correctRationale,
      distractorBreakdown,
      bottomLine: typeof bottomLine === "string" ? bottomLine : "Takeaway not supplied.",
    },
    highYieldTags: Array.from(new Set(tags.filter((tag) => typeof tag === "string"))),
    depthLevel: raw.depthLevel || classification.depthLevel,
    format:
      answerSpec.kind === "multiple"
        ? "MultipleTrueFalse"
        : answerSpec.kind === "matching"
          ? "MatchingMatrix"
          : raw.format || "SingleBestAnswer",
    clinicalScore: raw.clinicalScore ?? classification.score,
    author: typeof raw.author === "string" ? raw.author : undefined,
    sourceExam:
      typeof (raw.sourceExam ?? raw.exam) === "string" ? (raw.sourceExam ?? raw.exam) : undefined,
    packId,
  };
}

/**
 * Universal JSON / JSONL importer
 */
export function importQBankPack(rawText: string, customTitle?: string): QBankImportResult {
  const report: ImportReport = { accepted: 0, rejected: [] };
  const normalize = (items: unknown[], packId: string): ClinicalQuestion[] => {
    const ids = new Set<string>();
    return items.flatMap((raw, index) => {
      try {
        if ((raw as { __argusParseFailure?: boolean } | null)?.__argusParseFailure)
          throw new Error("Invalid JSON on this JSONL line.");
        const question = sanitizePolyglotQuestion(raw, index, packId);
        if (ids.has(question.id)) throw new Error("Duplicate question id.");
        ids.add(question.id);
        report.accepted++;
        return [question];
      } catch (error) {
        report.rejected.push({
          item: index + 1,
          reason: error instanceof Error ? error.message : "Invalid question.",
        });
        return [];
      }
    });
  };
  try {
    let parsed: any = null;

    // Try standard JSON parse
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // If failed, try parsing as JSON Lines (JSONL) (common in MedQA / AI datasets)
      const lines = rawText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length > 0) {
        parsed = lines.map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return { __argusParseFailure: true };
          }
        });
      }
    }

    if (!parsed) {
      return { success: false, error: "Empty or unparseable input." };
    }

    // Case 1: Standard QBankPack
    if (parsed.id && parsed.title && Array.isArray(parsed.questions)) {
      const pack: QBankPack = {
        id: parsed.id || `pack_${Date.now()}`,
        title: customTitle || parsed.title,
        description: parsed.description || "Imported community question pack",
        author: parsed.author || "Community Contributor",
        version: parsed.version || "1.0.0",
        subject: parsed.subject || "Mixed",
        totalQuestions: parsed.questions.length,
        createdAt: parsed.createdAt || Date.now(),
        updatedAt: Date.now(),
        questions: normalize(parsed.questions, parsed.id),
      };

      pack.importReport = report;
      pack.totalQuestions = pack.questions.length;
      if (!pack.totalQuestions)
        return { success: false, error: "No valid questions. Review the rejected items.", report };
      const existing = readPacks().filter((p) => p.id !== pack.id);
      commitPacks([...existing, pack]);
      return { success: true, pack, report };
    }

    // Case 2: Array of raw questions or object with data array / tests container
    let questionsArray = Array.isArray(parsed)
      ? parsed
      : parsed.data || parsed.results || parsed.items || parsed.questions;

    // Handle nested format like archiboltmusk/qbank: { "tests": [ { "id": "...", "questions": [...] } ] }
    if (!questionsArray && parsed.tests && Array.isArray(parsed.tests)) {
      const flattened: any[] = [];
      for (const t of parsed.tests) {
        if (Array.isArray(t.questions)) {
          for (const q of t.questions) {
            flattened.push({
              ...q,
              topic: t.title || t.id,
              subject: t.subject || parsed.subject || "Clinical",
            });
          }
        }
      }
      if (flattened.length > 0) {
        questionsArray = flattened;
      }
    }

    if (Array.isArray(questionsArray)) {
      const packId = `pack_import_${Date.now()}`;
      const pack: QBankPack = {
        id: packId,
        title: customTitle || parsed.title || `Imported Dataset (${questionsArray.length} Qs)`,
        description:
          parsed.description ||
          `Polyglot imported pool of ${questionsArray.length} clinical questions.`,
        author: parsed.author || "Open Data Contributor",
        version: "1.0.0",
        subject: "Mixed",
        totalQuestions: questionsArray.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        questions: normalize(questionsArray, packId),
      };

      pack.importReport = report;
      pack.totalQuestions = pack.questions.length;
      if (!pack.totalQuestions)
        return { success: false, error: "No valid questions. Review the rejected items.", report };
      const existing = readPacks();
      commitPacks([...existing, pack]);
      return { success: true, pack, report };
    }

    return {
      success: false,
      error: "Unrecognized format. Expected JSON array or QBankPack object.",
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Invalid syntax.", report };
  }
}

/**
 * Fetch and import directly from a GitHub Raw URL or web URL
 */
export async function importFromGitHubUrl(url: string, title?: string): Promise<QBankImportResult> {
  try {
    let cleanUrl = url.trim();
    // Convert standard github.com/blob/ links to raw.githubusercontent.com
    if (cleanUrl.includes("github.com") && cleanUrl.includes("/blob/")) {
      cleanUrl = cleanUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
    }

    const res = await fetch(cleanUrl);
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}: Failed to fetch file from URL.` };
    }

    const buffer = await res.arrayBuffer();
    const { readEducationalFileText } = await import("./json-gz-importer");
    const text = await readEducationalFileText(buffer);
    return importQBankPack(text, title);
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error fetching remote dataset." };
  }
}

/**
 * Add a single community question into the local user contributions pack
 */
export function addSingleQuestion(question: Omit<ClinicalQuestion, "id">): ClinicalQuestion {
  parseQuestionCore(question);
  const packs = readPacks();
  let userPack = packs.find((p) => p.id === "user-custom-pack");

  const created: ClinicalQuestion = {
    ...question,
    id: `q_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    packId: "user-custom-pack",
  };

  if (!userPack) {
    userPack = {
      id: "user-custom-pack",
      title: "My Custom High-Yield QBank",
      description: "Locally authored and contributed clinical cases.",
      author: "Local Scholar",
      version: "1.0.0",
      subject: "Mixed",
      totalQuestions: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      questions: [created],
    };
    commitPacks([userPack, ...packs]);
  } else {
    userPack = {
      ...userPack,
      questions: [created, ...userPack.questions],
      totalQuestions: userPack.questions.length + 1,
      updatedAt: Date.now(),
    };
    commitPacks(packs.map((p) => (p.id === userPack!.id ? userPack! : p)));
  }

  return created;
}

export function exportPackAsJson(packId: string): string {
  const packs = readPacks();
  const pack = packs.find((p) => p.id === packId);
  if (!pack) return "{}";
  return JSON.stringify(pack, null, 2);
}

export function deletePack(packId: string): void {
  if (packId === "argus-starter-pack") return;
  const packs = readPacks();
  commitPacks(packs.filter((p) => p.id !== packId));
}

/** A local reviewer must explicitly supply a reference and an explanation. */
export function reviewQBankQuestion(
  packId: string,
  questionId: string,
  review: {
    source: string;
    edition: string;
    reviewer: string;
    rationale: string;
    reason: string;
    correctIndex?: number;
  },
): void {
  if (
    ![review.source, review.reviewer, review.rationale, review.reason].every((value) =>
      value.trim(),
    )
  ) {
    throw new Error("A source, reviewer, rationale and change reason are required.");
  }
  const packs = readPacks();
  const pack = packs.find((item) => item.id === packId);
  const previous = pack?.questions.find((question) => question.id === questionId);
  if (!pack || !previous || packId === STARTER_PACK.id)
    throw new Error("Choose a question from an editable imported pack.");
  const date = new Date().toISOString();
  const single = !previous.answerSpec || previous.answerSpec.kind === "single";
  const correctIndex = single
    ? (review.correctIndex ?? previous.correctIndex)
    : previous.correctIndex;
  const question: ClinicalQuestion = {
    ...previous,
    correctIndex,
    answerSpec: single ? { kind: "single", correctIndex } : previous.answerSpec,
    explanation: { ...previous.explanation, correctRationale: review.rationale.trim() },
    provenance: {
      ...previous.provenance,
      kind: previous.provenance?.kind ?? "unknown",
      status: "reviewed",
      source: review.source.trim(),
      edition: review.edition.trim(),
      reviewer: review.reviewer.trim(),
      reviewedAt: date,
      corrections: [
        ...(previous.provenance?.corrections ?? []),
        {
          date,
          reason: review.reason.trim(),
          reviewer: review.reviewer.trim(),
          previous: {
            correctIndex: previous.correctIndex,
            answerSpec: previous.answerSpec,
            rationale: previous.explanation.correctRationale,
            source: previous.provenance?.source,
          },
        },
      ],
    },
  };
  parseQuestionCore(question);
  const updated = {
    ...pack,
    updatedAt: Date.now(),
    questions: pack.questions.map((item) => (item.id === questionId ? question : item)),
  };
  commitPacks(packs.map((item) => (item.id === packId ? updated : item)));
}
