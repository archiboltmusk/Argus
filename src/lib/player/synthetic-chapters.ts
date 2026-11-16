/**
 * Automatic Scene & Song Chapter Synthesizer
 * Generates synthetic chapter marks for catalog titles and Indian cinema lacking MKV chapters.
 * Synthesizes: Cold Open / Title Track, Intermission, Song Tracks, Climax, and End Credits.
 */

export interface SyntheticChapter {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
  kind: "prologue" | "song" | "intermission" | "climax" | "credits" | "scene";
  badge?: string;
}

export interface ChapterSynthesisOptions {
  durationSec: number;
  isIndianCinema?: boolean;
  knownSongTitles?: string[];
  audioSilenceOffsetsSec?: number[]; // Audio gaps detected around 45%-55%
}

export function synthesizeChapters(opts: ChapterSynthesisOptions): SyntheticChapter[] {
  const { durationSec, isIndianCinema = true, knownSongTitles = [], audioSilenceOffsetsSec = [] } = opts;
  if (durationSec <= 300) return []; // Too short for chaptering

  const chapters: SyntheticChapter[] = [];

  // 1. Prologue / Cold Open (0 to ~3 min)
  const prologueEnd = Math.min(180, durationSec * 0.05);
  chapters.push({
    id: "chap-prologue",
    title: "Prologue / Cold Open",
    startSec: 0,
    endSec: prologueEnd,
    kind: "prologue",
  });

  // 2. Title Track / Credits (approx 3 min to 6 min)
  const titleTrackEnd = Math.min(360, durationSec * 0.10);
  if (durationSec > 600) {
    chapters.push({
      id: "chap-title",
      title: "Title Sequence & Credits",
      startSec: prologueEnd,
      endSec: titleTrackEnd,
      kind: "scene",
    });
  }

  // 3. Indian Cinema Intermission Detection (around 45% - 55% mark)
  let intermissionStart = durationSec * 0.50;
  if (isIndianCinema && durationSec >= 5400) { // Films >= 90 mins
    // Check if an audio silence point was reported near the middle
    const candidateSilence = audioSilenceOffsetsSec.find(
      (sec) => sec >= durationSec * 0.42 && sec <= durationSec * 0.58
    );
    if (candidateSilence) {
      intermissionStart = candidateSilence;
    }

    // Insert Pre-Intermission Act
    chapters.push({
      id: "chap-act1",
      title: "First Half / Build-Up",
      startSec: titleTrackEnd,
      endSec: intermissionStart,
      kind: "scene",
    });

    // Intermission Marker (e.g. 10-second card)
    chapters.push({
      id: "chap-intermission",
      title: "Intermission Point",
      startSec: intermissionStart,
      endSec: Math.min(durationSec, intermissionStart + 15),
      kind: "intermission",
      badge: "Break",
    });
  }

  // 4. Climax Act (approx 85% to 96% mark)
  const climaxStart = durationSec * 0.85;
  const creditsStart = durationSec * 0.96;

  if (isIndianCinema && durationSec >= 5400) {
    chapters.push({
      id: "chap-act2",
      title: "Second Half / Revelations",
      startSec: Math.min(durationSec, intermissionStart + 15),
      endSec: climaxStart,
      kind: "scene",
    });
  }

  chapters.push({
    id: "chap-climax",
    title: "Climax & Resolution",
    startSec: climaxStart,
    endSec: creditsStart,
    kind: "climax",
    badge: "Climax",
  });

  // 5. End Credits
  chapters.push({
    id: "chap-credits",
    title: "End Credits",
    startSec: creditsStart,
    endSec: durationSec,
    kind: "credits",
  });

  // 6. Inject Known Song Markers if available
  if (knownSongTitles.length > 0) {
    // Distribute songs across the runtime safely
    const songSpacing = (creditsStart - titleTrackEnd) / (knownSongTitles.length + 1);
    knownSongTitles.forEach((song, i) => {
      const sStart = titleTrackEnd + (i + 1) * songSpacing;
      chapters.push({
        id: `chap-song-${i + 1}`,
        title: `Song: ${song}`,
        startSec: Math.round(sStart),
        endSec: Math.round(sStart + 240), // Standard ~4 min song
        kind: "song",
        badge: "Song",
      });
    });
  }

  // Sort chronologically
  return chapters.sort((a, b) => a.startSec - b.startSec);
}

