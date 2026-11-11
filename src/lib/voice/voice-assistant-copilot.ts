/**
 * Hands-Free Neural Voice Assistant Copilot
 *
 * Real-time voice intent parsing for hands-free player control:
 * Supports "What did they say?" (rewind + instant smart subs), volume,
 * track switching, seek scrubbing, and cinema feature toggling.
 */

export type VoiceIntentType =
  | "WHAT_DID_THEY_SAY"
  | "PLAY_PAUSE"
  | "SEEK"
  | "SKIP_INTRO"
  | "NEXT_EPISODE"
  | "SET_VOLUME"
  | "SWITCH_SUBTITLES"
  | "SWITCH_AUDIO"
  | "TOGGLE_FEATURE"
  | "UNKNOWN";

export interface VoiceIntent {
  type: VoiceIntentType;
  confidence: number;
  rawTranscript: string;
  payload: Record<string, any>;
}

export interface VoiceAssistantConfig {
  wakeWordEnabled: boolean;
  wakeWord: string; // e.g. "hey argus" or "computer"
  whatDidTheySayRewindSec: number; // default: 15
  whatDidTheySaySubsDurationSec: number; // default: 20
  soundFeedbackEnabled: boolean;
}

const STORAGE_KEY = "argus.voice.assistant.v1";

const DEFAULT_CONFIG: VoiceAssistantConfig = {
  wakeWordEnabled: false,
  wakeWord: "hey argus",
  whatDidTheySayRewindSec: 15,
  whatDidTheySaySubsDurationSec: 20,
  soundFeedbackEnabled: true,
};

let configCache: VoiceAssistantConfig | null = null;
const listeners = new Set<(intent: VoiceIntent) => void>();

export function getVoiceAssistantConfig(): VoiceAssistantConfig {
  if (configCache) return configCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    configCache = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    configCache = { ...DEFAULT_CONFIG };
  }
  return configCache ?? DEFAULT_CONFIG;
}

export function updateVoiceAssistantConfig(
  patch: Partial<VoiceAssistantConfig>,
): VoiceAssistantConfig {
  const current = getVoiceAssistantConfig();
  configCache = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configCache));
  } catch {}
  return configCache;
}

export function subscribeVoiceIntents(
  fn: (intent: VoiceIntent) => void,
): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function dispatchVoiceIntent(intent: VoiceIntent): void {
  for (const fn of listeners) {
    try {
      fn(intent);
    } catch {}
  }
}

/**
 * Parses natural language speech transcripts into structured player intents.
 */
