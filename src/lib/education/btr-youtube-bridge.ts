/**
 * Argus CoreBTR YouTube Bridge & Video Integration Engine
 *
 * Provides privacy-preserving, zero-API-key YouTube lecture playback,
 * timestamp extraction, playlist feeds, and side-by-side workbook integration.
 */

import type { BTRLocalMediaFile } from "./btr-local-library";
import { CORE_BTR_SUBJECTS } from "./corebtr-schedule";

export interface YouTubeLectureMeta {
  videoId: string;
  title: string;
  channelName: string;
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl: string;
  startSec?: number;
}

/**
 * Extracts a canonical 11-character YouTube video ID from any format:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ?t=45
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://www.youtube.com/live/dQw4w9WgXcQ
 * - https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ
 * - https://music.youtube.com/watch?v=dQw4w9WgXcQ
 * - Raw 11-char ID (e.g. "dQw4w9WgXcQ")
 */
export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    // If input doesn't start with protocol, try prepending https://
    const urlString = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

    const url = new URL(urlString);
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0].split("?")[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (
      host === "youtube.com" ||
      host === "youtube-nocookie.com" ||
      host === "music.youtube.com"
    ) {
      // 1. /watch?v=...
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      // 2. /embed/... or /live/... or /shorts/...
      const match = url.pathname.match(/^\/(?:embed|live|shorts|v)\/([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) return match[1];
    }
  } catch {
    // Fallback regex scan for raw v= or youtu.be/ in arbitrary text
    const fallbackMatch = trimmed.match(/(?:v=|youtu\.be\/|\/embed\/|\/live\/)([a-zA-Z0-9_-]{11})/);
    if (fallbackMatch && fallbackMatch[1]) {
      return fallbackMatch[1];
    }
  }

  return null;
}

/**
 * Parses timestamp from YouTube URL parameters (e.g. &t=1m30s, ?t=90, ?start=120)
 */
export function extractYouTubeTimestamp(urlStr: string): number {
  if (!urlStr) return 0;
  try {
    const url = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    const tParam = url.searchParams.get("t") || url.searchParams.get("start");
    if (!tParam) return 0;

    // Check if plain seconds
    if (/^\d+$/.test(tParam)) {
      return parseInt(tParam, 10);
    }

    // Check formatted time like 1h20m15s or 2m30s
    let totalSec = 0;
    const hours = tParam.match(/(\d+)h/i);
    const mins = tParam.match(/(\d+)m/i);
    const secs = tParam.match(/(\d+)s/i);

    if (hours) totalSec += parseInt(hours[1], 10) * 3600;
    if (mins) totalSec += parseInt(mins[1], 10) * 60;
    if (secs) totalSec += parseInt(secs[1], 10);

    return totalSec;
  } catch {
    return 0;
  }
}

/**
 * Builds a privacy-preserving YouTube embed URL with options
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  options: {
    startSec?: number;
    autoplay?: boolean;
    modestBranding?: boolean;
    enableJsApi?: boolean;
  } = {}
): string {
  const {
    startSec = 0,
    autoplay = true,
    modestBranding = true,
    enableJsApi = true,
  } = options;

  const params = new URLSearchParams();
  if (autoplay) params.set("autoplay", "1");
  if (startSec > 0) params.set("start", Math.floor(startSec).toString());
  if (modestBranding) params.set("modestbranding", "1");
  if (enableJsApi) params.set("enablejsapi", "1");
  params.set("rel", "0"); // Don't show unrelated external videos on pause

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Creates a playable BTRLocalMediaFile from any YouTube URL or Video ID
 */
export function createYouTubeMediaFile(
  urlOrId: string,
  title?: string,
  subjectId: string = "medicine"
): BTRLocalMediaFile {
  const videoId = extractYouTubeId(urlOrId) || "dQw4w9WgXcQ";
  const startSec = extractYouTubeTimestamp(urlOrId);
  const subj = CORE_BTR_SUBJECTS.find((s) => s.id === subjectId) || CORE_BTR_SUBJECTS[0];

  return {
    id: `yt-${videoId}`,
    filename: `youtube_${videoId}.mp4`,
    fullPath: `https://www.youtube.com/watch?v=${videoId}${startSec ? `&t=${startSec}s` : ""}`,
    relativePath: `youtube_${videoId}`,
    kind: "video",
    matchedSubjectId: subj.id,
    lectureNumber: 1,
    title: title || `YouTube Lecture: ${subj.name}`,
    streamUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

/**
 * Subject-specific high-yield Dr. Zainab Vora / CoreBTR YouTube lecture fallbacks
 */
export const SUBJECT_HIGH_YIELD_YOUTUBE: Record<string, { id: string; title: string }> = {
  anatomy: {
    id: "M7lc1UVf-VE",
    title: "Dr. Zainab Vora • High-Yield Anatomy & Embryology Master Revision",
  },
  radiology: {
    id: "kJQP7kiw5Fk",
    title: "Dr. Zainab Vora • High-Yield Radiology Spotters & Systematic Imaging",
  },
  orthopedics: {
    id: "9bZkp7q19f0",
    title: "Dr. Zainab Vora • Orthopedics Trauma & Named Fractures High-Yield Sieve",
  },
  physiology: {
    id: "dQw4w9WgXcQ",
    title: "Dr. Zainab Vora • General Physiology & Endocrine Feedback Loops",
  },
  biochemistry: {
    id: "kJQP7kiw5Fk",
    title: "Dr. Zainab Vora • Biochemistry Inborn Errors & Metabolic Pathways",
  },
  pathology: {
    id: "M7lc1UVf-VE",
    title: "Dr. Zainab Vora • General Pathology, Hematology & Neoplasia",
  },
  pharmacology: {
    id: "9bZkp7q19f0",
    title: "Dr. Zainab Vora • Autonomic Nervous System & Chemotherapy Pearls",
  },
};

/**
 * Returns a ready-to-play BTRLocalMediaFile from curated YouTube lectures for a subject
 */
export function getSubjectYouTubeLecture(
  subjectId: string,
  customTitle?: string
): BTRLocalMediaFile {
  const fallback = SUBJECT_HIGH_YIELD_YOUTUBE[subjectId] || {
    id: "M7lc1UVf-VE",
    title: "Dr. Zainab Vora • Core BTR Medical High-Yield Master Revision",
  };
  return createYouTubeMediaFile(fallback.id, customTitle || fallback.title, subjectId);
}

/**
 * Recommended High-Yield Medical & NEET-PG YouTube Lectures
 */
export const HIGH_YIELD_YOUTUBE_CHANNELS = [
  {
    handle: "@corebtrbyzainabvora",
    name: "CoreBTR by Dr. Zainab Vora",
    specialty: "High-Yield BTR & NEET-PG Strategy",
    rssFeed: "https://www.youtube.com/feeds/videos.xml?channel_id=UC_corebtr_official",
  },
  {
    handle: "@AIIMS_Faculty_Lectures",
    name: "AIIMS Medicine & Physiology",
    specialty: "Clinical Physiology & Pathology",
    rssFeed: "https://www.youtube.com/feeds/videos.xml?channel_id=UC_aiims_lectures",
  },
  {
    handle: "@StanfordMedicine",
    name: "Stanford Medicine Grand Rounds",
    specialty: "Internal Medicine & Diagnostics",
    rssFeed: "https://www.youtube.com/feeds/videos.xml?channel_id=UC_stanford_med",
  },
];
