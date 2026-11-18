import type { AnswerSpec, QuestionAnswer, ImportReport } from "./question-integrity";

export type SubjectCategory =
  | "Pathology"
  | "Pharmacology"
  | "Medicine"
  | "Surgery"
  | "OBGYN"
  | "Obstetrics & Gynaecology"
  | "Microbiology"
  | "Radiology"
  | "Biochemistry"
  | "Anatomy"
  | "Physiology"
  | "Pediatrics"
  | "Orthopedics"
  | "Ophthalmology"
  | "ENT"
  | "Dermatology"
  | "Psychiatry"
  | "Anesthesia"
  | "FMT"
  | "PSM"
  | "Preventive & Social Medicine"
  | "Cardiovascular"
  | "Central Nervous"
  | "Respiratory System"
  | "GI & Hepatobiliary System"
  | "Renal & Electrolytes"
  | "Endocrine"
  | "Hematology"
  | "Immunology"
  | (string & {});

export type QuestionDepthLevel =
  | "L1_Recall" // Single-liner / straightforward fact memory
  | "L2_ImageSpotter" // High-resolution clinical / histology / radiology spotter
  | "L3_MultiStepClinical" // Real 2-step clinical presentation vignette
  | "L4_InicetTrap"; // High-cognitive INICET trap / Assertion-Reason / Near-peer distractor

export type InicetQuestionFormat =
  | "SingleBestAnswer"
  | "MultipleTrueFalse"
  | "AssertionReasoning"
  | "MatchingMatrix"
  | "ImageSpotter";

export interface DistractorAutopsyItem {
  option: string;
  reason: string;
  inversionScenario?: string; // "This would be correct if the vignette had presented with..."
}

export interface TextbookCitation {
  textbook: string; // e.g. "Harrison's 21st Ed.", "Robbins 10th Ed."
  chapter: string;
  page?: string;
  edition?: string;
}

export interface ClinicalExplanation5Tier {
  correctRationale: string;
  distractorBreakdown: DistractorAutopsyItem[];
  bottomLine: string;
  whyCorrect?: {
    mechanism: string;
    clinicalRule: string;
  };
  comparisonTable?: {
    title?: string;
    headers: string[];
    rows: string[][];
  };
  citations?: TextbookCitation[];
}

export interface InteractiveImagingMeta {
  normalReferenceUrl?: string; // Side-by-side normal anatomy reference
  normalCaption?: string;
  abnormalCaption?: string;
  annotations?: Array<{
    id: string;
    label: string;
    x: number; // percentage 0-100 across image width
    y: number; // percentage 0-100 across image height
    description?: string;
  }>;
}

export interface SynapseLinkage {
  btrVideo?: {
    title: string;
    youtubeId?: string;
    fileKey?: string;
    timestampSeconds: number;
    label: string;
  };
  docTableId?: string;
  fsrsCardId?: string;
  relatedTopicIds?: string[];
}

export type ClinicalQuestion = {
  id: string;
  subject: SubjectCategory;
  topic: string;
  vignette: string;
  imageUrl?: string;
  options: string[];
  correctIndex: number;
  assertionReason?: { assertion: string; reason: string };
  answerSpec?: AnswerSpec;
  provenance?: {
    kind: "original" | "recalled" | "generated" | "unknown";
    source?: string;
    edition?: string;
    publishedAt?: string;
    reviewer?: string;
    reviewedAt?: string;
    status: "unverified" | "reviewed";
    corrections?: {
      date: string;
      reason: string;
      reviewer: string;
      previous?: {
        correctIndex: number;
        answerSpec?: AnswerSpec;
        rationale: string;
        source?: string;
      };
    }[];
  };
  learningLink?: { url: string; timestampSec?: number; relatedQuestionId?: string };
  examinerTrap: string;
  explanation: ClinicalExplanation5Tier;
  highYieldTags: string[];
  depthLevel?: QuestionDepthLevel;
  format?: InicetQuestionFormat;
  clinicalScore?: number; // 0 to 100
  author?: string;
  sourceExam?: string; // e.g. "INI-CET Nov 2024", "NEET PG 2024"
  packId?: string;
  imagingMeta?: InteractiveImagingMeta;
  synapseLinks?: SynapseLinkage;
};

export type QBankPack = {
  importReport?: ImportReport;
  id: string;
  title: string;
  description: string;
  author: string;
  version: string;
  subject?: SubjectCategory | "Mixed";
  totalQuestions: number;
  createdAt: number;
  updatedAt: number;
  questions: ClinicalQuestion[];
};

export type QBankSessionState = {
  analytics?: {
    telemetry: import("./btr-rank-optimizer").AIR100ExamTelemetry;
    irtReport: import("./btr-irt-rank-simulator").IRTExamSimulationReport;
    biasReport: ReturnType<typeof import("./btr-cognitive-decoder").aggregateSessionBiases>;
  };
  deadlineAt?: number;
  activeSince?: number;
  startedAt?: number;
  finishedAt?: number;
  result?: GrandTestResult;
  guessedQuestions?: Record<string, boolean>;
  markedForReview?: string[];
  confidence?: Record<string, "unsure" | "confident">;
  mistakes?: Record<string, "knowledge" | "misread" | "reasoning" | "guessing" | "time">;
  activeQuestionIndex: number;
  selectedAnswers: Record<string, QuestionAnswer>; // questionId -> response
  eliminatedOptions: Record<string, number[]>; // questionId -> [indices of struck-out options]
  isSubmitted: Record<string, boolean>; // questionId -> boolean
  bookmarks: string[]; // questionIds
  timeSpentSec: Record<string, number>;
};

export type GrandTestResult = {
  id: string;
  examTitle: string;
  timestamp: number;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  score: number; // +4 for correct, -1 for incorrect
  maxScore: number;
  accuracyPct: number;
  timeSpentMinutes: number;
};
