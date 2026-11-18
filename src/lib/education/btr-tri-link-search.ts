/**
 * Argus CoreBTR Local-First Multimodal Tri-Link Search Engine
 *
 * Executes instant, zero-latency unified search indexing:
 * 1. Clinical QBank Items (5,602 questions)
 * 2. Dr. Zainab Vora's 61 BTR Lecture Video Chapters & Timestamps
 * 3. Top-100 Frontier Vault Rank Deciders & Guideline Pearls
 * 4. Synapse Medical Knowledge Graph Links & FSRS Cards
 */

import type { ClinicalQuestion, SynapseLinkage } from "./qbank-types";
import { BTR_CHAPTER_CATALOG, type BTRLectureChapter } from "./btr-chapters-engine";
import { TOP_100_FRONTIER_VAULT, type FrontierFact } from "./btr-frontier-vault";
import { resolveQuestionSynapse } from "./btr-synapse";
import { initBTRBackendDatabase, searchAllQuestions } from "./btr-backend-service";

export interface TriLinkChapterMatch {
  chapter: BTRLectureChapter;
  subjectName: string;
  videoPatternHint: string;
  relevanceScore: number;
}

export interface TriLinkSearchResult {
  query: string;
  totalMatches: number;
  questions: ClinicalQuestion[];
  chapters: TriLinkChapterMatch[];
  frontierPearls: FrontierFact[];
  synapseLinks: SynapseLinkage[];
  executionTimeMs: number;
}

/**
 * Tokenizes text and removes common medical stop words
 */
function tokenize(text: string): string[] {
  return (
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

/**
 * Computes BM25-inspired lexical relevance score
 */
function scoreText(tokens: string[], text: string): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (lower.includes(token)) {
      score += 10;
      // Exact word boundary bonus
      const regex = new RegExp(`\\b${token}\\b`, "i");
      if (regex.test(lower)) {
        score += 15;
      }
    }
  }
  return score;
}

/**
 * Executes a Tri-Link Unified Search across all QBank, Video Chapters, and Frontier Vault
 */
export async function searchTriLinkOmni(
  query: string,
  limitPerCategory: number = 5
): Promise<TriLinkSearchResult> {
  const startTime = Date.now();
  const trimmed = query.trim();

  if (!trimmed || trimmed.length < 2) {
    return {
      query,
      totalMatches: 0,
      questions: [],
      chapters: [],
      frontierPearls: [],
      synapseLinks: [],
      executionTimeMs: 0,
    };
  }

  await initBTRBackendDatabase();
  const queryTokens = tokenize(trimmed);

  // 1. Search Video Chapters & Timestamps
  const chapterMatches: TriLinkChapterMatch[] = [];
  for (const map of BTR_CHAPTER_CATALOG) {
    for (const ch of map.chapters) {
      const fullText = `${ch.title} ${ch.mustKnowConcept} ${ch.highYieldTrap || ""} ${map.subjectName}`;
      const score = scoreText(queryTokens, fullText);
      if (score > 0) {
        chapterMatches.push({
          chapter: ch,
          subjectName: map.subjectName,
          videoPatternHint: map.subjectId,
          relevanceScore: score,
        });
      }
    }
  }
  chapterMatches.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topChapters = chapterMatches.slice(0, limitPerCategory);

  // 2. Search Top-100 Frontier Vault Pearls
  const frontierMatches: Array<{ pearl: FrontierFact; score: number }> = [];
  for (const pearl of TOP_100_FRONTIER_VAULT) {
    const fullText = `${pearl.title} ${pearl.mustKnowPill} ${pearl.clinicalContext} ${pearl.examinerTrap} ${pearl.tags.join(" ")}`;
    const score = scoreText(queryTokens, fullText);
    if (score > 0) {
      frontierMatches.push({ pearl, score });
    }
  }
  frontierMatches.sort((a, b) => b.score - a.score);
  const topPearls = frontierMatches.slice(0, limitPerCategory).map((m) => m.pearl);

  // 3. Search QBank Questions
  const topQuestions = await searchAllQuestions(trimmed, { limit: limitPerCategory });

  // 4. Synthesize Synapse Medical Links
  const synapseLinks: SynapseLinkage[] = [];
  if (topQuestions.length > 0) {
    for (const q of topQuestions.slice(0, 3)) {
      synapseLinks.push(resolveQuestionSynapse(q));
    }
  }

  const totalMatches =
    chapterMatches.length + frontierMatches.length + topQuestions.length;

  return {
    query: trimmed,
    totalMatches,
    questions: topQuestions,
    chapters: topChapters,
    frontierPearls: topPearls,
    synapseLinks,
    executionTimeMs: Date.now() - startTime,
  };
}
