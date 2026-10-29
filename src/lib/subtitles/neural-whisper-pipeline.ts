/**
 * On-Device Neural Subtitle Whisper Pipeline
 *
 * Provides offline speech-to-text subtitle generation for regional cinema (Bengali, Hindi,
 * Tamil, Telugu) and rare vintage archives that lack SRT/VTT subtitle files on OpenSubtitles/Subscene.
 */

export interface WhisperModelProfile {
  id: string;
  name: string;
  sizeMb: number;
  accuracy: "fast" | "balanced" | "high";
  supportedLanguages: string[];
  quantizedFormat: "onnx" | "coreml" | "ggml";
}

export const WHISPER_MODELS: WhisperModelProfile[] = [
  {
    id: "whisper-tiny-indic",
    name: "Whisper Tiny (Indic Optimized)",
    sizeMb: 75,
    accuracy: "fast",
    supportedLanguages: ["bn", "hi", "en", "ta", "te"],
    quantizedFormat: "onnx",
  },
  {
    id: "whisper-base-indic",
    name: "Whisper Base (High Intelligibility)",
    sizeMb: 145,
    accuracy: "balanced",
    supportedLanguages: ["bn", "hi", "en", "ta", "te", "mr", "gu"],
    quantizedFormat: "coreml",
  },
];

export interface SubtitleGenerationTask {
  mediaId: string;
  audioTrackIndex: number;
  targetLanguage: "bn" | "hi" | "en";
  modelId: string;
  timestampSec: number;
}

export function createWhisperTask(
  mediaId: string,
  targetLanguage: "bn" | "hi" | "en" = "en",
  modelId = "whisper-tiny-indic",
): SubtitleGenerationTask {
  return {
    mediaId,
    audioTrackIndex: 0,
    targetLanguage,
    modelId,
    timestampSec: Date.now() / 1000,
  };
}
