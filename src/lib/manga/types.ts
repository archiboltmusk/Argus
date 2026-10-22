export type MangaSource = {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
};

export type SeriesSummary = {
  id: string;
  title: string;
  cover?: string;
  description?: string;
  author?: string;
  status?: string;
  tags?: string[];
};

export type Chapter = {
  id: string;
  number: number | null;
  title: string;
  volume?: string;
  date?: string;
  language?: string;
  group?: string;
};

export type SeriesDetail = SeriesSummary & { chapters: Chapter[] };

export type SearchPage = { results: SeriesSummary[]; hasMore: boolean };

export type LibraryEntry = {
  key: string;
  sourceId: string;
  seriesId: string;
  title: string;
  cover?: string;
  addedAt: number;
};

export type ChapterProgress = {
  chapterId: string;
  chapterLabel: string;
  page: number;
  total: number;
  updatedAt: number;
};

export type SeriesProgress = {
  last: ChapterProgress | null;
  read: string[];
};

export type ReaderMode = "paged" | "webtoon";
export type ReadingDirection = "ltr" | "rtl";
export type PageFit = "width" | "height" | "both";

export type ReaderPrefs = {
  mode: ReaderMode;
  direction: ReadingDirection;
  fit: PageFit;
  spread: boolean;
};

export const LOCAL_SOURCE_ID = "local";
