export type ClinicalQuestion = {
  id: string;
  subject: "Pathology" | "Pharmacology" | "Medicine" | "Surgery" | "OBGYN" | "Microbiology" | "Radiology" | "Biochemistry";
  topic: string;
  vignette: string;
  imageUrl?: string;
  options: string[];
  correctIndex: number;
  examinerTrap: string;
  explanation: {
    correctRationale: string;
    distractorBreakdown: { option: string; reason: string }[];
    bottomLine: string;
  };
  highYieldTags: string[];
};

export type QBankSessionState = {
  activeQuestionIndex: number;
  selectedAnswers: Record<string, number>; // questionId -> selectedIndex
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
