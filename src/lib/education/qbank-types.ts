export type SubjectCategory =
  | "Pathology"
  | "Pharmacology"
  | "Medicine"
  | "Surgery"
  | "OBGYN"
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
  | "PSM";

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

export type ClinicalQuestion = {
  id: string;
  subject: SubjectCategory;
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
  depthLevel?: QuestionDepthLevel;
  format?: InicetQuestionFormat;
  clinicalScore?: number; // 0 to 100
  author?: string;
  sourceExam?: string; // e.g. "INI-CET Nov 2024", "NEET PG 2024"
  packId?: string;
};

export type QBankPack = {
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