/**
 * Parses timestamp strings formatted as HH:MM:SS or MM:SS to total seconds.
 */
export function parseTimestampToSeconds(ts: string): number {
  const parts = ts.trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n) || n < 0)) return -1;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return -1;
}

/**
 * Parses YouTube-style timestamped chapter listings from description or text.
 * E.g.:
 *   00:00 Introduction
 *   01:23 - The Setup
 *   [05:42] Deep Dive Architecture
 *   1:12:05 Hands-on Demo
 */
export function parseDescriptionTimestamps(
  text: string,
  durationSec?: number,
): SyntheticChapter[] {
  if (!text || typeof text !== "string") return [];

  // Match: (optional [ or () 00:00(:00) (optional ] or )) (optional - or : or space) Title
  const pattern = /(?:^|\n)\s*(?:\[|\()?(\d{1,2}:\d{2}(?::\d{2})?)(?:\]|\))?\s*[-–—:]?\s*([^\n\r]+)/g;
  const rawList: Array<{ title: string; startSec: number }> = [];

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const timeStr = match[1];
    let rawTitle = match[2]?.trim() || "";

    // Clean up title (remove trailing URL, parens or markdown)
    rawTitle = rawTitle.replace(/\bhttps?:\/\/\S+/gi, "").replace(/[\s\-_|]+$/, "").trim();
    if (!rawTitle) continue;

    const sec = parseTimestampToSeconds(timeStr);
    if (sec >= 0) {
      if (durationSec && durationSec > 0 && sec > durationSec) continue;
      rawList.push({ title: rawTitle, startSec: sec });
    }
  }

  if (rawList.length < 2) return [];

  // Sort ascending by startSec
  rawList.sort((a, b) => a.startSec - b.startSec);

  // Prepend intro if first chapter doesn't start at 0
  if (rawList[0].startSec > 10) {
    rawList.unshift({ title: "Introduction", startSec: 0 });
  }

  // Deduplicate timestamps within 3 seconds of each other
  const deduped: Array<{ title: string; startSec: number }> = [];
  for (const item of rawList) {
    const last = deduped[deduped.length - 1];
    if (!last || item.startSec - last.startSec >= 3) {
      deduped.push(item);
    }
  }

  if (deduped.length < 2) return [];

  const effectiveDuration = durationSec && durationSec > 0 ? durationSec : deduped[deduped.length - 1].startSec + 300;

  return deduped.map((item, idx) => {
    const nextStart = deduped[idx + 1]?.startSec ?? effectiveDuration;
    return {
      id: `chap-desc-${idx + 1}`,
      title: item.title,
      startSec: item.startSec,
      endSec: Math.max(item.startSec + 5, nextStart),
      kind: idx === 0 ? "prologue" : "scene",
    };
  });
}

export type SubtitleCueLike = {
  start?: number;
  end?: number;
  startSec?: number;
  endSec?: number;
  text: string;
};

/**
 * Subtitle Timestamp Breakdown (Reddit approach).
 * Analyzes dialogue pauses and silence gaps (>=22s) from subtitle cues to infer natural scene boundaries.
 */
