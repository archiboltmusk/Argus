/**
 * Argus Nexus Autonomous AI Subtitle & Speech-to-Text Copilot
 *
 * Runs on-device Whisper transcription to generate verbatim English subtitles
 * on the fly for raw anime, regional Indian cinema, or restored deleted scenes
 * that lack official SRT/VTT subtitle tracks.
 *
 * Upgrades:
 * - Speaker Diarization / Multi-Color Character Subtitles
 * - Night Dialogue Booster & Explosion Dynamic Range Compressor
 * - Bilingual Dual Subtitles (Foreign transcript + English translation)
 */

import { stripSubtitleAds, type SubCue } from "@/lib/subtitles/parser";

export interface SpeechTranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  confidence: number;
  speakerId?: number;
  sourceText?: string; // Foreign source transcript for bilingual mode
}

export interface DialogueAudioFilterSettings {
  fanNoiseReduction: boolean;
  dialogueBoostDb: number; // +3 to +9 dB
  highPassCutoffHz: number; // cuts low rumble below 100Hz
  nightCompressorEnabled?: boolean;
}

export const DEFAULT_DIALOGUE_FILTER: DialogueAudioFilterSettings = {
  fanNoiseReduction: true,
  dialogueBoostDb: 6,
  highPassCutoffHz: 120,
  nightCompressorEnabled: true,
};

export const SPEAKER_COLOR_PALETTE = [
  "#FDE047", // Lead 1: Warm Golden Yellow
  "#67E8F9", // Lead 2: Electric Cyan
  "#FDA4AF", // Supporting: Rose Coral
  "#A7F3D0", // Supporting: Soft Mint
  "#DDD6FE", // Ambient / Other: Lavender
];

export function getSpeakerColor(speakerIndex: number): string {
  const bounded = Math.abs(speakerIndex) % SPEAKER_COLOR_PALETTE.length;
  return SPEAKER_COLOR_PALETTE[bounded];
}

export interface EnhancedSubCue extends SubCue {
  speakerColor?: string;
  sourceText?: string;
}

/**
 * Converts raw Whisper transcription segments into clean, ad-stripped SubCue subtitle tracks
 * with speaker diarization coloring.
 */
export function convertWhisperSegmentsToCues(
  segments: SpeechTranscriptionSegment[],
  enableDiarization: boolean = true,
): EnhancedSubCue[] {
  const cues: EnhancedSubCue[] = [];
  let currentSpeaker = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const raw = seg.text?.trim() ?? "";
    if (
      !raw ||
      raw === "..." ||
      raw === "." ||
      raw === "-" ||
      raw.startsWith("[_") ||
      raw.startsWith("<|")
    ) {
      continue;
    }

    const cleanedText = stripSubtitleAds(raw);
    if (!cleanedText) continue;

    // Detect speaker changes based on punctuation breaks or explicit speakerId
    if (typeof seg.speakerId === "number") {
      currentSpeaker = seg.speakerId;
    } else if (i > 0 && segments[i - 1]) {
      const prev = segments[i - 1];
      const gap = seg.start - prev.end;
      if (gap > 1.2 || raw.startsWith("-") || raw.startsWith("—")) {
        currentSpeaker = (currentSpeaker + 1) % SPEAKER_COLOR_PALETTE.length;
      }
    }

    cues.push({
      start: seg.start,
      end: seg.end,
      text: cleanedText,
      speakerColor: enableDiarization ? getSpeakerColor(currentSpeaker) : undefined,
      sourceText: seg.sourceText ? stripSubtitleAds(seg.sourceText) : undefined,
    });
  }

  return cues.sort((a, b) => a.start - b.start);
}

/**
 * Generates audio filter parameters for MPV or Web Audio to isolate dialogue
 * and compress loud explosions for peaceful night-time viewing.
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
  // 3. acompressor (tames explosions and elevates whispers)
  const filters: string[] = [];

  if (cfg.fanNoiseReduction) {
    filters.push(`highpass=f=${cfg.highPassCutoffHz}`);
  }

  if (cfg.dialogueBoostDb > 0) {
    filters.push(`equalizer=f=3000:t=q:w=1.5:g=${cfg.dialogueBoostDb}`);
  }

  if (cfg.nightCompressorEnabled) {
    filters.push("acompressor=threshold=0.12:ratio=7:attack=20:release=350,speechnorm=e=5:r=0.0001:l=1");
  }

  return {
    afString: filters.join(","),
    centerGain: cfg.dialogueBoostDb,
  };
}
