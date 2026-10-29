import type { TrackInfo } from "./bridge";

export type RegionalLanguageOption = {
  code: string;
  label: string;
  nativeLabel: string;
  aliases: string[];
};

export const INDIAN_REGIONAL_LANGUAGES: RegionalLanguageOption[] = [
  {
    code: "hin",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    aliases: ["hin", "hi", "hindi"],
  },
  {
    code: "ben",
    label: "Bengali",
    nativeLabel: "বাংলা",
    aliases: ["ben", "bn", "bengali", "bangla"],
  },
  {
    code: "tam",
    label: "Tamil",
    nativeLabel: "தமிழ்",
    aliases: ["tam", "ta", "tamil"],
  },
  {
    code: "tel",
    label: "Telugu",
    nativeLabel: "తెలుగు",
    aliases: ["tel", "te", "telugu"],
  },
  {
    code: "mal",
    label: "Malayalam",
    nativeLabel: "മലയാളം",
    aliases: ["mal", "ml", "malayalam"],
  },
  {
    code: "kan",
    label: "Kannada",
    nativeLabel: "ಕನ್ನಡ",
    aliases: ["kan", "kn", "kannada"],
  },
  {
    code: "mar",
    label: "Marathi",
    nativeLabel: "मराठी",
    aliases: ["mar", "mr", "marathi"],
  },
  {
    code: "pan",
    label: "Punjabi",
    nativeLabel: "ਪੰਜਾਬੀ",
    aliases: ["pan", "pa", "punjabi"],
  },
];

/**
 * Searches stream audio tracks for an Indian regional language match.
 * Matches language tag codes (ISO 639-1 / 639-2) and track title keywords.
 */
export function findMatchingRegionalAudioTrack(
  tracks: TrackInfo[],
  preferredCode: string,
): TrackInfo | null {
  if (!preferredCode || !tracks.length) return null;

  const targetLang = INDIAN_REGIONAL_LANGUAGES.find(
    (l) => l.code === preferredCode.toLowerCase(),
  );
  if (!targetLang) return null;

  const aliases = targetLang.aliases;

  // 1. High-confidence check: ISO language match
  const langMatch = tracks.find((t) => {
    const lang = (t.lang || "").toLowerCase().trim();
    return aliases.includes(lang);
  });
  if (langMatch) return langMatch;

  // 2. Title/descriptor check (e.g. "Hindi [Org 5.1]" or "Bengali Audio")
  const titleMatch = tracks.find((t) => {
    const title = (t.title || "").toLowerCase();
    return aliases.some((alias) => {
      // word boundary check or bracketed check
      const re = new RegExp(`(^|[\\s\\[\\(\\_\\-])${alias}([\\s\\]\\)\\_\\-]|$)`, "i");
      return re.test(title);
    });
  });
  if (titleMatch) return titleMatch;

  return null;
}

/**
 * Checks if a stream title indicates multi-audio or dubbed regional release.
 */
export function detectIndianMultiAudio(releaseName: string | undefined | null): {
  isMultiAudio: boolean;
  languages: string[];
} {
  if (!releaseName) return { isMultiAudio: false, languages: [] };
  const s = releaseName.toLowerCase();

  const found: string[] = [];
  for (const lang of INDIAN_REGIONAL_LANGUAGES) {
    if (lang.aliases.some((a) => s.includes(a))) {
      found.push(lang.label);
    }
  }

  const hasMultiKeywords =
    s.includes("dual") ||
    s.includes("multi") ||
    s.includes("dub") ||
    s.includes("dvdrip") ||
    s.includes("org audio");

  return {
    isMultiAudio: hasMultiKeywords || found.length > 1,
    languages: found,
  };
}