export function parseVoiceTranscript(rawText: string): VoiceIntent {
  const clean = rawText.trim().toLowerCase();
  const config = getVoiceAssistantConfig();

  // Strip wake word if present
  let text = clean;
  if (config.wakeWordEnabled && text.startsWith(config.wakeWord)) {
    text = text.slice(config.wakeWord.length).trim();
  }

  // 1. "What did they say?" / "What was that?" -> Rewind + temporary subtitles
  if (
    text.includes("what did they say") ||
    text.includes("what was that") ||
    text.includes("didn't catch that") ||
    text.includes("say again")
  ) {
    return {
      type: "WHAT_DID_THEY_SAY",
      confidence: 0.98,
      rawTranscript: rawText,
      payload: {
        rewindSeconds: config.whatDidTheySayRewindSec,
        subtitlesDurationSec: config.whatDidTheySaySubsDurationSec,
      },
    };
  }

  // 2. Play / Pause / Resume
  if (
    text === "pause" ||
    text.includes("pause video") ||
    text.includes("freeze") ||
    text.includes("stop playback")
  ) {
    return {
      type: "PLAY_PAUSE",
      confidence: 0.95,
      rawTranscript: rawText,
      payload: { action: "pause" },
    };
  }

  if (
    text === "play" ||
    text.includes("resume") ||
    text.includes("start video") ||
    text.includes("keep going")
  ) {
    return {
      type: "PLAY_PAUSE",
      confidence: 0.95,
      rawTranscript: rawText,
      payload: { action: "play" },
    };
  }

  // 3. Skip Intro / Recap
  if (text.includes("skip intro") || text.includes("skip opening") || text.includes("skip recap")) {
    return {
      type: "SKIP_INTRO",
      confidence: 0.96,
      rawTranscript: rawText,
      payload: {},
    };
  }

  // 4. Next Episode
  if (text.includes("next episode") || text.includes("play next")) {
    return {
      type: "NEXT_EPISODE",
      confidence: 0.95,
      rawTranscript: rawText,
      payload: {},
    };
  }

  // 5. Seek / Scrub
  const rewindMatch = text.match(/(?:rewind|go back|back) (?:by )?(\d+) (?:seconds|second|mins|minutes)?/);
  if (rewindMatch) {
    const sec = parseInt(rewindMatch[1], 10);
    return {
      type: "SEEK",
      confidence: 0.92,
      rawTranscript: rawText,
      payload: { offsetSeconds: -sec },
    };
  }

  const forwardMatch = text.match(/(?:fast forward|skip ahead|forward|skip) (?:by )?(\d+) (?:seconds|second|mins|minutes)?/);
  if (forwardMatch) {
    const sec = parseInt(forwardMatch[1], 10);
    return {
      type: "SEEK",
      confidence: 0.92,
      rawTranscript: rawText,
      payload: { offsetSeconds: sec },
    };
  }

  // 6. Volume Control
  if (text.includes("mute") && !text.includes("unmute")) {
    return {
      type: "SET_VOLUME",
      confidence: 0.95,
      rawTranscript: rawText,
      payload: { action: "mute" },
    };
  }
  if (text.includes("unmute")) {
    return {
      type: "SET_VOLUME",
      confidence: 0.95,
      rawTranscript: rawText,
      payload: { action: "unmute" },
    };
  }

  const volumeMatch = text.match(/(?:set volume to|volume) (\d+)(?:%| percent)?/);
  if (volumeMatch) {
    const level = Math.max(0, Math.min(100, parseInt(volumeMatch[1], 10)));
    return {
      type: "SET_VOLUME",
      confidence: 0.94,
      rawTranscript: rawText,
      payload: { volumePercent: level },
    };
  }

  if (text.includes("volume up") || text.includes("louder")) {
    return {
      type: "SET_VOLUME",
      confidence: 0.9,
      rawTranscript: rawText,
      payload: { step: 10 },
    };
  }

  if (text.includes("volume down") || text.includes("quieter") || text.includes("lower volume")) {
    return {
      type: "SET_VOLUME",
      confidence: 0.9,
      rawTranscript: rawText,
      payload: { step: -10 },
    };
  }

  // 7. Subtitles Control
  if (text.includes("turn off subtitle") || text.includes("disable subtitle") || text.includes("hide subtitle")) {
    return {
      type: "SWITCH_SUBTITLES",
      confidence: 0.95,
      rawTranscript: rawText,
      payload: { enabled: false },
    };
  }

  const subLangMatch = text.match(/(?:turn on|enable|switch to|show) ([a-z]+) subtitles?/);
  if (subLangMatch) {
    return {
      type: "SWITCH_SUBTITLES",
      confidence: 0.92,
      rawTranscript: rawText,
      payload: { enabled: true, language: subLangMatch[1] },
    };
  }

  // 8. Audio Track Control
  const audioMatch = text.match(/(?:switch audio to|change audio to|audio in) ([a-z]+)/);
  if (audioMatch) {
    return {
      type: "SWITCH_AUDIO",
      confidence: 0.9,
      rawTranscript: rawText,
      payload: { language: audioMatch[1] },
    };
  }

  // 9. Feature Toggles
  if (text.includes("night mode") || text.includes("night shield")) {
    return {
      type: "TOGGLE_FEATURE",
      confidence: 0.93,
      rawTranscript: rawText,
      payload: { feature: "night-shield" },
    };
  }

  if (text.includes("motion smoothing") || text.includes("frame interpolation")) {
    return {
      type: "TOGGLE_FEATURE",
      confidence: 0.93,
      rawTranscript: rawText,
      payload: { feature: "frame-interpolation" },
    };
  }

  return {
    type: "UNKNOWN",
    confidence: 0.0,
    rawTranscript: rawText,
    payload: {},
  };
}
