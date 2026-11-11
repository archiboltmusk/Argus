/**
 * On-Device Whisper Speech-to-Text & Karaoke Transcription Pipeline
 *
 * Provides local, private neural audio transcription using quantized Whisper models.
 * Generates word-level timestamps for real-time karaoke subtitle highlighting and instant search.
 */

export interface WhisperWord {
  word: string;
  startSec: number;
  endSec: number;
  probability: number;
}

export interface WhisperTranscriptSegment {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  confidence: number;
  words: WhisperWord[];
}

export interface WhisperModelConfig {
  modelSize: "tiny" | "base" | "small";
  language: string; // ISO 639-1 code e.g. "en", "ja", "es", "auto"
  quantization: "q4" | "q5" | "q8" | "fp16";
  enableKaraokeWordTimestamps: boolean;
  temperature: number;
}

const STORAGE_KEY = "argus.ai.whisper_config.v1";

const DEFAULT_CONFIG: WhisperModelConfig = {
  modelSize: "base",
  language: "auto",
  quantization: "q5",
  enableKaraokeWordTimestamps: true,
  temperature: 0.0,
};

let configCache: WhisperModelConfig | null = null;

export function getWhisperModelConfig(): WhisperModelConfig {
  if (configCache) return configCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    configCache = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    configCache = { ...DEFAULT_CONFIG };
  }
  return configCache ?? DEFAULT_CONFIG;
}

export function updateWhisperModelConfig(
  patch: Partial<WhisperModelConfig>,
): WhisperModelConfig {
  const current = getWhisperModelConfig();
  configCache = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configCache));
  } catch {}
  return configCache;
}

/**
 * Resamples and converts raw audio samples into 16kHz mono Float32 PCM required by Whisper.
 */
export function convertAudioToWhisperPcm(
  channelData: Float32Array,
  sourceSampleRate: number,
): Float32Array {
  const targetSampleRate = 16000;
  if (sourceSampleRate === targetSampleRate) {
    return new Float32Array(channelData);
  }

  const ratio = sourceSampleRate / targetSampleRate;
  const newLength = Math.round(channelData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const originalIndex = Math.floor(i * ratio);
    result[i] = channelData[originalIndex] || 0;
  }

  return result;
}

/**
 * Parses raw Whisper transcription tokens and word timestamps into structured segments.
 */
export function parseWhisperOutputToSegments(
  rawTokens: Array<{ text: string; startMs: number; endMs: number; confidence: number }>,
): WhisperTranscriptSegment[] {
  const segments: WhisperTranscriptSegment[] = [];
  let currentWords: WhisperWord[] = [];
  let segmentStartSec = 0;
  let segmentId = 0;

  for (let i = 0; i < rawTokens.length; i++) {
    const tok = rawTokens[i];
    const startSec = tok.startMs / 1000;
    const endSec = tok.endMs / 1000;

    if (currentWords.length === 0) {
      segmentStartSec = startSec;
    }

    currentWords.push({
      word: tok.text.trim(),
      startSec,
      endSec,
      probability: tok.confidence,
    });

    // Segment break on punctuation (. ! ?) or pause > 0.8s
    const isPunctuation = /[.!?]$/.test(tok.text.trim());
    const isLongPause = i < rawTokens.length - 1 && (rawTokens[i + 1].startMs - tok.endMs > 800);

    if (isPunctuation || isLongPause || currentWords.length >= 14 || i === rawTokens.length - 1) {
      const sentenceText = currentWords.map((w) => w.word).join(" ");
      const avgConfidence = currentWords.reduce((acc, w) => acc + w.probability, 0) / currentWords.length;

      segments.push({
        id: `whisper-seg-${segmentId++}`,
        startSec: segmentStartSec,
        endSec,
        text: sentenceText,
        confidence: Math.round(avgConfidence * 100) / 100,
        words: [...currentWords],
      });

      currentWords = [];
    }
  }

  return segments;
}

/**
 * Finds the currently spoken word index in a segment for real-time karaoke highlighting.
 */
export function getActiveKaraokeWordIndex(
  segment: WhisperTranscriptSegment,
  currentSec: number,
): number {
  if (currentSec < segment.startSec || currentSec > segment.endSec) {
    return -1;
  }

  for (let i = 0; i < segment.words.length; i++) {
    const w = segment.words[i];
    if (currentSec >= w.startSec && currentSec <= w.endSec) {
      return i;
    }
  }

  // If between words within the segment, highlight the previous word
  for (let i = segment.words.length - 1; i >= 0; i--) {
    if (currentSec >= segment.words[i].endSec) {
      return i;
    }
  }

  return 0;
}
