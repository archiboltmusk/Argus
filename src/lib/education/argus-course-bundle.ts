/**
 * Argus Portable Courseware Bundle (.argus-course)
 * Enables single-file packaging and sharing of complete academic masterclasses
 * including syllabus, video mappings, Whisper transcripts, and KaTeX derivations.
 */

import type { UniversityCourse } from "./course-engine";
import type { Flashcard, DerivationStep } from "./flashcard-generator";
import type { TranscriptCue } from "./local-transcription-pipeline";

export interface CourseBundleManifest {
  format: "argus-course-bundle";
  version: "1.0.0";
  exportedAt: string;
  course: UniversityCourse;
  derivations: Record<string, DerivationStep[]>; // keyed by lectureId
  flashcards: Flashcard[];
  transcripts: Record<string, TranscriptCue[]>; // keyed by lectureId
}

export class ArgusCourseBundleManager {
  /**
   * Packages course metadata, derivations, flashcards, and transcripts into a JSON bundle.
   */
  public static exportBundle(params: {
    course: UniversityCourse;
    derivations?: Record<string, DerivationStep[]>;
    flashcards?: Flashcard[];
    transcripts?: Record<string, TranscriptCue[]>;
  }): { jsonString: string; suggestedFilename: string } {
    const { course, derivations = {}, flashcards = [], transcripts = {} } = params;

    const manifest: CourseBundleManifest = {
      format: "argus-course-bundle",
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      course,
      derivations,
      flashcards,
      transcripts,
    };

    const jsonString = JSON.stringify(manifest, null, 2);
    const safeCode = course.id.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const suggestedFilename = `${safeCode}-complete.argus-course`;

    return { jsonString, suggestedFilename };
  }

  /**
   * Parses, validates, and unpacks an incoming `.argus-course` bundle.
   */
  public static importBundle(rawContent: string): CourseBundleManifest {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error("Invalid bundle: Malformed JSON");
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid bundle: Root must be an object");
    }

    const obj = parsed as Record<string, unknown>;

    if (obj.format !== "argus-course-bundle") {
      throw new Error(`Invalid bundle format: expected 'argus-course-bundle', got '${String(obj.format)}'`);
    }

    if (!obj.course || typeof obj.course !== "object") {
      throw new Error("Invalid bundle: missing course object");
    }

    const course = obj.course as Partial<UniversityCourse>;
    if (!course.id || !course.title) {
      throw new Error("Invalid bundle: course missing id or title");
    }

    return {
      format: "argus-course-bundle",
      version: "1.0.0",
      exportedAt: typeof obj.exportedAt === "string" ? obj.exportedAt : new Date().toISOString(),
      course: course as UniversityCourse,
      derivations: (obj.derivations as Record<string, DerivationStep[]>) || {},
      flashcards: (obj.flashcards as Flashcard[]) || [],
      transcripts: (obj.transcripts as Record<string, TranscriptCue[]>) || {},
    };
  }
}
