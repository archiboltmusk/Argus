export type SupportedIndianScript = "bengali" | "devanagari" | "tamil" | "telugu" | "malayalam" | "urdu" | "english";

export type IngestFilmMetadata = {
  id: string;
  originalTitle: string;
  romanizedTitle: string;
  language: string;
  director: string;
  releaseYear: number;
  detectedScript: SupportedIndianScript;
  hasAudioTrack: boolean;
  reelCount: number;
  preservationStatus: "endangered" | "reconstructed" | "pristine-archive" | "lost-fragment";
  sourceFormat: "35mm-nitrate" | "35mm-safety" | "16mm" | "vhs-telecine" | "umatic-tape" | "digital-scan";
  audioSourceMatch?: {
    lpTitle: string;
    catalogNumber: string;
    acousticConfidence: number; // 0-100%
  };
};

export type IngestionStep = {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "error";
  progressPercent: number;
  detail: string;
};

/**
 * Simulates OCR script extraction from opening credit cards of vintage Indian films.
 */
export function extractFilmCreditMetadata(sampleFrameText: string): {
  detectedLanguage: string;
  script: SupportedIndianScript;
  normalizedTitle: string;
} {
  const text = sampleFrameText.trim();
  // Check for Bengali script
  if (/[\u0980-\u09FF]/.test(text)) {
    return { detectedLanguage: "Bengali", script: "bengali", normalizedTitle: "ঐতিহাসিক ভারতীয় সিনেমা (Bengali Archival Print)" };
  }
  // Check for Devanagari script (Hindi, Marathi)
  if (/[\u0900-\u097F]/.test(text)) {
    return { detectedLanguage: "Hindi / Marathi", script: "devanagari", normalizedTitle: "भारतीय सिनेमा संग्रह (Devanagari Archival Print)" };
  }
  // Check for Tamil script
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return { detectedLanguage: "Tamil", script: "tamil", normalizedTitle: "தமிழ் சினிமா காப்பகம் (Tamil Archival Print)" };
  }
  // Check for Malayalam script
  if (/[\u0D00-\u0D7F]/.test(text)) {
    return { detectedLanguage: "Malayalam", script: "malayalam", normalizedTitle: "മലയാള ചലച്ചിത്ര ആർക്കൈവ് (Malayalam Archival Print)" };
  }
  // Check for Telugu script
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return { detectedLanguage: "Telugu", script: "telugu", normalizedTitle: "తెలుగు సినిమా ఆర్కైవ్ (Telugu Archival Print)" };
  }
  // Default to English / Latin
  return { detectedLanguage: "English / Regional", script: "english", normalizedTitle: "Archival Film Reel" };
}

/**
 * Builds an automated preservation ingest job for newly scanned film reels.
 */
export function createPreservationIngestJob(fileName: string, sourceFormat: IngestFilmMetadata["sourceFormat"]): {
  jobId: string;
  fileName: string;
  sourceFormat: IngestFilmMetadata["sourceFormat"];
  steps: IngestionStep[];
} {
  const jobId = `nfhm-ingest-${Date.now().toString(36)}`;
  const steps: IngestionStep[] = [
    { id: "scan", name: "1. 4K Perforation & Edge Code Alignment", status: "completed", progressPercent: 100, detail: "Gate weave detected and stabilized (+/- 2.4px)" },
    { id: "ocr", name: "2. Multi-Script Credit & Censor Board OCR", status: "completed", progressPercent: 100, detail: "Extracted verified release title and CBFC certificate certificate" },
    { id: "audio-sync", name: "3. Gramophone 78-RPM Acoustic Audio Match", status: "running", progressPercent: 68, detail: "Matching optical soundtrack waveform to uncompressed vinyl master" },
    { id: "neural-clean", name: "4. Neural Dirt & Scratch Elimination", status: "pending", progressPercent: 0, detail: "Temporal patch-match across frames t-1, t, t+1" },
    { id: "package", name: "5. Packaging Decentralized Archival Manifest", status: "pending", progressPercent: 0, detail: "Generating open Stremio / WebDAV stream endpoints" },
  ];

  return { jobId, fileName, sourceFormat, steps };
}
