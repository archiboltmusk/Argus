import { useSyncExternalStore } from "react";
import type { ClinicalQuestion, QBankPack, SubjectCategory } from "./qbank-types";
import { CLINICAL_QBANK_STARTER } from "./qbank-data";

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
  if (Array.isArray(raw.options)) {
    options = raw.options.map(String);
  } else if (Array.isArray(raw.choices)) {
    options = raw.choices.map((c: any) => (typeof c === "object" ? c.text || c.choice || JSON.stringify(c) : String(c)));
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
  let correctIndex = 0;
  const rawAns = raw.correctIndex ?? raw.answer_idx ?? raw.answer ?? raw.correct_answer ?? raw.correct ?? raw.label;
  if (typeof rawAns === "number" && rawAns >= 0 && rawAns < options.length) {
    correctIndex = rawAns;
  } else if (typeof rawAns === "string") {
    const trimmed = rawAns.trim().toUpperCase();
    if (trimmed.length === 1 && trimmed >= "A" && trimmed <= "E") {
      correctIndex = trimmed.charCodeAt(0) - 65;
    } else {
      // String match against options
      const foundIdx = options.findIndex((opt) => opt.toLowerCase().includes(trimmed.toLowerCase()));
      if (foundIdx !== -1) correctIndex = foundIdx;
    }
  }

  // 4. Extract Explanation / Rationale
  let correctRationale =
    raw.explanation?.correctRationale ||
    raw.explanation?.text ||
    raw.explanation ||
    raw.rationale ||
    raw.solution ||
    raw.analysis ||
    "Diagnostic rationale confirmed by clinical presentation.";

  if (typeof correctRationale !== "string") {
    correctRationale = JSON.stringify(correctRationale);
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
    "Core high-yield principle for clinical recall.";

  // 7. Extract Subject
  const validSubjects: SubjectCategory[] = [
    "Pathology", "Pharmacology", "Medicine", "Surgery", "OBGYN", "Microbiology",
    "Radiology", "Biochemistry", "Anatomy", "Physiology", "Pediatrics",
    "Orthopedics", "Ophthalmology", "ENT", "Dermatology", "Psychiatry", "Anesthesia", "FMT", "PSM"
  ];
  const rawSubject = raw.subject || raw.category || raw.system || "Medicine";
  const matchedSubject = validSubjects.find((s) => s.toLowerCase() === String(rawSubject).toLowerCase()) || "Medicine";

  return {
    id: raw.id || `q_${packId}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    subject: matchedSubject,
    topic: raw.topic || raw.theme || "Clinical Case",
    vignette,
    imageUrl: raw.imageUrl || raw.image || raw.figure,
    options,
    correctIndex: Math.min(correctIndex, options.length - 1),
    examinerTrap,
    explanation: {
      correctRationale,
      distractorBreakdown,
      bottomLine,
    },
    highYieldTags: Array.isArray(raw.highYieldTags)
      ? raw.highYieldTags
      : Array.isArray(raw.tags)
        ? raw.tags
        : ["Open Data", matchedSubject],
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

    // Case 2: Array of raw questions or object with data array
    const questionsArray = Array.isArray(parsed) ? parsed : parsed.data || parsed.results || parsed.items || parsed.questions;

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

    const text = await res.text();
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
