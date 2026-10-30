/**
 * Argus Nexus Autonomous AI Subtitle & Speech-to-Text Copilot
 *
 * Runs on-device Whisper transcription to generate verbatim English subtitles
 * on the fly for raw anime, regional Indian cinema, or restored deleted scenes
 * that lack official SRT/VTT subtitle tracks.
 */

import { stripSubtitleAds, type SubCue } from "@/lib/subtitles/parser";

export interface SpeechTranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface DialogueAudioFilterSettings {
  fanNoiseReduction: boolean;
  dialogueBoostDb: number; // +3 to +9 dB
  highPassCutoffHz: number; // cuts low rumble below 100Hz
}

export const DEFAULT_DIALOGUE_FILTER: DialogueAudioFilterSettings = {
  fanNoiseReduction: true,
  dialogueBoostDb: 6,
  highPassCutoffHz: 120,
};

/**
 * Converts raw Whisper transcription segments into clean, ad-stripped SubCue subtitle tracks.
 */
export function convertWhisperSegmentsToCues(
  segments: SpeechTranscriptionSegment[],
): SubCue[] {
  const cues: SubCue[] = [];

  for (const seg of segments) {
    const cleanedText = stripSubtitleAds(seg.text);
    if (!cleanedText) continue;

    cues.push({
      start: seg.start,
      end: seg.end,
      text: cleanedText,
    });
  }

  return cues.sort((a, b) => a.start - b.start);
}

/**
 * Generates audio filter parameters for MPV or Web Audio to isolate dialogue
 * from projector fan hum, low AC rumble, and optical hiss.
 */
export function getDialogueFilterParameters(
  settings: Partial<DialogueAudioFilterSettings> = {},
): {
  afString: string;
  centerGain: number;
} {
  const cfg = { ...DEFAULT_DIALOGUE_FILTER, ...settings };

  // MPV audio filter chain:
  // 1. highpass=f=120 (cuts projector fan rumble)
  // 2. equalizer=f=3000:t=q:w=1.5:g=6 (boosts speech clarity frequencies)
  const filters: string[] = [];

  if (cfg.fanNoiseReduction) {
    filters.push(`highpass=f=${cfg.highPassCutoffHz}`);
  }

  if (cfg.dialogueBoostDb > 0) {
    filters.push(`equalizer=f=3000:t=q:w=1.5:g=${cfg.dialogueBoostDb}`);
  }

  return {
    afString: filters.join(","),
    centerGain: cfg.dialogueBoostDb,
  };
}
