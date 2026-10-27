import { getAllQuestions } from "@/lib/education/qbank-store";
import { getStudyNotes } from "@/lib/education/notes";
import type { ClinicalQuestion } from "@/lib/education/qbank-types";
import type { StudyNote } from "@/lib/education/types";

export type DeepRecallResult = {
  id: string;
  category: "qbank" | "note" | "lecture";
  title: string;
  snippet: string;
  score: number;
  payload: ClinicalQuestion | StudyNote | any;
};

/**
 * Universal Synaptic Search across QBank questions, flashcards, and notes.
 * Instant search powered by token fuzzy matching and relevance scoring.
 */
export function deepRecallSearch(query: string, maxResults = 15): DeepRecallResult[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const tokens = clean.split(/\s+/).filter(Boolean);
  const results: DeepRecallResult[] = [];

  // 1. Search QBank Questions
  const questions = getAllQuestions();
  for (const q of questions) {
    let score = 0;
    const vignetteLower = q.vignette.toLowerCase();
    const topicLower = q.topic.toLowerCase();
    const subjectLower = q.subject.toLowerCase();

    for (const token of tokens) {
      if (topicLower.includes(token)) score += 10;
      if (subjectLower.includes(token)) score += 5;
      if (vignetteLower.includes(token)) score += 3;
    }

    if (score > 0) {
      results.push({
        id: `q_${q.id}`,
        category: "qbank",
        title: `${q.subject}: ${q.topic}`,
        snippet: q.vignette.slice(0, 140) + "…",
        score,
        payload: q,
      });
    }
  }

  // 2. Search Notes & Flashcards
  const notes = getStudyNotes();
  for (const note of notes) {
    let score = 0;
    const mdLower = note.markdown.toLowerCase();
    const titleLower = note.itemTitle.toLowerCase();

    for (const token of tokens) {
      if (titleLower.includes(token)) score += 8;
      if (mdLower.includes(token)) score += 4;
    }

    if (score > 0) {
      results.push({
        id: `note_${note.id}`,
        category: "note",
        title: `[${note.timestampLabel}] ${note.itemTitle}`,
        snippet: note.markdown.slice(0, 140) + "…",
        score,
        payload: note,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}
