/**
 * Core BTR Local Media & PDF Library Auto-Scanner
 *
 * Automatically detects, classifies, and indexes user's local BTR video lectures
 * and annotated/unannotated PDF workbooks across all 19 medical subjects.
 */

import type { PlayerSrc } from "@/lib/view";
import { CORE_BTR_SUBJECTS, type BTRSubject } from "./corebtr-schedule";
import { USER_LOCAL_BTR_MANIFEST } from "./btr-library-manifest";

export type BTRMediaKind = "video" | "pdf_annotated" | "pdf_unannotated" | "other";

export interface BTRLocalMediaFile {
  id: string;
  filename: string;
  fullPath: string;
  relativePath: string;
  sizeBytes?: number;
  kind: BTRMediaKind;
  matchedSubjectId: string;
  lectureNumber: number;
  title: string;
  blobUrl?: string;
  streamUrl?: string;
}

export interface BTRSubjectMediaMapping {
  subjectId: string;
  subjectName: string;
  videos: BTRLocalMediaFile[];
  annotatedPdf?: BTRLocalMediaFile;
  unannotatedPdf?: BTRLocalMediaFile;
  otherPdfs: BTRLocalMediaFile[];
}

export interface BTRSpecialItem {
  id: string;
  title: string;
  filename: string;
  fullPath: string;
  sizeBytes: number;
}

export interface BTRLocalLibraryState {
  rootFolderPath?: string;
  lastScannedAt?: string;
  totalVideosFound: number;
  totalPdfsFound: number;
  subjectsWithVideosCount: number;
  subjectsWithPdfsCount: number;
  mappings: Record<string, BTRSubjectMediaMapping>;
  masterPdfs?: BTRSpecialItem[];
  megaBtrVideos?: BTRSpecialItem[];
  tndVideos?: BTRSpecialItem[];
}

const VIDEO_EXTS = new Set(["mp4", "mkv", "webm", "avi", "mov", "m4v", "flv", "ts"]);
const PDF_EXTS = new Set(["pdf"]);

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

/**
 * Match heuristic for 19 Medical Subjects
 */
const SUBJECT_PATTERNS: Array<{
  subjectId: string;
  regex: RegExp;
}> = [
  { subjectId: "anatomy", regex: /\b(anat|anatomy|embryo|histol|neuroanat)\b/i },
  { subjectId: "physiology", regex: /\b(physio|physiology|general physio)\b/i },
  { subjectId: "biochemistry", regex: /\b(biochem|biochemistry|genetics|metabolism)\b/i },
  { subjectId: "pathology", regex: /\b(path|pathology|hematol|haematol)\b/i },
  { subjectId: "pharmacology", regex: /\b(pharm|pharma|pharmacology)\b/i },
  { subjectId: "microbiology", regex: /\b(micro|microbiology|parasit|bacteriol|virol)\b/i },
  { subjectId: "fmt", regex: /\b(fmt|forensic|toxicology|medicolegal)\b/i },
  { subjectId: "psm", regex: /\b(psm|spm|community medicine|preventive|epidemiol|biostat)\b/i },
  { subjectId: "ent", regex: /\b(ent|otorhino|otol|rhinol|laryngol)\b/i },
  { subjectId: "ophthalmology", regex: /\b(opht|ophthal|ophthalmology|eye)\b/i },
  { subjectId: "dermatology", regex: /\b(derm|derma|dermatology|skin|venereol)\b/i },
  { subjectId: "radiology", regex: /\b(rad|radio|radiology|nuclear medicine|xray|ct|mri)\b/i },
  { subjectId: "psychiatry", regex: /\b(psych|psychiatry|mental health)\b/i },
  { subjectId: "anesthesia", regex: /\b(anes|anaesth|anesthesia|anaesthesia|anesthesiology)\b/i },
  { subjectId: "orthopedics", regex: /\b(ortho|orthopedics|orthopaedics|fracture)\b/i },
  { subjectId: "medicine", regex: /\b(med|medicine|internal med|cardiol|neurol|nephrol)\b/i },
  { subjectId: "surgery", regex: /\b(surg|surgery|general surg|trauma|surgical)\b/i },
  { subjectId: "obgyn", regex: /\b(obg|obgyn|obs|gyn|gynae|gynecology|obstetrics)\b/i },
  { subjectId: "pediatrics", regex: /\b(ped|pedia|pediatrics|paediatrics|neonatol)\b/i },
];

