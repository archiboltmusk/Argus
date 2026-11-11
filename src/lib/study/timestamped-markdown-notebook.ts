/**
 * Bidirectional Timestamped Markdown Notebook
 *
 * Implements an interactive sidecar study notebook with bidirectional timecode sync.
 * Allows stamping notes with [MM:SS] timestamps and clicking timestamps to jump the player.
 */

export interface TimestampedNote {
  id: string;
  mediaKey: string;
  mediaTitle: string;
  content: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface ExtractedTimestampTag {
  timecode: string;
  seconds: number;
  line: number;
}

const STORAGE_PREFIX = "argus.notebook.notes.";

/**
 * Parses timecode string (e.g. "14:32" or "01:24:10") into seconds.
 */
export function parseTimecodeToSeconds(timecode: string): number {
  const parts = timecode.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  return 0;
}

/**
 * Formats seconds into standard timecode string.
 */
export function formatSecondsToTimecode(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Extracts all timestamp tags ([MM:SS] or [HH:MM:SS]) from markdown text.
 */
export function extractTimestampsFromMarkdown(markdownText: string): ExtractedTimestampTag[] {
  const results: ExtractedTimestampTag[] = [];
  const lines = markdownText.split("\n");

  const regex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      const timecode = match[1];
      const seconds = parseTimecodeToSeconds(timecode);
      results.push({
        timecode,
        seconds,
        line: lineIdx + 1,
      });
    }
  }

  return results;
}

/**
 * Appends a timestamped note entry into existing markdown content.
 */
export function appendTimestampedEntry(
  currentMarkdown: string,
  currentPlaybackSec: number,
  noteText: string,
): string {
  const tc = formatSecondsToTimecode(currentPlaybackSec);
  const entry = `- **[${tc}]** ${noteText.trim()}`;

  if (!currentMarkdown.trim()) {
    return entry;
  }
  return `${currentMarkdown.trimEnd()}\n${entry}`;
}

/**
 * Persistent note store operations.
 */
export class TimestampedNotebookStore {
  public loadNote(mediaKey: string, mediaTitle: string = "Media"): TimestampedNote {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${mediaKey}`);
      if (raw) return JSON.parse(raw);
    } catch {}

    return {
      id: `note-${mediaKey}`,
      mediaKey,
      mediaTitle,
      content: `# Study Notes: ${mediaTitle}\n\n`,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    };
  }

  public saveNote(note: TimestampedNote): void {
    note.updatedAtMs = Date.now();
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${note.mediaKey}`, JSON.stringify(note));
    } catch {}
  }

  public exportToObsidianMarkdown(note: TimestampedNote): string {
    return `---\ntitle: "${note.mediaTitle}"\ntype: video-study-notes\nmedia_key: "${note.mediaKey}"\nupdated: ${new Date(note.updatedAtMs).toISOString()}\n---\n\n${note.content}`;
  }
}

export const globalNotebookStore = new TimestampedNotebookStore();
