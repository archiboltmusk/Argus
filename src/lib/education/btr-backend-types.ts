import type { ClinicalQuestion } from "./qbank-types";

export interface BTRStoredTestMeta {
  id: string;
  title: string;
  type: "Grand Tests" | "Mini Tests" | "Core Drop Tests";
  numQuestions: number;
  durationMinutes: number;
  totalMarks: number;
  questionIds: string[];
  bestScore?: number;
  lastAttemptedAt?: string;
  isCompleted?: boolean;
}

export interface BTRUserQuestionState {
  questionId: string;
  attempts: number;
  incorrects: number;
  lastAnsweredOption?: string;
  lastAnsweredAt?: number;
  isBookmarked: boolean;
  notes?: string;
  // FSRS spaced-repetition metrics
  fsrs?: {
    stability: number; // in days
    difficulty: number; // 1 to 10
    reps: number;
    due: number; // timestamp
    state: "new" | "learning" | "review";
  };
}

export interface BTRBackendDatabasePayload {
  version: string;
  generatedAt: string;
  totalQuestions: number;
  tests: BTRStoredTestMeta[];
  questions: ClinicalQuestion[];
}

export interface BTRGTAnalyticsSummary {
  totalTestsTaken: number;
  averageScore: number;
  averagePercentile: number;
  topPerformingSubjects: { subject: string; accuracyPercent: number }[];
  weakestSubjects: { subject: string; accuracyPercent: number }[];
  recentScores: Array<{
    date: string;
    testTitle: string;
    marks: number;
    maxMarks: number;
    percentile: number;
    accuracyPercent: number;
  }>;
}

export interface CustomModuleConfig {
  title?: string;
  subjects: string[]; // empty array = all subjects
  status: "all" | "unattempted" | "incorrect" | "bookmarked";
  count: number;
  mode: "exam" | "study";
  depthLevel?: string;
}

export interface RemediationRecommendation {
  subject: string;
  topic: string;
  errorCount: number;
  suggestedAction: string;
  relevantVideoLecture?: string;
  relevantWorkbookPdf?: string;
  remediationQuestions: ClinicalQuestion[];
}

export interface GTAutopsyReport {
  id: string;
  testTitle: string;
  timestamp: number;
  totalQuestions: number;
  score: number;
  accuracyPct: number;
  sillyMistakesCount: number;
  knowledgeGapsCount: number;
  guessworkCount: number;
  recommendations: RemediationRecommendation[];
}
