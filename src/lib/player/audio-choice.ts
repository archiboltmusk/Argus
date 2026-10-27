import type { TrackInfo } from "./bridge";

export type PlaybackAudioChoice = Pick<
  TrackInfo,
  "id" | "lang" | "title" | "codec" | "channels" | "channelCount"
>;

export function playbackAudioChoice(track: TrackInfo): PlaybackAudioChoice {
  return {
    id: track.id,
    lang: track.lang,
    title: track.title ?? track.label,
    codec: track.codec,
    channels: track.channels,
    channelCount: track.channelCount,
  };
}

export function selectPlaybackAudio(
  tracks: TrackInfo[],
  saved?: PlaybackAudioChoice,
): TrackInfo | null {
  if (!saved) return null;
  const normalize = (value?: string) => (value ?? "").trim().toLowerCase();
  // mpv may publish "aac" first and enrich it to "AAC (Advanced Audio
  // Coding)" after decoder initialization. The description is not an identity.
  const codec = (value?: string) =>
    normalize(value)
      .replace(/\s*\([^)]*\)/g, "")
      .replace(/[^a-z0-9]/g, "");
  const channelsMatch = (track: TrackInfo) => {
    if (track.channelCount !== saved.channelCount) return false;
    const current = normalize(track.channels);
    const previous = normalize(saved.channels);
    if (current === previous) return true;
    // An unselected mpv decoder can expose unknown2 until selection resolves
    // the same two channels to stereo. Only trust that placeholder when its
    // own count agrees with both snapshots; distinct known layouts stay distinct.
    const count = saved.channelCount;
    if (count == null || !Number.isInteger(count) || count <= 0) return false;
    return current === `unknown${count}` || previous === `unknown${count}`;
  };
  const matches = tracks.filter(
    (track) =>
      normalize(track.lang) === normalize(saved.lang) &&
      normalize(track.title ?? track.label) === normalize(saved.title) &&
      codec(track.codec) === codec(saved.codec) &&
      channelsMatch(track),
  );
  return matches.length === 1
    ? matches[0]
    : (matches.find((track) => track.id === saved.id) ?? null);
}

/**
 * Intelligent Audio Track Scorer:
 * Scores and auto-selects the optimal master audio track when no manual pick exists.
 * - Heavily prioritizes original master audio (Dolby Atmos, TrueHD, DTS-HD MA, 5.1/7.1 Surround).
 * - Strongly deprioritizes commentary tracks, audio descriptions, and voiceovers.
 */
export function scoreAudioTrack(track: TrackInfo, preferredLang = "eng"): number {
  let score = 0;
  const label = `${track.title ?? ""} ${track.label ?? ""}`.toLowerCase();
  const lang = (track.lang ?? "").toLowerCase();

  // Commentary & Audio Description penalties
  if (label.includes("commentary") || label.includes("director") || label.includes("cast")) {
    return -100;
  }
  if (label.includes("descriptive") || label.includes("audio description") || label.includes("visual impaired") || label.includes("sdh")) {
    return -80;
  }

  // Language match bonus
  if (lang === preferredLang.toLowerCase() || (preferredLang === "eng" && (lang === "en" || lang === "eng"))) {
    score += 50;
  }

  // Surround & Master audio formats bonus
  const channelCount = track.channelCount ?? (track.channels?.includes("7.1") ? 8 : track.channels?.includes("5.1") ? 6 : 2);
  if (channelCount >= 8) score += 30; // 7.1 / Atmos
  else if (channelCount >= 6) score += 20; // 5.1 Surround

  const codec = (track.codec ?? "").toLowerCase();
  if (codec.includes("truehd") || codec.includes("atmos")) score += 25;
  else if (codec.includes("dts-hd") || codec.includes("dts")) score += 20;
  else if (codec.includes("eac3") || codec.includes("ddp") || codec.includes("ac3")) score += 15;
  else if (codec.includes("flac") || codec.includes("opus")) score += 12;

  return score;
}

export function pickBestAudioTrack(tracks: TrackInfo[], preferredLang = "eng"): TrackInfo | null {
  const audioTracks = tracks.filter((t) => t.kind === "audio");
  if (audioTracks.length === 0) return null;
  if (audioTracks.length === 1) return audioTracks[0];

  let bestTrack: TrackInfo | null = null;
  let bestScore = -Infinity;

  for (const track of audioTracks) {
    const s = scoreAudioTrack(track, preferredLang);
    if (s > bestScore) {
      bestScore = s;
      bestTrack = track;
    }
  }

  return bestTrack;
}
