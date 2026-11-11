/**
 * SDH Noise Cleaner (Dialogue-Only Subtitle Filter)
 *
 * Transforms cluttered hearing-impaired subtitles (SDH) into clean, cinematic,
 * dialogue-only subtitles by removing sound-effect brackets, speaker names, and musical notes.
 */

import type { SubCue } from "./parser";

// Matches bracketed non-speech sound effects: [GUNSHOT], [DRAMATIC MUSIC], [DOOR CREAKS]
const SQUARE_BRACKET_SOUNDS = /\[(?![a-z]{2,3}\])[^\]]*\]/gi;

// Matches parenthesized sound effects: (SIGHS), (WHISPERS), (CHUCKLES), (PHONE RINGS)
const PAREN_SOUNDS = /\([A-Z\s,.'-]{3,}\)/g;

// Matches speaker names preceding dialogue: "JOHN:", "OFFICER SMITH:", "NARRATOR (V.O.):"
const SPEAKER_LABEL_REGEX = /^[A-Z0-9\s._'-]+(?:\([A-Z.\s]+\))?:\s*/gm;

// Musical note glyphs indicating background songs
const MUSIC_GLYPHS = /[♪♫♬🎵]+/g;

/**
 * Cleans a single subtitle text string by removing SDH sound descriptors.
 */
export function cleanSdhText(text: string): string {
  if (!text) return "";

  let cleaned = text
    .replace(SQUARE_BRACKET_SOUNDS, "")
    .replace(PAREN_SOUNDS, "")
    .replace(SPEAKER_LABEL_REGEX, "")
    .replace(MUSIC_GLYPHS, "");

  // Clean up residual punctuation or whitespace artifacts
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim().replace(/^[-–—]\s*/, "")) // remove leading dialogue dashes
    .filter((line) => line.length > 0 && !/^[-–—.]+$/.test(line))
    .join("\n")
    .trim();

  return cleaned;
}

/**
 * Filters and sanitizes an entire cue array, dropping cues that consisted solely of sound effects.
 */
export function cleanSdhCues(cues: SubCue[]): SubCue[] {
  const result: SubCue[] = [];

  for (const cue of cues) {
    const cleanedText = cleanSdhText(cue.text);
    if (cleanedText.length > 0) {
      result.push({
        ...cue,
        text: cleanedText,
      });
    }
  }

  return result;
}
