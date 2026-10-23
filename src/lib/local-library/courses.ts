// Self-contained (no runtime imports) so `node --test` can load it.
// Courses mode: files in a folder are sequential lessons, never matched to TMDB.

const PREFIX_RX = /^\s*(?:(?:lesson|lecture|part|module|ep(?:isode)?|chapter|ch|l)[\s._-]*)?(\d{1,4})(?!\d)\s*[-–—_.):]*\s*/i;

export type CourseFileInput = { path: string; filename: string };

export type CourseLesson = {
  /** Course name: the folder that directly contains the file. */
  course: string;
  /** 1-based position within the course. */
  lesson: number;
  lessonTitle: string;
};

function stemOf(filename: string): string {
  return filename.replace(/\.[^./\\]+$/, "");
}

export function courseNameOf(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : "Courses";
}

export function lessonPrefix(filename: string): number | null {
  const match = stemOf(filename).match(PREFIX_RX);
  return match ? parseInt(match[1], 10) : null;
}

export function lessonTitleOf(filename: string): string {
  const stem = stemOf(filename);
  const stripped = stem.replace(PREFIX_RX, "").replace(/[._]+/g, " ").replace(/\s+/g, " ").trim();
  return stripped || stem;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/**
 * Orders each folder's files by numeric prefix (natural order as the fallback)
 * and numbers them 1..n. A folder keeps its own prefixes only when every file
 * has a distinct one; otherwise positions are used so no two lessons collide.
 */
export function assignLessons(files: CourseFileInput[]): Map<string, CourseLesson> {
  const byCourse = new Map<string, CourseFileInput[]>();
  for (const file of files) {
    const dir = file.path.slice(0, Math.max(file.path.lastIndexOf("/"), file.path.lastIndexOf("\\")));
    const list = byCourse.get(dir);
    if (list) list.push(file);
    else byCourse.set(dir, [file]);
  }
  const out = new Map<string, CourseLesson>();
  for (const list of byCourse.values()) {
    const sorted = [...list].sort((a, b) => {
      const pa = lessonPrefix(a.filename);
      const pb = lessonPrefix(b.filename);
      if (pa != null && pb != null && pa !== pb) return pa - pb;
      return collator.compare(a.filename, b.filename);
    });
    const prefixes = sorted.map((f) => lessonPrefix(f.filename));
    const usePrefix =
      prefixes.every((p) => p != null && p > 0) && new Set(prefixes).size === prefixes.length;
    sorted.forEach((file, index) => {
      out.set(file.path, {
        course: courseNameOf(file.path),
        lesson: usePrefix ? (prefixes[index] as number) : index + 1,
        lessonTitle: lessonTitleOf(file.filename),
      });
    });
  }
  return out;
}
