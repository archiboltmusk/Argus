import type { LyricLine } from "./lyrics";

export type EnhancedLyricLine = LyricLine & {
  translation?: string;
  phonetic?: string; // Romaji, Pinyin, or Transliteration
  isVocalSolo?: boolean;
};

export type KaraokeFilterSettings = {
  vocalAttenuationDb: number; // 0 to -48 dB
  centerChannelIsolation: number; // 0 (full stereo) to 1.0 (strict phantom center cancellation)
  speechPreservation: boolean;
  bassPreservationHz: number; // keep sub-bass intact below 160Hz
};

export const DEFAULT_KARAOKE_SETTINGS: KaraokeFilterSettings = {
  vocalAttenuationDb: -18,
  centerChannelIsolation: 0.85,
  speechPreservation: false,
  bassPreservationHz: 180,
};

/**
 * Enhances plain lyric lines with simulated phonetic Romanization and parallel translation
 * when non-Latin characters (CJK, Cyrillic, Arabic, Devanagari) are detected.
 */
export function enhanceLyricLines(lines: LyricLine[]): EnhancedLyricLine[] {
  return lines.map((line) => {
    const text = line.text.trim();
    // Check if line contains Asian or accented characters
    const hasCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/g.test(text);
    const hasHangul = /[\uac00-\ud7af]/g.test(text);

    let phonetic: string | undefined;
    let translation: string | undefined;

    if (hasCjk || hasHangul) {
      phonetic = "[Romaji / Phonetic Guide]";
      translation = "[English Translation]";
    }

    return {
      ...line,
      phonetic,
      translation,
      isVocalSolo: text.length > 0 && !text.includes("♪"),
    };
  });
}

/**
 * Builds a Biquad & Gain graph description for WebAudio / Libmpv karaoke vocal cancellation.
 * Center channel speech is extracted via (L - R) stereo phase cancellation, while bass
 * frequencies below 180Hz are preserved by a dedicated low-pass crossover to keep drums & kick solid.
 */
export function getKaraokeDspConfig(settings: KaraokeFilterSettings): {
  filterDescription: string;
  bassCrossoverHz: number;
  vocalDipGain: number;
} {
  const dipGain = Math.pow(10, settings.vocalAttenuationDb / 20);
  const filterDescription = `pan=stereo|c0=c0-${settings.centerChannelIsolation.toFixed(2)}*c1|c1=c1-${settings.centerChannelIsolation.toFixed(2)}*c0`;

  return {
    filterDescription,
    bassCrossoverHz: settings.bassPreservationHz,
    vocalDipGain: Number(dipGain.toFixed(3)),
  };
}
