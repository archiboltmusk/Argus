import type { MangaChapter } from "@/lib/manga/model";
import type { MangaPage } from "@/lib/manga/plugins/adapter";

export type ReaderMode = "long" | "long-h" | "paged" | "double" | "book";
export type ReaderFit = "width" | "height" | "original";
export type ReaderBg = "dark" | "gray" | "light";
export type ReaderColorFilter = "none" | "sepia" | "eink" | "warm-night" | "contrast" | "invert";
export type ReaderNavPos = "stack-br" | "stack-bl" | "sides" | "bottom";
export type ReaderPrefs = {
  mode: ReaderMode;
  fit: ReaderFit;
  bg: ReaderBg;
  colorFilter: ReaderColorFilter;
  autoScrollSpeed: number;
  zoom: number;
  rtl: boolean;
  autoNextChapter: boolean;
  navPos: ReaderNavPos;
  doubleGap: number;
  flipSound: boolean;
  focusMode: boolean;
  hideChapterEndHint: boolean;
  enablePageDownload: boolean;
};

export type { MangaChapter, MangaPage };
