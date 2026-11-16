import { selectPlaybackAudio } from "./audio-choice";
import { normalizeLang } from "@/lib/subtitles/language";
import type { PlayerSnapshot, TrackInfo } from "./bridge";
import type { PlaybackAudioChoice } from "./audio-choice";
export type PlaybackHandoff = {
  id: string;
  title: string;
  mediaId: string;
  mediaType: "movie" | "series";
  url: string;
  positionMs: number;
  createdAt: number;
  season?: number;
  episode?: number;
  audio?: PlaybackAudioChoice;
  subtitle: { off: boolean; lang?: string; title?: string; url?: string };
};
export const HANDOFF_EVENT = "argus:playback-handoff";
export function transferableUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 8192) return false;
  try {
    const u = new URL(value);
    return (
      ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      !/^(localhost|127\.|0\.|\[?::1\]?|169\.254\.)/i.test(u.hostname)
    );
  } catch {
    return false;
  }
}
export function parsePlaybackHandoff(value: unknown, now = Date.now()): PlaybackHandoff | null {
  if (!value || typeof value !== "object") return null;
  const v = value as PlaybackHandoff;
  if (
    !/^[a-zA-Z0-9-]{8,64}$/.test(v.id) ||
    typeof v.title !== "string" ||
    v.title.length > 300 ||
    typeof v.mediaId !== "string" ||
    v.mediaId.length > 300 ||
    !["movie", "series"].includes(v.mediaType) ||
    !transferableUrl(v.url) ||
    !Number.isFinite(v.positionMs) ||
    v.positionMs < 0 ||
    v.positionMs > 7 * 86400_000 ||
    !Number.isFinite(v.createdAt) ||
    now - v.createdAt > 60_000 ||
    v.createdAt > now + 5000
  )
    return null;
  if (!v.subtitle || typeof v.subtitle.off !== "boolean") return null;
  if (
    [v.subtitle.lang, v.subtitle.title].some(
      (s) => s !== undefined && (typeof s !== "string" || s.length > 300),
    ) ||
    (v.subtitle.url !== undefined && !transferableUrl(v.subtitle.url))
  )
    return null;
  if (v.season !== undefined && (!Number.isInteger(v.season) || v.season < 0)) return null;
  if (v.episode !== undefined && (!Number.isInteger(v.episode) || v.episode < 1)) return null;
  if (
    v.audio &&
    (typeof v.audio.id !== "string" ||
      v.audio.id.length > 100 ||
      [v.audio.lang, v.audio.title, v.audio.codec, v.audio.channels].some(
        (s) => s !== undefined && (typeof s !== "string" || s.length > 300),
      ))
  )
    return null;
  return {
    id: v.id,
    title: v.title,
    mediaId: v.mediaId,
    mediaType: v.mediaType,
    url: v.url,
    positionMs: v.positionMs,
    createdAt: v.createdAt,
    season: v.season,
    episode: v.episode,
    audio: v.audio
      ? {
          id: v.audio.id,
          lang: v.audio.lang,
          title: v.audio.title,
          codec: v.audio.codec,
          channels: v.audio.channels,
          channelCount: v.audio.channelCount,
        }
      : undefined,
    subtitle: {
      off: v.subtitle.off,
      lang: v.subtitle.lang,
      title: v.subtitle.title,
      url: v.subtitle.url,
    },
  };
}
/** The receiver must explicitly accept and acknowledge decoded playback. Sending bytes is not success. */
export function sendPlaybackHandoff(
  address: string,
  payload: PlaybackHandoff,
  makeSocket = (url: string) => new WebSocket(url),
): Promise<boolean> {
  const target = new URL(`http://${address}`);
  if (
    target.username ||
    target.password ||
    target.pathname !== "/" ||
    target.search ||
    target.hash ||
    !target.hostname
  )
    return Promise.resolve(false);
  return new Promise((resolve) => {
    const ws = makeSocket(`ws://${target.host}/api/remote`);
    const timer = setTimeout(() => done(false), 45_000);
    let finished = false;
    function done(ok: boolean) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      ws.close();
      resolve(ok);
    }
    ws.onopen = () =>
      ws.send(JSON.stringify({ t: "cmd", command: { action: "handoffPlayback", payload } }));
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data));
        if (message.t === "handoff-result" && message.id === payload.id) done(message.ok === true);
      } catch {
        /* unrelated frame */
      }
    };
    ws.onerror = () => done(false);
    ws.onclose = () => done(false);
  });
}

export function selectHandoffAudio(
  tracks: TrackInfo[],
  audio?: PlaybackAudioChoice,
): TrackInfo | null {
  const exact = selectPlaybackAudio(tracks, audio);
  if (exact || !audio?.lang) return exact;
  const language = tracks.filter(
    (track) => normalizeLang(track.lang) === normalizeLang(audio.lang),
  );
  const titled = language.filter((track) => (track.title ?? track.label) === audio.title);
  return titled.length === 1 ? titled[0] : language.length === 1 ? language[0] : null;
}
export function handoffPlaybackMatches(
  request: PlaybackHandoff,
  snap: PlayerSnapshot,
  positionSec: number,
): boolean {
  if (
    !snap.firstFrameReady ||
    !["playing", "paused", "ready"].includes(snap.status) ||
    Math.abs(positionSec * 1000 - request.positionMs) >= 5000
  )
    return false;
  const audio = selectHandoffAudio(snap.audioTracks, request.audio);
  if (request.audio && (!audio || !audio.selected)) return false;
  const selected = snap.subtitleTracks.find((track) => track.selected);
  const sub = request.subtitle;
  return sub.off
    ? !selected
    : !!selected &&
        (!sub.lang || normalizeLang(sub.lang) === normalizeLang(selected.lang)) &&
        (!sub.title || !!sub.lang || sub.title === (selected.title ?? selected.label)) &&
        (!sub.url || sub.url === (selected.originalUrl || selected.url));
}
