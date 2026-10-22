import type { Chapter, ReadingDirection, SeriesProgress } from "./types";

/**
 * Groups page indexes into what is shown at once. With spreads on, the cover
 * stays alone and wide pages (already a spread) are never paired.
 */
export function buildSpreads(total: number, wide: ReadonlySet<number>, spread: boolean): number[][] {
  const out: number[][] = [];
  if (!spread) {
    for (let i = 0; i < total; i += 1) out.push([i]);
    return out;
  }
  let i = 0;
  while (i < total) {
    if (i === 0 || wide.has(i) || i === total - 1 || wide.has(i + 1)) {
      out.push([i]);
      i += 1;
    } else {
      out.push([i, i + 1]);
      i += 2;
    }
  }
  return out;
}

export function spreadIndexOf(spreads: number[][], page: number): number {
  const idx = spreads.findIndex((s) => s.includes(page));
  return idx < 0 ? 0 : idx;
}

/** Pages shown left to right for a spread. */
export function displayOrder(spread: number[], direction: ReadingDirection): number[] {
  return direction === "rtl" ? [...spread].reverse() : spread;
}

export type ClickZone = "back" | "forward" | "menu";

/** Left/right thirds turn the page (mirrored for RTL); the middle toggles the menu. */
export function clickZone(x: number, width: number, direction: ReadingDirection): ClickZone {
  if (width <= 0) return "menu";
  const r = x / width;
  if (r > 1 / 3 && r < 2 / 3) return "menu";
  const left = r <= 1 / 3;
  const forward = direction === "rtl" ? left : !left;
  return forward ? "forward" : "back";
}

export function chapterIndex(chapters: Chapter[], id: string): number {
  return chapters.findIndex((c) => c.id === id);
}

/** Chapter to open from "Continue": resume the last one, or the next if it was finished. */
export function resumeTarget(
  chapters: Chapter[],
  progress: SeriesProgress | undefined,
): { chapter: Chapter; page: number } | null {
  if (chapters.length === 0) return null;
  const last = progress?.last;
  if (!last) return { chapter: chapters[0], page: 0 };
  const idx = chapterIndex(chapters, last.chapterId);
  if (idx < 0) return { chapter: chapters[0], page: 0 };
  const finished = last.total > 0 && last.page >= last.total - 1;
  if (!finished) return { chapter: chapters[idx], page: last.page };
  const next = chapters[idx + 1];
  return next ? { chapter: next, page: 0 } : { chapter: chapters[idx], page: last.page };
}

export function unreadCount(chapters: Chapter[], progress: SeriesProgress | undefined): number {
  const read = new Set(progress?.read ?? []);
  return chapters.reduce((n, c) => (read.has(c.id) ? n : n + 1), 0);
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;

export function isImageName(name: string): boolean {
  const base = name.split("/").pop() ?? name;
  return IMAGE_EXT.test(name) && !base.startsWith(".") && !name.startsWith("__MACOSX/");
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
export const naturalCompare = (a: string, b: string): number => collator.compare(a, b);