export function extractLectureNumber(filename: string): number {
  const match = filename.match(/(?:lecture|lec|part|ep|l|#)?[\s_-]*(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 1;
}

export function cleanBTRTitle(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  return base
    .replace(/[._-]/g, " ")
    .replace(/\b(1080p|720p|4k|2160p|h264|x264|hevc|x265|webrip|web-dl|btr|corebtr|dr zainab vora)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Classify a local file into a BTR subject and kind (video, annotated PDF, unannotated PDF)
 */
export function classifyBTRFile(
  filename: string,
  fullPath: string,
  relativePath: string = filename,
  sizeBytes?: number,
  blobUrl?: string,
  streamUrl?: string
): BTRLocalMediaFile | null {
  const ext = getFileExtension(filename);
  const isVideo = VIDEO_EXTS.has(ext);
  const isPdf = PDF_EXTS.has(ext);

  if (!isVideo && !isPdf) {
    return null;
  }

  // Combine full path + relative path + filename for matching
  const searchCorpus = `${relativePath} ${filename} ${fullPath}`.toLowerCase();

  let matchedSubjectId: string | null = null;
  for (const item of SUBJECT_PATTERNS) {
    if (item.regex.test(searchCorpus)) {
      matchedSubjectId = item.subjectId;
      break;
    }
  }

  // If no subject explicitly matched, check for direct subject short codes
  if (!matchedSubjectId) {
    for (const subj of CORE_BTR_SUBJECTS) {
      const codeRegex = new RegExp(`\\b${subj.shortCode}\\b`, "i");
      if (codeRegex.test(searchCorpus)) {
        matchedSubjectId = subj.id;
        break;
      }
    }
  }

  // Fallback: If still unmatched, default to "medicine" or flag as other
  if (!matchedSubjectId) {
    matchedSubjectId = "medicine";
  }

  let kind: BTRMediaKind = "other";
  if (isVideo) {
    kind = "video";
  } else if (isPdf) {
    const isUnannotated =
      /unannotated|blank|raw|without_annot|question|workbook_raw|without/i.test(searchCorpus);
    const isAnnotated =
      /annotated|notes|solution|filled|master|with_annot|marked/i.test(searchCorpus);

    if (isUnannotated) {
      kind = "pdf_unannotated";
    } else if (isAnnotated) {
      kind = "pdf_annotated";
    } else {
      // Default standard PDF to annotated notes
      kind = "pdf_annotated";
    }
  }

  const lectureNumber = extractLectureNumber(filename);
  const title = cleanBTRTitle(filename) || filename;

  return {
    id: `btr-file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    filename,
    fullPath,
    relativePath,
    sizeBytes,
    kind,
    matchedSubjectId,
    lectureNumber,
    title,
    blobUrl,
    streamUrl,
  };
}

/**
 * Index a collection of user-uploaded or scanned files into the BTR 19-Subject structure
 */
export function indexBTRFiles(
  files: Array<{
    name: string;
    path?: string;
    fullPath?: string;
    size?: number;
    relativePath?: string;
    blobUrl?: string;
    streamUrl?: string;
  }>,
  rootFolderPath?: string
): BTRLocalLibraryState {
  const mappings: Record<string, BTRSubjectMediaMapping> = {};

  // Initialize all 19 subjects
  for (const subj of CORE_BTR_SUBJECTS) {
    mappings[subj.id] = {
      subjectId: subj.id,
      subjectName: subj.name,
      videos: [],
      otherPdfs: [],
    };
  }

  let totalVideosFound = 0;
  let totalPdfsFound = 0;

  for (const f of files) {
    const pathStr = f.fullPath || f.path || f.name;
    const classified = classifyBTRFile(
      f.name,
      pathStr,
      f.relativePath || f.name,
      f.size,
      f.blobUrl,
      f.streamUrl
    );
    if (!classified) continue;

    const subjectMap = mappings[classified.matchedSubjectId];
    if (!subjectMap) continue;

    if (classified.kind === "video") {
      subjectMap.videos.push(classified);
      totalVideosFound++;
    } else if (classified.kind === "pdf_unannotated") {
      subjectMap.unannotatedPdf = classified;
      totalPdfsFound++;
    } else if (classified.kind === "pdf_annotated") {
      subjectMap.annotatedPdf = classified;
      totalPdfsFound++;
    } else if (classified.kind === "other" && getFileExtension(classified.filename) === "pdf") {
      subjectMap.otherPdfs.push(classified);
      totalPdfsFound++;
    }
  }

  // Sort videos in each subject by lecture number
  for (const subjId of Object.keys(mappings)) {
    mappings[subjId].videos.sort((a, b) => a.lectureNumber - b.lectureNumber);
  }

  let subjectsWithVideosCount = 0;
  let subjectsWithPdfsCount = 0;

  for (const map of Object.values(mappings)) {
    if (map.videos.length > 0) subjectsWithVideosCount++;
    if (map.annotatedPdf || map.unannotatedPdf || map.otherPdfs.length > 0) subjectsWithPdfsCount++;
  }

  const state: BTRLocalLibraryState = {
    rootFolderPath,
    lastScannedAt: new Date().toISOString(),
    totalVideosFound,
    totalPdfsFound,
    subjectsWithVideosCount,
    subjectsWithPdfsCount,
    mappings,
  };

  saveBTRLocalLibrary(state);
  return state;
}

const STORAGE_KEY_BTR_LIBRARY = "argus_corebtr_local_library_v1";

export function getPreindexedDefaultLibrary(): BTRLocalLibraryState {
  const fileList = USER_LOCAL_BTR_MANIFEST.subjectFiles.map((f) => ({
    name: f.filename,
    fullPath: f.fullPath,
    relativePath: f.relativePath,
    size: f.sizeBytes,
  }));
  const base = indexBTRFiles(fileList, USER_LOCAL_BTR_MANIFEST.rootPath);
  return {
    ...base,
    masterPdfs: USER_LOCAL_BTR_MANIFEST.masterPdfs,
    megaBtrVideos: USER_LOCAL_BTR_MANIFEST.megaBtrVideos,
    tndVideos: USER_LOCAL_BTR_MANIFEST.tndVideos,
  };
}

export function loadBTRLocalLibrary(): BTRLocalLibraryState {
  try {
    if (typeof localStorage === "undefined" || !localStorage?.getItem) {
      return getPreindexedDefaultLibrary();
    }
    const raw = localStorage.getItem(STORAGE_KEY_BTR_LIBRARY);
    if (!raw) {
      return getPreindexedDefaultLibrary();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.totalVideosFound === 0) {
      return getPreindexedDefaultLibrary();
    }
    return parsed;
  } catch {
    return getPreindexedDefaultLibrary();
  }
}

export function saveBTRLocalLibrary(state: BTRLocalLibraryState): void {
  try {
    if (typeof localStorage !== "undefined" && localStorage?.setItem) {
      localStorage.setItem(STORAGE_KEY_BTR_LIBRARY, JSON.stringify(state));
    }
  } catch (e) {
    console.error("Failed to save BTR library to localStorage", e);
  }
}

/**
 * Resolves a video or PDF file path to a streamable/playable URL.
 * In Tauri: maps local disk paths through convertFileSrc to bypass webview file:// blocking.
 * In Browser: uses blob URL or web URL.
 */
export function resolveBTRPlayableUrl(
  fullPath: string,
  blobUrl?: string
): string {
  if (blobUrl) return blobUrl;
  if (!fullPath) return "";

  if (
    fullPath.startsWith("http://") ||
    fullPath.startsWith("https://") ||
    fullPath.startsWith("blob:") ||
    fullPath.startsWith("asset://")
  ) {
    return fullPath;
  }

  const cleanPath = fullPath.replace(/^file:\/\//, "");

  if (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { convertFileSrc } = require("@tauri-apps/api/core");
      if (typeof convertFileSrc === "function") {
        return convertFileSrc(cleanPath);
      }
    } catch {}
  }

  return cleanPath;
}

/**
 * Build a PlayerSrc object for instant native video playback in Argus player
 */
export function createBTRVideoPlayerSrc(
  video: BTRLocalMediaFile,
  subject: BTRSubject,
  companionPdfUrl?: string
): PlayerSrc {
  const cleanPath = video.fullPath.replace(/^file:\/\//, "");
  const isRemote =
    video.fullPath.startsWith("http://") ||
    video.fullPath.startsWith("https://") ||
    video.fullPath.startsWith("blob:");
  const isBlob = Boolean(video.blobUrl);
  const isLocalDisk = !isRemote && !isBlob;

  // For native desktop engines (MPV / AVPlayer), feed clean disk path
  const playableUrl = video.blobUrl || (isRemote ? video.fullPath : cleanPath);

  const historyUrl = companionPdfUrl
    ? `/education?btrSubject=${subject.id}&companionPdf=${encodeURIComponent(companionPdfUrl)}`
    : `/education?btrSubject=${subject.id}`;

  return {
    url: playableUrl,
    title: video.title || `${subject.name} - Lecture ${video.lectureNumber}`,
    subtitle: `Core BTR 2027 • ${subject.name} (${subject.category})`,
    // notWebReady invokes Argus's native MPVKit / AVPlayer on macOS & desktop for local disk MKV / HEVC files
    notWebReady: isLocalDisk,
    meta: {
      id: `btr-video-${subject.id}-${video.lectureNumber}`,
      type: "other",
      name: `${subject.name} - Lecture ${video.lectureNumber}`,
      description: `Core BTR Dr. Zainab Vora high-yield lecture for ${subject.name}.`,
    },
    historyUrl,
  };
}
