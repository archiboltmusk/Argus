import type { Chapter } from "./bridge";

export function alignChapterPosition(
  before: Chapter[],
  after: Chapter[],
  position: number,
): number | null {
  const key = (chapter: Chapter) => chapter.title.trim().toLowerCase().replace(/\s+/g, " ");
  const index = before.findIndex((chapter) => chapter.startSec > position);
  if (index < 1) return null;
  const left = before[index - 1];
  const right = before[index];
  const match = (chapter: Chapter) => {
    const title = key(chapter);
    if (!title || /^(chapter\s*)?\d+$/i.test(title)) return;
    const matches = after.filter((candidate) => key(candidate) === title);
    if (matches.length === 1 && before.filter((item) => key(item) === title).length === 1) {
      return matches[0];
    }
  };
  const targetLeft = match(left);
  const targetRight = match(right);
  if (!targetLeft || !targetRight) return null;
  const offset = targetLeft.startSec - left.startSec;
  // Similar chapter lengths provide two independent anchors for a timeline shift.
  if (Math.abs(targetRight.startSec - right.startSec - offset) > 2) return null;
  const target = position + offset;
  return Number.isFinite(target) && target >= targetLeft.startSec && target < targetRight.startSec
    ? target
    : null;
}
