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
};
