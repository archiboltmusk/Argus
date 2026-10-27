import { useSyncExternalStore } from "react";
import type { ClinicalQuestion, QBankPack, QuestionDepthLevel, SubjectCategory } from "./qbank-types";
import { CLINICAL_QBANK_STARTER } from "./qbank-data";
import { classifyInicetQuestion } from "./inicet-classifier";
import { cleanExplanationPayload } from "./explanation-cleaner";

const PACKS_KEY = "argus.qbank.packs.v1";

const STARTER_PACK: QBankPack = {
  id: "argus-starter-pack",
  title: "Argus High-Yield AIIMS & NEET PG Starter Pack",
  description: "Core clinical questions with Socratic distractor analysis, trap radar, and bottom lines.",
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
  packsCache = packs;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PACKS_KEY, JSON.stringify(packs));
    }
  } catch (e) {
    console.warn("[qbank-store] failed to save packs", e);
  }
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
export function sanitizePolyglotQuestion(raw: any, index: number, packId: string): ClinicalQuestion {
  // 1. Extract Vignette / Question
  const vignette =
    raw.vignette ||
    raw.question ||
    raw.prompt ||
    raw.stem ||
    raw.query ||
    raw.item ||
    raw.text ||
    "Clinical vignette content missing.";

  // 2. Extract Options
  let options: string[] = [];
  let optionCorrectFromFlag: number | null = null;

  if (Array.isArray(raw.options)) {
    options = raw.options.map((opt: any, idx: number) => {
      if (opt && typeof opt === "object") {
        if (opt.correct === true) optionCorrectFromFlag = idx;
        return String(opt.text || opt.label || JSON.stringify(opt));
      }
      return String(opt);
    });
  } else if (Array.isArray(raw.choices)) {
    options = raw.choices.map((c: any, idx: number) => {
      if (typeof c === "object") {
        if (c.correct === true) optionCorrectFromFlag = idx;
        return c.text || c.choice || JSON.stringify(c);
      }
      return String(c);
    });
  } else if (raw.options && typeof raw.options === "object") {
    // {"A": "Option 1", "B": "Option 2"}
    options = ["A", "B", "C", "D", "E"]
      .filter((k) => raw.options[k] !== undefined)
      .map((k) => String(raw.options[k]));
  } else if (raw.choices && typeof raw.choices === "object") {
    options = Object.values(raw.choices).map(String);
  }

  if (options.length < 2) {
    options = ["Option A", "Option B", "Option C", "Option D"];
  }

  // 3. Extract Correct Index
  let correctIndex = optionCorrectFromFlag ?? 0;
  if (optionCorrectFromFlag === null) {
    const rawAns = raw.correctIndex ?? raw.answer_idx ?? raw.answer ?? raw.correct_answer ?? raw.correct ?? raw.label;
    if (typeof rawAns === "number" && rawAns >= 0 && rawAns < options.length) {
      correctIndex = rawAns;
    } else if (typeof rawAns === "string") {
      const trimmed = rawAns.trim();
      const firstChar = trimmed[0]?.toUpperCase();
      if (trimmed.length === 1 && firstChar >= "A" && firstChar <= "E") {
        correctIndex = firstChar.charCodeAt(0) - 65;
      } else if (trimmed.length >= 2 && trimmed[1] === "." && firstChar >= "A" && firstChar <= "E") {
        // e.g. "D. The absolute contraindication..."
        correctIndex = firstChar.charCodeAt(0) - 65;
      } else {
        // String match against options
        const foundIdx = options.findIndex((opt) => opt.toLowerCase().includes(trimmed.toLowerCase()));
        if (foundIdx !== -1) correctIndex = foundIdx;
      }
    }
  }

  // 4. Extract Explanation / Rationale & Distractor Breakdown
  let rawExplanation =
    raw.explanation?.correctRationale ||
    raw.explanation?.text ||
    raw.explanation ||
    raw.rationale ||
    raw.solution ||
    raw.analysis ||
    "Diagnostic rationale confirmed by clinical presentation.";

  if (typeof rawExplanation !== "string") {
    rawExplanation = JSON.stringify(rawExplanation);
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
    (cleaned.reference ? `Reference: ${cleaned.reference}` : "Core high-yield principle for clinical recall.");

  // 7. Extract Subject
  const validSubjects: SubjectCategory[] = [
    "Pathology", "Pharmacology", "Medicine", "Surgery", "OBGYN", "Microbiology",
    "Radiology", "Biochemistry", "Anatomy", "Physiology", "Pediatrics",
    "Orthopedics", "Ophthalmology", "ENT", "Dermatology", "Psychiatry", "Anesthesia", "FMT", "PSM"
  ];
  const rawSubject = raw.subject || raw.category || raw.system || "Medicine";
  const matchedSubject = validSubjects.find((s) => s.toLowerCase() === String(rawSubject).toLowerCase()) || "Medicine";
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
    id: raw.id || `q_${packId}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    subject: matchedSubject,
    topic: raw.topic || raw.theme || "Clinical Case",
    vignette,
    imageUrl: imgUrl,
    options,
    correctIndex: Math.min(correctIndex, options.length - 1),
    examinerTrap,
    explanation: {
      correctRationale,
      distractorBreakdown,
      bottomLine,
    },
    highYieldTags: Array.from(new Set(tags)),
    depthLevel: raw.depthLevel || classification.depthLevel,
    format: raw.format || classification.format,
    clinicalScore: raw.clinicalScore ?? classification.score,
    author: raw.author,
    sourceExam: raw.sourceExam || raw.exam,
    packId,
  };
}

/**
 * Universal JSON / JSONL importer
 */
export function importQBankPack(rawText: string, customTitle?: string): { success: boolean; pack?: QBankPack; error?: string } {
  try {
    let parsed: any = null;

    // Try standard JSON parse
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // If failed, try parsing as JSON Lines (JSONL) (common in MedQA / AI datasets)
      const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        parsed = lines.map((line) => JSON.parse(line));
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
        questions: parsed.questions.map((q: any, i: number) => sanitizePolyglotQuestion(q, i, parsed.id)),
      };

      const existing = readPacks().filter((p) => p.id !== pack.id);
      commitPacks([...existing, pack]);
      return { success: true, pack };
    }

    // Case 2: Array of raw questions or object with data array / tests container
    let questionsArray = Array.isArray(parsed) ? parsed : parsed.data || parsed.results || parsed.items || parsed.questions;

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
        description: parsed.description || `Polyglot imported pool of ${questionsArray.length} clinical questions.`,
        author: parsed.author || "Open Data Contributor",
        version: "1.0.0",
        subject: "Mixed",
        totalQuestions: questionsArray.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        questions: questionsArray.map((q: any, i: number) => sanitizePolyglotQuestion(q, i, packId)),
      };

      const existing = readPacks();
      commitPacks([...existing, pack]);
      return { success: true, pack };
    }

    return { success: false, error: "Unrecognized format. Expected JSON array or QBankPack object." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Invalid syntax." };
  }
}

/**
 * Fetch and import directly from a GitHub Raw URL or web URL
 */
export async function importFromGitHubUrl(url: string, title?: string): Promise<{ success: boolean; pack?: QBankPack; error?: string }> {
  try {
    let cleanUrl = url.trim();
    // Convert standard github.com/blob/ links to raw.githubusercontent.com
    if (cleanUrl.includes("github.com") && cleanUrl.includes("/blob/")) {
      cleanUrl = cleanUrl
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/");
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
    userPack.questions = [created, ...userPack.questions];
    userPack.totalQuestions = userPack.questions.length;
    userPack.updatedAt = Date.now();
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
