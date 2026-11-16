/**
 * Local Course Scanner & Folder Auto-Mapper
 *
 * Automatically parses local directory structures of course videos (e.g. ~/Lectures/MIT-18.06/):
 * - Detects lecture numbering (e.g. "01 - Intro.mp4", "L02_Column_Space.mkv", "Lecture 14 SVD.webm")
 * - Cleans up titles (removes codec suffixes, bitrate tags, leading numbers)
 * - Auto-associates sidecar subtitle files (.srt, .vtt) in the same directory
 * - Generates file:// URLs ready for instant zero-latency libmpv playback
 */

import type { CourseLecture, UniversityCourse, TranscriptCue } from "./course-engine";
import { parseSubtitleText } from "./local-whisper-ingest";

export interface LocalFileEntry {
  name: string;
  path: string;
  sizeBytes?: number;
  content?: string; // Optional subtitle content for in-memory / browser file uploads
}

const VIDEO_EXTENSIONS = new Set(["mp4", "mkv", "webm", "avi", "mov", "m4v", "flv"]);
const SUBTITLE_EXTENSIONS = new Set(["srt", "vtt", "sub"]);

export function isVideoFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTENSIONS.has(ext);
}

export function isSubtitleFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return SUBTITLE_EXTENSIONS.has(ext);
}

export function extractBaseName(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

export function cleanLectureTitle(rawName: string): { lectureNumber: number; title: string } {
  const base = extractBaseName(rawName);

  // Match patterns like: "01 - Introduction", "Lecture 02 SVD", "L3_Graph_Neural_Nets", "lec_04", "1. Matrix Multiplication"
  const match = base.match(/^(?:lecture|lec|l)?[\s_-]*(\d+)[.\s_-]*(.*)$/i);

  if (match) {
    const lectureNum = parseInt(match[1], 10);
    let title = match[2]
      .replace(/[._-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Remove video quality tags like 1080p, 720p, x264, WEBRip
    title = title.replace(/\b(1080p|720p|4k|2160p|h264|x264|hevc|x265|webrip|web-dl)\b/gi, "").trim();

    return {
      lectureNumber: lectureNum,
      title: title || `Lecture ${lectureNum}`,
    };
  }

  // Fallback if no explicit number at start
  const cleaned = base
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    lectureNumber: 1,
    title: cleaned || "Lecture 1",
  };
}

export function scanLocalCourseFolder(
  courseName: string,
  files: LocalFileEntry[],
  options?: {
    institution?: string;
    instructor?: string;
    category?: "ai-ml" | "math-physics" | "systems-compilers" | "foundations";
    badgeAccent?: string;
  }
): UniversityCourse {
  const videoFiles = files.filter((f) => isVideoFile(f.name));
  const subtitleFiles = files.filter((f) => isSubtitleFile(f.name));

  // Build subtitle lookup map keyed by normalized base filename
  const subtitleMap = new Map<string, LocalFileEntry>();
  for (const sub of subtitleFiles) {
    const base = extractBaseName(sub.name).toLowerCase();
    subtitleMap.set(base, sub);
  }

  const lectures: CourseLecture[] = videoFiles.map((vf) => {
    const { lectureNumber, title } = cleanLectureTitle(vf.name);
    const base = extractBaseName(vf.name).toLowerCase();

    // Check for matching subtitle file
    const matchingSub = subtitleMap.get(base);
    let transcript: TranscriptCue[] | undefined = undefined;

    if (matchingSub?.content) {
      transcript = parseSubtitleText(matchingSub.content);
    }

    // Format local file URI for native player engine
    const videoUrl = vf.path.startsWith("file://") ? vf.path : `file://${vf.path}`;

    return {
      id: `local-lec-${lectureNumber}-${base.slice(0, 16)}`,
      lectureNumber,
      title: `Lecture ${lectureNumber}: ${title}`,
      durationSec: 3600, // Default duration placeholder; updated on playback load
      videoUrl,
      completed: false,
      lastPositionSec: 0,
      conceptNotes: [],
      transcript,
    };
  });

  // Sort lectures sequentially by lecture number
  lectures.sort((a, b) => a.lectureNumber - b.lectureNumber);

  const courseId = `local-${courseName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return {
    id: courseId,
    title: courseName,
    institution: options?.institution || "Local Offline Library",
    instructor: options?.instructor || "Offline Archive",
    playlistUrl: `file://${files[0]?.path ? files[0].path.slice(0, files[0].path.lastIndexOf("/")) : ""}`,
    academicTerm: "Local On-Disk",
    category: options?.category || "ai-ml",
    description: `Locally indexed course containing ${lectures.length} high-bitrate video lectures with zero-latency seeking.`,
    lectures,
    activeLectureIndex: 0,
    badgeAccent: options?.badgeAccent || "#10b981", // Emerald for local verified
  };
}
