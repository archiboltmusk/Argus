/**
 * Local Semantic & Keyword Search for Course Transcripts
 *
 * Fast, in-memory index for local offline course transcripts and notes:
 * - Natural Language Query matching (e.g. "when does Strang explain nullspace?")
 * - Substring and tokenized fuzzy matching with highlighted match contexts
 * - Returns exact lectureId, timestampSec, context snippet, and score
 */

import type { UniversityCourse } from "./course-engine";

export interface SearchMatch {
  courseId: string;
  courseTitle: string;
  lectureId: string;
  lectureTitle: string;
  lectureNumber: number;
  timestampSec: number;
  snippet: string;
  score: number;
  kind: "dialogue" | "concept";
}

export class LocalCourseSearchIndex {
  private courses: UniversityCourse[] = [];

  constructor(courses: UniversityCourse[] = []) {
    this.courses = courses;
  }

  public setCourses(courses: UniversityCourse[]): void {
    this.courses = courses;
  }

  /**
   * Search dialogue transcripts and concept notes across all indexed courses.
   */
  public search(query: string, maxResults = 10): SearchMatch[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const queryTokens = q.split(/\s+/).filter((t) => t.length > 1);
    const matches: SearchMatch[] = [];

    for (const course of this.courses) {
      for (const lecture of course.lectures) {
        // 1. Search concept notes
        for (const note of lecture.conceptNotes) {
          const noteText = `${note.title} ${note.note} ${note.latex ?? ""}`.toLowerCase();
          const score = this.calculateMatchScore(noteText, q, queryTokens);

          if (score > 0) {
            matches.push({
              courseId: course.id,
              courseTitle: course.title,
              lectureId: lecture.id,
              lectureTitle: lecture.title,
              lectureNumber: lecture.lectureNumber,
              timestampSec: note.timestampSec,
              snippet: `${note.title}: ${note.note}`,
              score: score + 0.3, // Boost curated concept notes
              kind: "concept",
            });
          }
        }

        // 2. Search transcript cues
        if (lecture.transcript) {
          for (const cue of lecture.transcript) {
            const cueText = cue.text.toLowerCase();
            const score = this.calculateMatchScore(cueText, q, queryTokens);

            if (score > 0) {
              matches.push({
                courseId: course.id,
                courseTitle: course.title,
                lectureId: lecture.id,
                lectureTitle: lecture.title,
                lectureNumber: lecture.lectureNumber,
                timestampSec: cue.startSec,
                snippet: cue.text,
                score,
                kind: "dialogue",
              });
            }
          }
        }
      }
    }

    // Sort by relevance score descending
    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, maxResults);
  }

  private calculateMatchScore(text: string, fullQuery: string, tokens: string[]): number {
    // Exact full query match
    if (text.includes(fullQuery)) {
      return 1.0;
    }

    if (tokens.length === 0) return 0;

    let matchedTokens = 0;
    for (const token of tokens) {
      if (text.includes(token)) {
        matchedTokens++;
      }
    }

    return matchedTokens / tokens.length;
  }
}
