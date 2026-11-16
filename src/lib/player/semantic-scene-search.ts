/**
 * Conceptual & Semantic Scene Search Engine
 * Provides instant natural language concept search across video subtitles, transcripts, and chapters.
 * Allows searching by semantic concepts (e.g. "car chase", "breakup", "scientific explanation", "villain speech")
 * as well as exact keyword matching with contextual snippets and seekbar integration.
 */

export interface SemanticSearchCue {
  startSec: number;
  endSec: number;
  text: string;
}

export interface SemanticSearchResult {
  id: string;
  timestampSec: number;
  endSec: number;
  score: number; // 0 - 100 confidence
  matchedPhrase: string;
  surroundingDialogue: string;
  chapterTitle?: string;
  badge?: "concept" | "exact" | "high-confidence";
}

// Concept clusters for semantic expansion
const CONCEPT_EXPANSIONS: Record<string, string[]> = {
  action: ["fight", "punch", "kill", "attack", "battle", "weapon", "gun", "shoot", "blood", "explosion", "run", "fast", "destroy"],
  chase: ["car", "drive", "speed", "faster", "catch", "police", "siren", "pursuit", "wheel", "crash", "highway"],
  science: ["experiment", "hypothesis", "cell", "dna", "quantum", "molecule", "formula", "research", "lab", "data", "test", "theory", "gravity"],
  medical: ["patient", "doctor", "surgery", "blood", "heart", "disease", "hospital", "medicine", "diagnosis", "symptom", "cure", "pulse"],
  romance: ["love", "kiss", "marry", "heart", "date", "together", "forever", "darling", "sweetheart", "breakup", "miss you"],
  mystery: ["clue", "detective", "murder", "suspect", "killer", "investigation", "secret", "hidden", "truth", "crime", "alibi"],
  confrontation: ["liar", "betray", "enemy", "threat", "warning", "kill", "regret", "apologize", "forgive", "revenge"],
  funny: ["laugh", "joke", "ridiculous", "crazy", "hilarious", "stupid", "fun", "fool"],
  farewell: ["goodbye", "farewell", "leaving", "never see", "last time", "departure", "miss you"],
};

export class SemanticSceneSearchIndex {
  private cues: SemanticSearchCue[] = [];
  private chapters: Array<{ startSec: number; title: string }> = [];

  constructor(
    cues: SemanticSearchCue[] = [],
    chapters: Array<{ startSec: number; title: string }> = []
  ) {
    this.updateData(cues, chapters);
  }

  public updateData(
    cues: SemanticSearchCue[],
    chapters: Array<{ startSec: number; title: string }> = []
  ) {
    this.cues = [...cues]
      .filter((c) => Number.isFinite(c.startSec) && c.text?.trim().length > 0)
      .sort((a, b) => a.startSec - b.startSec);
    this.chapters = [...chapters].sort((a, b) => a.startSec - b.startSec);
  }

  public get totalCues(): number {
    return this.cues.length;
  }