export function synthesizeChaptersFromSubtitles(
  cues: SubtitleCueLike[],
  durationSec: number,
): SyntheticChapter[] {
  if (!cues || cues.length < 5 || durationSec <= 120) return [];

  const validCues = [...cues]
    .map((c) => ({
      startSec: c.startSec ?? c.start ?? 0,
      endSec: c.endSec ?? c.end ?? 0,
      text: c.text || "",
    }))
    .filter((c) => Number.isFinite(c.startSec) && Number.isFinite(c.endSec) && c.endSec >= c.startSec)
    .sort((a, b) => a.startSec - b.startSec);

  if (validCues.length < 5) return [];

  const chapters: Array<{ title: string; startSec: number; kind: SyntheticChapter["kind"] }> = [
    { title: "Opening Scene", startSec: 0, kind: "prologue" },
  ];

  let lastChapterTime = 0;
  // Minimum chapter separation scaling with duration
  const MIN_CHAPTER_GAP = Math.min(150, Math.max(35, durationSec * 0.03));

  for (let i = 1; i < validCues.length; i++) {
    const prev = validCues[i - 1];
    const curr = validCues[i];
    const silenceSec = curr.startSec - prev.endSec;

    // Detect silence gap >= 22s or explicit scene/music indicators
    const isSilenceGap = silenceSec >= 22;
    const isMusicCue = /\[(?:music|theme|applause|cheers|intro)\]|♪/i.test(curr.text);
    const hasEnoughSeparation = curr.startSec - lastChapterTime >= MIN_CHAPTER_GAP;

    if ((isSilenceGap || isMusicCue) && hasEnoughSeparation && curr.startSec < durationSec - 60) {
      // Clean up cue text for a descriptive chapter title
      const cleanText = curr.text
        .replace(/<[^>]+>/g, "")
        .replace(/\[[^\]]+\]/g, "")
        .replace(/\([^)]+\)/g, "")
        .replace(/[♪#*]+/g, "")
        .replace(/\s+/g, " ")
        .trim();

      let title = `Scene ${chapters.length + 1}`;
      let kind: SyntheticChapter["kind"] = "scene";

      if (isMusicCue) {
        title = cleanText ? `Musical Sequence: "${cleanText}"` : `Musical Sequence ${chapters.length}`;
        kind = "song";
      } else if (cleanText.length >= 6) {
        // Take first 5-8 words of dialogue for YouTube-style descriptive flair
        const words = cleanText.split(" ").slice(0, 7).join(" ");
        const preview = words.length > 40 ? words.slice(0, 37) + "..." : words;
        title = `Scene ${chapters.length}: "${preview}"`;
      }

      chapters.push({
        title,
        startSec: Math.round(curr.startSec),
        kind,
      });
      lastChapterTime = curr.startSec;
    }
  }

  // End credits chapter
  const creditsStart = Math.max(durationSec - 300, durationSec * 0.96);
  if (creditsStart - lastChapterTime >= 60) {
    chapters.push({
      title: "End Credits",
      startSec: Math.round(creditsStart),
      kind: "credits",
    });
  }

  if (chapters.length < 2) return [];

  return chapters.map((ch, idx) => {
    const nextStart = chapters[idx + 1]?.startSec ?? durationSec;
    return {
      id: `chap-sub-${idx + 1}`,
      title: ch.title,
      startSec: ch.startSec,
      endSec: nextStart,
      kind: ch.kind,
    };
  });
}

/**
 * Dramatic narrative act breakdown fallback for IMDb/TMDB catalog titles.
 */
export function synthesizeNarrativeChapters(opts: {
  durationSec: number;
  isIndianCinema?: boolean;
}): SyntheticChapter[] {
  return synthesizeChapters({
    durationSec: opts.durationSec,
    isIndianCinema: opts.isIndianCinema ?? false,
  });
}

/**
 * Unified resolver for YouTube-style chapters.
 * Inspects: native container chapters -> description timestamps -> subtitle silence analysis -> narrative acts.
 */
export function resolveBestChapters(opts: {
  existingChapters?: Array<{ title: string; startSec: number }>;
  description?: string;
  subtitleCues?: SubtitleCueLike[];
  durationSec: number;
  isIndianCinema?: boolean;
}): SyntheticChapter[] {
  const { existingChapters, description, subtitleCues, durationSec, isIndianCinema } = opts;

  // 1. Native chapters from container if present
  if (existingChapters && existingChapters.length >= 2) {
    const sorted = [...existingChapters].sort((a, b) => a.startSec - b.startSec);
    return sorted.map((ch, idx) => {
      const nextStart = sorted[idx + 1]?.startSec ?? durationSec;
      return {
        id: `chap-native-${idx + 1}`,
        title: ch.title || `Chapter ${idx + 1}`,
        startSec: ch.startSec,
        endSec: Math.max(ch.startSec + 5, nextStart),
        kind: idx === 0 ? "prologue" : "scene",
      };
    });
  }

  // 2. Video description timestamps (e.g. YouTube style)
  if (description) {
    const descChapters = parseDescriptionTimestamps(description, durationSec);
    if (descChapters.length >= 2) {
      return descChapters;
    }
  }

  // 3. Subtitle timestamp gaps (Reddit approach)
  if (subtitleCues && subtitleCues.length >= 5 && durationSec > 120) {
    const subChapters = synthesizeChaptersFromSubtitles(subtitleCues, durationSec);
    if (subChapters.length >= 2) {
      return subChapters;
    }
  }

  // 4. Dramatic / Indian cinema act breakdown fallback
  if (durationSec > 300) {
    return synthesizeNarrativeChapters({ durationSec, isIndianCinema });
  }

  return [];
}
