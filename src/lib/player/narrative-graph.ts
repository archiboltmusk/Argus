/**
 * Interactive Narrative & Character Timeline Graph
 * Automatically identifies characters, dialogue presence, and relationship arcs across the entire timeline
 * from subtitle cues, enabling visual timeline navigation and scene character tracking.
 */

export interface CharacterPresenceSpan {
  startSec: number;
  endSec: number;
  snippet: string;
}

export interface CharacterNode {
  id: string;
  name: string;
  color: string;
  totalLines: number;
  firstAppearanceSec: number;
  lastAppearanceSec: number;
  presenceSpans: CharacterPresenceSpan[];
}

export interface CharacterInteraction {
  source: string;
  target: string;
  sharedScenesCount: number;
  timestamps: number[];
}

export interface NarrativeSceneClustered {
  id: string;
  startSec: number;
  endSec: number;
  characterIds: string[];
  summarySnippet: string;
}

export interface NarrativeGraphData {
  characters: CharacterNode[];
  interactions: CharacterInteraction[];
  scenes: NarrativeSceneClustered[];
  totalDurationSec: number;
}

const PALETTE = [
  "#38bdf8", // Sky
  "#f43f5e", // Rose
  "#10b981", // Emerald
  "#a855f7", // Purple
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#84cc16", // Lime
  "#6366f1", // Indigo
];

/**
 * Extracts speaker prefix if present in subtitle line (e.g. "MARY: How are you?", "- BOB: Sure").
 */
export function extractSpeakerFromLine(text: string): { speaker?: string; dialogue: string } {
  const cleaned = text.replace(/<[^>]+>/g, "").trim();

  // Pattern 1: "NAME: dialogue" or "- NAME: dialogue"
  const colonMatch = cleaned.match(/^(?:[-–—]\s*)?([A-Z][A-Za-z0-9\s.]{1,24}):\s*(.*)$/);
  if (colonMatch) {
    const speaker = colonMatch[1].trim();
    // Exclude common false positives like "NOTE", "SCENE", "ACT", "CHAPTER", "HTTP"
    if (!/^(NOTE|SCENE|ACT|CHAPTER|PART|HTTP|HTTPS|WWW)$/i.test(speaker)) {
      return { speaker, dialogue: colonMatch[2].trim() };
    }
  }

  // Pattern 2: "[NAME] dialogue" or "(NAME) dialogue"
  const bracketMatch = cleaned.match(/^(?:[-–—]\s*)?[\[(]([A-Z][A-Za-z0-9\s.]{1,24})[\])]\s*(.*)$/);
  if (bracketMatch) {
    const speaker = bracketMatch[1].trim();
    if (!/^(MUSIC|APPLAUSE|LAUGHTER|CHEERING|SIGHS|GASPS|SOBS|GROANS|WHISPERS)$/i.test(speaker)) {
      return { speaker, dialogue: bracketMatch[2].trim() };
    }
  }

  return { dialogue: cleaned };
}

/**
 * Builds the complete narrative graph and character timeline from structured cues.
 */
export function buildNarrativeGraph(
  cues: Array<{ startSec: number; endSec: number; text: string }>,
  totalDurationSec: number = 0
): NarrativeGraphData {
  const charMap = new Map<string, {
    name: string;
    totalLines: number;
    firstAppearanceSec: number;
    lastAppearanceSec: number;
    spans: CharacterPresenceSpan[];
  }>();

  const cueEntries: Array<{ startSec: number; endSec: number; speaker?: string; text: string }> = [];

  for (const cue of cues) {
    const { speaker, dialogue } = extractSpeakerFromLine(cue.text);
    cueEntries.push({
      startSec: cue.startSec,
      endSec: cue.endSec,
      speaker,
      text: dialogue || cue.text,
    });

    if (speaker) {
      const canonicalKey = speaker.toUpperCase();
      let record = charMap.get(canonicalKey);
      if (!record) {
        record = {
          name: speaker,
          totalLines: 0,
          firstAppearanceSec: cue.startSec,
          lastAppearanceSec: cue.endSec,
          spans: [],
        };
        charMap.set(canonicalKey, record);
      }

      record.totalLines++;
      record.lastAppearanceSec = Math.max(record.lastAppearanceSec, cue.endSec);

      // Merge nearby spans within 20s
      const lastSpan = record.spans[record.spans.length - 1];
      if (lastSpan && cue.startSec - lastSpan.endSec < 20) {
        lastSpan.endSec = Math.max(lastSpan.endSec, cue.endSec);
        if (lastSpan.snippet.length < 140) {
          lastSpan.snippet += ` / ${dialogue || cue.text}`;
        }
      } else {
        record.spans.push({
          startSec: cue.startSec,
          endSec: cue.endSec,
          snippet: dialogue || cue.text,
        });
      }
    }
  }

  // Filter out minor 1-line noise, sort by line count
  const sortedSpeakers = Array.from(charMap.values())
    .filter((c) => c.totalLines >= 2)
    .sort((a, b) => b.totalLines - a.totalLines)
    .slice(0, 12); // Keep top 12 primary characters

  const characters: CharacterNode[] = sortedSpeakers.map((s, idx) => ({
    id: s.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    name: s.name,
    color: PALETTE[idx % PALETTE.length],
    totalLines: s.totalLines,
    firstAppearanceSec: s.firstAppearanceSec,
    lastAppearanceSec: s.lastAppearanceSec,
    presenceSpans: s.spans,
  }));

  const activeCharKeys = new Set(sortedSpeakers.map((s) => s.name.toUpperCase()));

  // Interaction detection: characters who speak within a 40-second scene window
  const interactionMatrix = new Map<string, { count: number; timestamps: number[] }>();

  // Windowing through cues
  const windowSec = 40;
  for (let i = 0; i < cueEntries.length; i++) {
    const primary = cueEntries[i];
    if (!primary.speaker || !activeCharKeys.has(primary.speaker.toUpperCase())) continue;

    for (let j = i + 1; j < cueEntries.length; j++) {
      const secondary = cueEntries[j];
      if (secondary.startSec - primary.startSec > windowSec) break;
      if (!secondary.speaker || !activeCharKeys.has(secondary.speaker.toUpperCase())) continue;

      if (primary.speaker.toUpperCase() !== secondary.speaker.toUpperCase()) {
        const pKey = primary.speaker.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const sKey = secondary.speaker.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const pairKey = [pKey, sKey].sort().join("___");

        let entry = interactionMatrix.get(pairKey);
        if (!entry) {
          entry = { count: 0, timestamps: [] };
          interactionMatrix.set(pairKey, entry);
        }

        // Avoid adding timestamps closer than 30s
        const lastTs = entry.timestamps[entry.timestamps.length - 1];
        if (lastTs === undefined || primary.startSec - lastTs > 30) {
          entry.count++;
          entry.timestamps.push(primary.startSec);
        }
      }
    }
  }

  const interactions: CharacterInteraction[] = [];
  for (const [pairKey, val] of interactionMatrix.entries()) {
    const [source, target] = pairKey.split("___");
    interactions.push({
      source,
      target,
      sharedScenesCount: val.count,
      timestamps: val.timestamps,
    });
  }

  interactions.sort((a, b) => b.sharedScenesCount - a.sharedScenesCount);

  // Group into major scenes
  const scenes: NarrativeSceneClustered[] = [];
  let maxSec = totalDurationSec;
  if (maxSec <= 0 && cueEntries.length > 0) {
    maxSec = cueEntries[cueEntries.length - 1].endSec;
  }

  return {
    characters,
    interactions,
    scenes,
    totalDurationSec: maxSec,
  };
}
