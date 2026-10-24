import { useSyncExternalStore } from "react";
import type { ClinicalQuestion, QBankPack } from "./qbank-types";
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
 * Import pack from raw JSON string (e.g. uploaded file, pasted URL)
 */
export function importQBankPack(jsonString: string): { success: boolean; pack?: QBankPack; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);

    // Case 1: Standard QBankPack format
    if (parsed.id && parsed.title && Array.isArray(parsed.questions)) {
      const pack: QBankPack = {
        id: parsed.id || `pack_${Date.now()}`,
        title: parsed.title,
        description: parsed.description || "Imported community question pack",
        author: parsed.author || "Community Contributor",
        version: parsed.version || "1.0.0",
        subject: parsed.subject || "Mixed",
        totalQuestions: parsed.questions.length,
        createdAt: parsed.createdAt || Date.now(),
        updatedAt: Date.now(),
        questions: parsed.questions.map((q: any, i: number) => sanitizeQuestion(q, i, parsed.id)),
      };

      const existing = readPacks().filter((p) => p.id !== pack.id);
      commitPacks([...existing, pack]);
      return { success: true, pack };
    }

    // Case 2: Raw Array of questions
    if (Array.isArray(parsed)) {
      const packId = `pack_import_${Date.now()}`;
      const pack: QBankPack = {
        id: packId,
        title: `Community Pack (${new Date().toLocaleDateString()})`,
        description: `Imported pool of ${parsed.length} clinical questions.`,
        author: "Community Doctor",
        version: "1.0.0",
        subject: "Mixed",
        totalQuestions: parsed.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        questions: parsed.map((q: any, i: number) => sanitizeQuestion(q, i, packId)),
      };

      const existing = readPacks();
      commitPacks([...existing, pack]);
      return { success: true, pack };
    }

    return { success: false, error: "Unrecognized format: Expected a QBankPack JSON or array of questions." };
  } catch (err: any) {
    return { success: false, error: err?.message || "Invalid JSON syntax." };
  }
}

function sanitizeQuestion(raw: any, index: number, packId: string): ClinicalQuestion {
  return {
    id: raw.id || `q_${packId}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    subject: raw.subject || "Medicine",
    topic: raw.topic || "General Clinical Topic",
    vignette: raw.vignette || raw.question || "Clinical vignette text missing.",
    imageUrl: raw.imageUrl || raw.image,
    options: Array.isArray(raw.options) && raw.options.length >= 2 ? raw.options : ["Option A", "Option B", "Option C", "Option D"],
    correctIndex: typeof raw.correctIndex === "number" ? raw.correctIndex : (typeof raw.answer === "number" ? raw.answer : 0),
    examinerTrap: raw.examinerTrap || raw.trap || "Beware of distractor choices with extreme keywords.",
    explanation: {
      correctRationale: raw.explanation?.correctRationale || raw.explanation?.text || raw.rationale || "Correct answer explanation.",
      distractorBreakdown: Array.isArray(raw.explanation?.distractorBreakdown)
        ? raw.explanation.distractorBreakdown
        : [],
      bottomLine: raw.explanation?.bottomLine || raw.bottomLine || "Key takeaway principle.",
    },
    highYieldTags: Array.isArray(raw.highYieldTags) ? raw.highYieldTags : (Array.isArray(raw.tags) ? raw.tags : ["High-Yield"]),
    sourceExam: raw.sourceExam,
    packId,
  };
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

/**
 * Export a pack as clean JSON for sharing or submitting via GitHub PR
 */
export function exportPackAsJson(packId: string): string {
  const packs = readPacks();
  const pack = packs.find((p) => p.id === packId);
  if (!pack) return "{}";
  return JSON.stringify(pack, null, 2);
}

/**
 * Delete a custom pack (starter pack cannot be deleted)
 */
export function deletePack(packId: string): void {
  if (packId === "argus-starter-pack") return;
  const packs = readPacks();
  commitPacks(packs.filter((p) => p.id !== packId));
}