  /**
   * Searches the transcript for concepts or exact keywords, returning scored and ranked scene moments.
   */
  public search(query: string, maxResults: number = 20): SemanticSearchResult[] {
    const rawQuery = query.trim().toLowerCase();
    if (!rawQuery || this.cues.length === 0) return [];

    const queryTokens = rawQuery
      .split(/\s+/)
      .map((w) => w.replace(/[^\w]/g, ""))
      .filter((w) => w.length > 1);

    if (queryTokens.length === 0) return [];

    // Expand query with semantic concept synonyms
    const expandedTokens = new Set<string>(queryTokens);
    for (const token of queryTokens) {
      for (const [concept, keywords] of Object.entries(CONCEPT_EXPANSIONS)) {
        if (concept.includes(token) || token.includes(concept)) {
          keywords.forEach((k) => expandedTokens.add(k));
        } else if (keywords.some((k) => k === token || (k.length >= 4 && token.includes(k)))) {
          expandedTokens.add(concept);
          keywords.slice(0, 5).forEach((k) => expandedTokens.add(k));
        }
      }
    }

    const results: SemanticSearchResult[] = [];

    // Group close consecutive cues into ~45 second scene windows for coherent context
    for (let i = 0; i < this.cues.length; i++) {
      const cue = this.cues[i];
      const cueText = cue.text.toLowerCase();

      // Check exact query phrase match
      const exactMatch = cueText.includes(rawQuery);

      // Check token and concept overlaps
      let tokenHits = 0;
      let conceptHits = 0;
      const matchedWords: string[] = [];

      for (const token of queryTokens) {
        if (cueText.includes(token)) {
          tokenHits++;
          matchedWords.push(token);
        }
      }

      for (const token of expandedTokens) {
        if (!queryTokens.includes(token) && cueText.includes(token)) {
          conceptHits++;
          matchedWords.push(token);
        }
      }

      if (exactMatch || tokenHits > 0 || conceptHits >= 2) {
        // Calculate score
        let score = 0;
        if (exactMatch) {
          score = 95;
        } else {
          const directMatchFraction = tokenHits / queryTokens.length;
          score = Math.min(92, Math.round(directMatchFraction * 70 + Math.min(25, conceptHits * 8)));
        }

        // Fetch surrounding context (-1 and +1 cues)
        const prevText = this.cues[i - 1]?.text || "";
        const nextText = this.cues[i + 1]?.text || "";
        const surroundingDialogue = [prevText, cue.text, nextText]
          .filter(Boolean)
          .join(" ")
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();

        // Find active chapter title at this time
        let chapterTitle: string | undefined;
        for (const chap of this.chapters) {
          if (chap.startSec <= cue.startSec) {
            chapterTitle = chap.title;
          } else {
            break;
          }
        }

        results.push({
          id: `search-${cue.startSec.toFixed(1)}`,
          timestampSec: Math.max(0, Math.round(cue.startSec)),
          endSec: Math.round(cue.endSec),
          score,
          matchedPhrase: matchedWords.join(", ") || rawQuery,
          surroundingDialogue:
            surroundingDialogue.length > 180
              ? surroundingDialogue.slice(0, 177) + "..."
              : surroundingDialogue,
          chapterTitle,
          badge: exactMatch ? "exact" : score >= 80 ? "high-confidence" : "concept",
        });
      }
    }

    // Sort by score descending, then timestamp ascending
    results.sort((a, b) => b.score - a.score || a.timestampSec - b.timestampSec);

    // Deduplicate results within 15 seconds of each other, keeping the highest score
    const deduped: SemanticSearchResult[] = [];
    for (const res of results) {
      const existing = deduped.find((d) => Math.abs(d.timestampSec - res.timestampSec) < 15);
      if (!existing) {
        deduped.push(res);
        if (deduped.length >= maxResults) break;
      }
    }

    return deduped;
  }
}

/**
 * Parses WebVTT or SRT formatted subtitle text into structured search cues.
 */
export function parseSubtitleTextToCues(raw: string): SemanticSearchCue[] {
  if (!raw || typeof raw !== "string") return [];
  const cues: SemanticSearchCue[] = [];
  const lines = raw.replace(/\r\n/g, "\n").split("\n");

  let currentStart = -1;
  let currentEnd = -1;
  const currentTextLines: string[] = [];

  const timeRegex = /(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})/;

  function parseTime(h: string | undefined, m: string, s: string, ms: string): number {
    const hours = h ? parseInt(h, 10) : 0;
    const minutes = parseInt(m, 10);
    const seconds = parseInt(s, 10);
    const millis = parseInt(ms, 10);
    return hours * 3600 + minutes * 60 + seconds + millis / 1000;
  }

  function flushCue() {
    if (currentStart >= 0 && currentEnd > currentStart && currentTextLines.length > 0) {
      const text = currentTextLines
        .join(" ")
        .replace(/<[^>]+>/g, "")
        .replace(/\{[^}]+\}/g, "")
        .trim();
      if (text.length > 0) {
        cues.push({ startSec: currentStart, endSec: currentEnd, text });
      }
    }
    currentStart = -1;
    currentEnd = -1;
    currentTextLines.length = 0;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(timeRegex);

    if (match) {
      flushCue();
      currentStart = parseTime(match[1], match[2], match[3], match[4]);
      currentEnd = parseTime(match[5], match[6], match[7], match[8]);
    } else if (trimmed === "" || /^\d+$/.test(trimmed)) {
      if (trimmed === "") {
        flushCue();
      }
    } else if (currentStart >= 0) {
      currentTextLines.push(trimmed);
    }
  }

  flushCue();
  return cues;
}
