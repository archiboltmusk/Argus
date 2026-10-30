/**
 * Seamless Extended Cut & Deleted Scene Splicer Engine for Argus
 *
 * Enables instant playback of reconstructed Extended Cuts, Director's Cuts,
 * and restored deleted scenes without re-encoding massive video files:
 *
 * 1. Generates native MPV `edl://` virtual timelines on the fly.
 * 2. Automatically realigns and shifts subtitle tracks to eliminate drift after insertion points.
 * 3. Merges dedicated deleted-scene subtitle cues seamlessly into the main dialogue stream.
 * 4. Preserves zero-disk-space footprint by referencing source files directly.
 */

import type { SubCue } from "@/lib/subtitles/parser";

export interface DeletedSceneInsertion {
  id: string;
  title: string;
  insertAtSeconds: number; // Timestamp in theatrical cut where scene belongs
  clipPathOrUrl: string; // Path or URL to the deleted scene video file
  durationSeconds: number; // Length of deleted scene
  clipStartOffset?: number; // Start offset inside the deleted scene clip (default 0)
  subtitleCues?: SubCue[]; // Optional subtitle dialogue for the deleted scene
}

export interface ExtendedCutRecipe {
  id: string;
  movieTitle: string;
  editionName: string; // e.g. "Restored Extended Edition" or "Assembly Cut"
  mainMoviePathOrUrl: string;
  mainMovieDurationSeconds: number;
  insertions: DeletedSceneInsertion[];
}

/**
 * Builds an MPV `edl://` virtual timeline URI that chains the main movie segments
 * and deleted scenes together seamlessly without re-encoding.
 *
 * Format: edl://[file1],[start],[length];[file2],[start],[length]...
 */
export function generateMpvEdlUri(recipe: ExtendedCutRecipe): string {
  if (recipe.insertions.length === 0) {
    return recipe.mainMoviePathOrUrl;
  }

  // Sort insertions chronologically by timestamp
  const sorted = [...recipe.insertions].sort((a, b) => a.insertAtSeconds - b.insertAtSeconds);
  const segments: string[] = [];

  let currentMainPos = 0;

  for (const ins of sorted) {
    // 1. Play main movie up to the insertion point
    const mainSegmentLen = ins.insertAtSeconds - currentMainPos;
    if (mainSegmentLen > 0) {
      segments.push(
        `${encodeURIComponent(recipe.mainMoviePathOrUrl)},${currentMainPos.toFixed(3)},${mainSegmentLen.toFixed(3)}`,
      );
      currentMainPos = ins.insertAtSeconds;
    }

    // 2. Play the deleted scene
    const clipStart = ins.clipStartOffset ?? 0;
    segments.push(
      `${encodeURIComponent(ins.clipPathOrUrl)},${clipStart.toFixed(3)},${ins.durationSeconds.toFixed(3)}`,
    );
  }

  // 3. Play the remaining tail of the main movie to the end
  const remainingLen = recipe.mainMovieDurationSeconds - currentMainPos;
  if (remainingLen > 0) {
    segments.push(
      `${encodeURIComponent(recipe.mainMoviePathOrUrl)},${currentMainPos.toFixed(3)},${remainingLen.toFixed(3)}`,
    );
  }

  return `edl://${segments.join(";")}`;
}

/**
 * Calculates the total extended runtime of the reconstructed film.
 */
export function calculateExtendedRuntimeSeconds(recipe: ExtendedCutRecipe): number {
  const added = recipe.insertions.reduce((acc, ins) => acc + ins.durationSeconds, 0);
  return recipe.mainMovieDurationSeconds + added;
}

/**
 * Realigns theatrical subtitle tracks so they stay in perfect sync across the
 * entire film after deleted scenes have been spliced in.
 *
 * For each inserted deleted scene:
 * - Shifts all subsequent main movie dialogue cues by +durationSeconds.
 * - Injects the deleted scene's dialogue cues into the timeline gap.
 */
export function realignSubtitlesForExtendedCut(
  theatricalCues: readonly SubCue[],
  insertions: readonly DeletedSceneInsertion[],
): SubCue[] {
  if (insertions.length === 0) {
    return [...theatricalCues];
  }

  const sortedInsertions = [...insertions].sort((a, b) => a.insertAtSeconds - b.insertAtSeconds);
  const result: SubCue[] = [];

  // Map each theatrical cue to its adjusted timecode
  for (const cue of theatricalCues) {
    let offset = 0;
    for (const ins of sortedInsertions) {
      if (cue.start >= ins.insertAtSeconds) {
        offset += ins.durationSeconds;
      }
    }

    result.push({
      start: cue.start + offset,
      end: cue.end + offset,
      text: cue.text,
    });
  }

  // Inject deleted scene cues with their relative offsets
  let accumulatedShift = 0;
  for (const ins of sortedInsertions) {
    if (ins.subtitleCues && ins.subtitleCues.length > 0) {
      const insertionBaseTime = ins.insertAtSeconds + accumulatedShift;
      for (const sceneCue of ins.subtitleCues) {
        result.push({
          start: insertionBaseTime + sceneCue.start,
          end: insertionBaseTime + sceneCue.end,
          text: sceneCue.text,
        });
      }
    }
    accumulatedShift += ins.durationSeconds;
  }

  // Return chronologically sorted cue list
  return result.sort((a, b) => a.start - b.start);
}

/**
 * Serializes an extended cut recipe to a portable JSON format for sharing with others.
 */
export function exportExtendedCutRecipeJson(recipe: ExtendedCutRecipe): string {
  return JSON.stringify(recipe, null, 2);
}

/**
 * Parses and validates an extended cut recipe JSON string.
 */
export function importExtendedCutRecipeJson(jsonStr: string): ExtendedCutRecipe {
  const parsed = JSON.parse(jsonStr) as Partial<ExtendedCutRecipe>;
  if (!parsed.movieTitle || !parsed.mainMoviePathOrUrl || typeof parsed.mainMovieDurationSeconds !== "number") {
    throw new Error("Invalid extended cut recipe format: missing required metadata.");
  }

  return {
    id: parsed.id || `recipe-${Date.now()}`,
    movieTitle: parsed.movieTitle,
    editionName: parsed.editionName || "Extended Cut",
    mainMoviePathOrUrl: parsed.mainMoviePathOrUrl,
    mainMovieDurationSeconds: parsed.mainMovieDurationSeconds,
    insertions: Array.isArray(parsed.insertions) ? parsed.insertions : [],
  };
}
