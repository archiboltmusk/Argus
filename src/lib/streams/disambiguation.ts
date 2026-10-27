import type { ParsedStream } from "./types";

export type DisambiguationContext = {
  canonicalTitle?: string;
  expectedYear?: number | null;
  runtimeMinutes?: number | null;
  imdbId?: string | null;
  tmdbId?: string | number | null;
  director?: string | null;
  overviewKeywords?: string[];
};

export type DisambiguationResult = {
  isMatch: boolean;
  confidenceScore: number; // 0 to 100
  penalties: { reason: string; delta: number }[];
  bonuses: { reason: string; delta: number }[];
  isMockbusterOrDuplicateDetected: boolean;
};

/**
 * Normalizes title for comparison: strips punctuation, lowercase, normalizes whitespace
 */
function cleanTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Disambiguates releases with identical or similar names in the same year.
 * Handles:
 * 1. The Asylum mockbusters (e.g. Top Gunner vs Top Gun, Pinocchio (del Toro) vs Pinocchio (Disney))
 * 2. Documentaries vs Theatrical movies with identical names
 * 3. Exact runtime vs file size bitrate sanity
 * 4. Director / Studio in release name
 */
export function disambiguateRelease(
  stream: ParsedStream,
  context: DisambiguationContext,
): DisambiguationResult {
  const penalties: { reason: string; delta: number }[] = [];
  const bonuses: { reason: string; delta: number }[] = [];
  let isMockbusterOrDuplicateDetected = false;

  const rawTitle = stream.name || stream.title || stream.parsedTitle || "";
  const cleanedRelease = cleanTitle(rawTitle);
  const cleanedCanonical = context.canonicalTitle ? cleanTitle(context.canonicalTitle) : "";

  // Title match heuristic: If release has completely different title words, penalize
  if (cleanedCanonical && cleanedRelease) {
    const canonicalTokens = cleanedCanonical.split(" ").filter((w) => w.length > 2);
    const matchesAny = canonicalTokens.some((tok) => cleanedRelease.includes(tok));
    if (!matchesAny && canonicalTokens.length > 0) {
      penalties.push({ reason: "title-token-mismatch", delta: -180 });
      isMockbusterOrDuplicateDetected = true;
    }
  }

  // 1. Check Year Match
  if (context.expectedYear && stream.year) {
    if (stream.year === context.expectedYear) {
      bonuses.push({ reason: "exact-year-match", delta: 15 });
    } else {
      const diff = Math.abs(stream.year - context.expectedYear);
      if (diff >= 1) {
        penalties.push({ reason: `year-mismatch-${diff}`, delta: -diff * 40 });
      }
    }
  }

  // 2. Director & Key Entity Disambiguation (e.g. "del Toro" vs Disney)
  if (context.director) {
    const directorNorm = cleanTitle(context.director);
    const directorLastName = directorNorm.split(" ").pop() || "";
    if (directorLastName.length > 3) {
      if (cleanedRelease.includes(directorLastName)) {
        bonuses.push({ reason: `director-match:${directorLastName}`, delta: 35 });
      } else if (
        // Another famous director is explicitly named in the file (e.g. Disney vs Del Toro)
        /del\s*toro/i.test(cleanedRelease) &&
        !/del\s*toro/i.test(directorNorm)
      ) {
        penalties.push({ reason: "conflicting-director-detected", delta: -180 });
        isMockbusterOrDuplicateDetected = true;
      }
    }
  }

  // 3. Mockbuster Signature Detection
  // Common mockbuster studios: The Asylum, Dingo Pictures, GoodTimes
  if (/\b(?:asylum|the\s*asylum)\b/i.test(cleanedRelease)) {
    if (!context.canonicalTitle?.toLowerCase().includes("asylum")) {
      penalties.push({ reason: "asylum-mockbuster-detected", delta: -220 });
      isMockbusterOrDuplicateDetected = true;
    }
  }

  // 4. Runtime vs Bitrate Sanity Checking
  // If runtime is known (e.g. 120 mins) and file size is 400MB for a 1080p/4K release,
  // it is likely a fake/sample or a short 30min documentary/mockbuster.
  if (context.runtimeMinutes && context.runtimeMinutes > 40 && stream.size) {
    const sizeMB = stream.size / (1024 * 1024);
    const mbps = (stream.size * 8) / (context.runtimeMinutes * 60) / 1_000_000;

    // A real 1080p feature film is almost never under 0.8 Mbps (~700MB for 2 hours)
    if (stream.resolution === "1080p" && mbps < 0.7 && sizeMB < 750) {
      penalties.push({ reason: "suspiciously-undersized-for-runtime", delta: -120 });
      isMockbusterOrDuplicateDetected = true;
    }

    // A 4K release under 2.5GB for a 2-hour movie is an upscaled fake or wrong cut
    if (stream.resolution === "4K" && sizeMB < 2500) {
      penalties.push({ reason: "fake-4k-undersized", delta: -150 });
      isMockbusterOrDuplicateDetected = true;
    }
  }

  // 5. Documentary vs Feature Film Trap
  // If canonical is NOT a documentary, but release says "documentary" or "docu"
  const isDocRelease = /\b(?:documentary|docu|making\s*of|behind\s*the\s*scenes)\b/i.test(cleanedRelease);
  const isDocCanonical = context.overviewKeywords?.some((k) => /documentary/i.test(k));
  if (isDocRelease && !isDocCanonical) {
    penalties.push({ reason: "documentary-mismatch-for-feature", delta: -200 });
    isMockbusterOrDuplicateDetected = true;
  }

  // Compute confidence score
  let confidenceScore = 80;
  for (const b of bonuses) confidenceScore += b.delta;
  for (const p of penalties) confidenceScore += p.delta;
  confidenceScore = Math.max(0, Math.min(100, confidenceScore));

  const isMatch = confidenceScore >= 40 && !isMockbusterOrDuplicateDetected;

  return {
    isMatch,
    confidenceScore,
    penalties,
    bonuses,
    isMockbusterOrDuplicateDetected,
  };
}
