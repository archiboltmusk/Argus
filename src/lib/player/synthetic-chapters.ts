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
