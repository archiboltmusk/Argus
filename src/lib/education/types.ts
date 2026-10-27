export type FSRSRating = "again" | "hard" | "good" | "easy";

export type FSRSState = "new" | "learning" | "review" | "relearning";

export type FSRSCardData = {
  due: number; // Unix timestamp in ms
  stability: number; // in days
  difficulty: number; // 1 to 10
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: FSRSState;
  lastReview?: number; // Unix timestamp in ms
};

export type OcclusionBox = {
  id: string;
  xPct: number; // 0 to 100 percentage from left
  yPct: number; // 0 to 100 percentage from top
  wPct: number; // 0 to 100 percentage width
  hPct: number; // 0 to 100 percentage height
  label?: string; // Optional answer / label
};

export type CourseCategory =
  | "all"
  | "medical"
  | "engineering"
  | "science"
  | "humanities";

export type CuratedCourse = {
  id: string;
  title: string;
  provider: string; // e.g. "NPTEL", "MIT OCW", "Khan Academy", "Open Medical"
  category: CourseCategory;
  description: string;
  feedUrl: string;
  thumbnail: string;
  tags: string[];
  totalLessons?: number;
};

export type StudyNote = {
  id: string;
  itemId: string;
  itemTitle: string;
  timestampSec: number;
  timestampLabel: string;
  markdown: string;
  snapshotDataUrl?: string;
  createdAt: number;
  occlusions?: OcclusionBox[];
  fsrs?: FSRSCardData;
  highYield?: boolean;
  topic?: string;
};
