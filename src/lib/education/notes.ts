import { useSyncExternalStore } from "react";
import type { StudyNote, FSRSRating } from "./types";
import { createInitialCard, scheduleReview, isCardDue } from "./fsrs";

const KEY = "argus.study.notes.v1";

let notesCache: StudyNote[] | null = null;
const listeners = new Set<() => void>();

function readNotes(): StudyNote[] {
  if (notesCache) return notesCache;
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(KEY);
      notesCache = raw ? (JSON.parse(raw) as StudyNote[]) : [];
    } else {
      notesCache = [];
    }
  } catch {
    notesCache = [];
  }
  return notesCache;
}

function commit(notes: StudyNote[]): void {
  notesCache = notes;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(KEY, JSON.stringify(notes));
    }
  } catch (e) {
    console.warn("[education] failed to save study notes", e);
  }
  for (const listener of listeners) listener();
}

export function subscribeNotes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStudyNotes(itemId?: string): StudyNote[] {
  const all = readNotes();
  if (!itemId) return all;
  return all.filter((note) => note.itemId === itemId);
}

export function useStudyNotes(itemId?: string): StudyNote[] {
  return useSyncExternalStore(
    subscribeNotes,
    () => getStudyNotes(itemId),
    () => getStudyNotes(itemId),
  );
}

export function saveStudyNote(note: Omit<StudyNote, "id" | "createdAt">): StudyNote {
  const existing = readNotes();
  const created: StudyNote = {
    ...note,
    id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    fsrs: note.fsrs ?? createInitialCard(),
  };
  commit([created, ...existing]);
  return created;
}

export function updateStudyNote(id: string, updates: Partial<StudyNote>): void {
  const existing = readNotes();
  commit(
    existing.map((n) => {
      if (n.id !== id) return n;
      return { ...n, ...updates };
    }),
  );
}

export function reviewStudyNote(id: string, rating: FSRSRating): void {
  const existing = readNotes();
  commit(
    existing.map((n) => {
      if (n.id !== id) return n;
      const currentFSRS = n.fsrs ?? createInitialCard(n.createdAt);
      return {
        ...n,
        fsrs: scheduleReview(currentFSRS, rating),
      };
    }),
  );
}

export function deleteStudyNote(id: string): void {
  const existing = readNotes();
  commit(existing.filter((note) => note.id !== id));
}

export function getDueStudyNotes(now = Date.now()): StudyNote[] {
  const all = readNotes();
  return all.filter((n) => isCardDue(n.fsrs, now));
}

export function exportNotesAsMarkdown(input?: string | StudyNote[]): string {
  const notes = Array.isArray(input) ? input : getStudyNotes(input);
  if (!notes.length) return "# Study Notes\n\nNo notes recorded yet.";

  const title = !Array.isArray(input) && input && notes[0] ? notes[0].itemTitle : "Argus Lecture Study Notes";
  const lines: string[] = [
    `# ${title}`,
    `*Exported from Argus on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*`,
    "",
    "---",
    "",
  ];

  for (const note of notes) {
    lines.push(`### [${note.timestampLabel}] ${note.itemTitle}`);
    if (note.snapshotDataUrl) {
      lines.push(`![](${note.snapshotDataUrl})`);
      lines.push("");
    }
    if (note.occlusions && note.occlusions.length > 0) {
      lines.push(`> 🧠 **Image Occlusion Card**: Contains ${note.occlusions.length} masked active-recall regions.`);
      lines.push("");
    }
    lines.push(note.markdown);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}
