/**
 * Local Whisper & Subtitle Ingestion Engine
 *
 * Ingests local subtitle files (.vtt, .srt) and on-device Whisper JSON transcription output:
 * - Converts raw timestamps (HH:MM:SS,mmm or HH:MM:SS.mmm) into seconds
 * - Cleans dialogue lines, strips HTML/markup tags
 * - Generates high-density word & sentence cues for sub-second seek jumps
 */

import type { TranscriptCue } from "./course-engine";

export interface WhisperSegment {
  id?: number;
  seek?: number;
  start: number;
  end: number;
  text: string;
  tokens?: number[];
  temperature?: number;
  avg_logprob?: number;
}

export interface WhisperJsonOutput {
  text?: string;
  segments: WhisperSegment[];
  language?: string;
}

/**
 * Parses timecode like "01:23:45,678" or "00:15:30.500" into seconds.
 */
export function parseTimestampToSeconds(timeStr: string): number {
  const clean = timeStr.trim().replace(",", ".");
  const parts = clean.split(":");

  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return minutes * 60 + seconds;
  }

  return parseFloat(clean) || 0;
}

/**
 * Parses raw SRT subtitle text into TranscriptCue array.
 */
export function parseSrt(raw: string): TranscriptCue[] {
  const blocks = raw.replace(/\r\n/g, "\n").split(/\n\s*\n/);
  const cues: TranscriptCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue;

    // Check if line 0 is numeric index or timestamp line
    let timeLine = lines[0];
    let textStartIndex = 1;

    if (/^\d+$/.test(lines[0]) && lines[1] && lines[1].includes("-->")) {
      timeLine = lines[1];
      textStartIndex = 2;
    }

    const timeParts = timeLine.split("-->");
    if (timeParts.length !== 2) continue;

    const startSec = parseTimestampToSeconds(timeParts[0]);
    const endSec = parseTimestampToSeconds(timeParts[1]);

    const text = lines
      .slice(textStartIndex)
      .join(" ")
      .replace(/<[^>]+>/g, "") // Strip HTML/formatting tags
      .trim();

    if (text) {
      cues.push({
        startSec: Math.round(startSec * 100) / 100,
        endSec: Math.round(endSec * 100) / 100,
        text,
      });
    }
  }

  return cues;
}

/**
 * Parses raw WebVTT subtitle text into TranscriptCue array.
 */
export function parseVtt(raw: string): TranscriptCue[] {
  const clean = raw.replace(/\r\n/g, "\n").replace(/^WEBVTT[^\n]*\n+/i, "");
  return parseSrt(clean);
}

/**
 * Auto-detects subtitle format and parses into TranscriptCue array.
 */
export function parseSubtitleText(text: string): TranscriptCue[] {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.includes('"segments"')) {
    try {
      const parsed = JSON.parse(trimmed) as WhisperJsonOutput;
      return ingestWhisperJson(parsed);
    } catch {}
  }

  if (trimmed.startsWith("WEBVTT")) {
    return parseVtt(trimmed);
  }

  return parseSrt(trimmed);
}

/**
 * Ingests output from local whisper.cpp or OpenAI Whisper CLI.
 */
export function ingestWhisperJson(json: WhisperJsonOutput): TranscriptCue[] {
  if (!json?.segments || !Array.isArray(json.segments)) {
    return [];
  }

  return json.segments.map((seg) => ({
    startSec: Math.round(seg.start * 100) / 100,
    endSec: Math.round(seg.end * 100) / 100,
    text: seg.text.trim(),
  }));
}

/**
 * Computes words per minute and density stats for local lecture planning.
 */
export function calculateTranscriptStats(cues: TranscriptCue[]): {
  totalWords: number;
  durationMinutes: number;
  wordsPerMinute: number;
} {
  if (cues.length === 0) {
    return { totalWords: 0, durationMinutes: 0, wordsPerMinute: 0 };
  }

  let totalWords = 0;
  for (const c of cues) {
    totalWords += c.text.split(/\s+/).filter(Boolean).length;
  }

  const durationSec = Math.max(0, cues[cues.length - 1].endSec - cues[0].startSec);
  const durationMinutes = Math.max(1, Math.round(durationSec / 60));
  const wordsPerMinute = Math.round(totalWords / durationMinutes);

  return {
    totalWords,
    durationMinutes,
    wordsPerMinute,
  };
}
