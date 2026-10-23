import { useEffect } from "react";
import { readLocalLibrary, useLocalLibrary, type LocalEntry } from "@/lib/local-library";
import { useSettings } from "@/lib/settings";

export type CourseShare = { token: string; folder: string; name: string };

export type SharedLessonPayload = {
  id: string;
  title: string;
  season: number;
  episode: number;
  path: string;
};

/** Each course (subject) in the folder becomes one season; lessons keep their order. */
export function sharedLessonsFor(entries: LocalEntry[], folder: string): SharedLessonPayload[] {
  const lessons = entries.filter((e) => e.source === "courses" && e.folder === folder);
  const courses = [...new Set(lessons.map((e) => e.title))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  return lessons
    .map((e) => ({
      id: e.id,
      title: courses.length > 1 ? `${e.title}: ${e.lessonTitle ?? e.filename}` : (e.lessonTitle ?? e.filename),
      season: courses.indexOf(e.title) + 1,
      episode: e.episode ?? 0,
      path: e.path,
    }))
    .sort((a, b) => a.season - b.season || a.episode - b.episode);
}

async function invokeShare<T>(command: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

/** Registers a share with the native server and returns the addon manifest URL. */
export function registerCourseShare(share: CourseShare): Promise<string> {
  return invokeShare<string>("course_share_set", {
    token: share.token,
    name: share.name,
    lessons: sharedLessonsFor(readLocalLibrary(), share.folder),
  });
}

export function unregisterCourseShare(token: string): Promise<void> {
  return invokeShare<void>("course_share_remove", { token });
}

/** Re-registers saved shares after a restart and whenever the library changes. */
export function useCourseShareSync(): void {
  const { settings } = useSettings();
  const library = useLocalLibrary();
  const shares = settings.courseShares;
  useEffect(() => {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
    for (const share of shares) void registerCourseShare(share).catch(() => {});
  }, [shares, library]);
}
