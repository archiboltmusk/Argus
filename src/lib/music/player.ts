import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";
import { getCover } from "./library";
import type { Track } from "./types";

export type RepeatMode = "off" | "all" | "one";

export type PlayerState = {
  queue: Track[];
  index: number;
  playing: boolean;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  error: string | null;
};

const PREFS_KEY = "argus.music.prefs.v1";

const MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  m4b: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg; codecs=vorbis",
  oga: "audio/ogg; codecs=vorbis",
  opus: "audio/ogg; codecs=opus",
  wav: "audio/wav",
  aif: "audio/aiff",
  aiff: "audio/aiff",
};

function loadPrefs(): Pick<PlayerState, "volume" | "shuffle" | "repeat"> {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    return {
      volume: typeof p.volume === "number" ? Math.min(1, Math.max(0, p.volume)) : 0.8,
      shuffle: !!p.shuffle,
      repeat: p.repeat === "all" || p.repeat === "one" ? p.repeat : "off",
    };
  } catch {
    return { volume: 0.8, shuffle: false, repeat: "off" };
  }
}

let state: PlayerState = {
  queue: [],
  index: -1,
  playing: false,
  position: 0,
  duration: 0,
  error: null,
  ...loadPrefs(),
};
const listeners = new Set<() => void>();
let audio: HTMLAudioElement | null = null;
let loadToken = 0;

function emit(patch: Partial<PlayerState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function savePrefs(): void {
  try {
    const { volume, shuffle, repeat } = state;
    localStorage.setItem(PREFS_KEY, JSON.stringify({ volume, shuffle, repeat }));
  } catch {
    /* ignore */
  }
}

export function usePlayer(): PlayerState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export function currentTrack(s: PlayerState = state): Track | null {
  return s.queue[s.index] ?? null;
}

function el(): HTMLAudioElement {
  if (audio) return audio;
  const a = new Audio();
  a.preload = "auto";
  a.volume = state.volume;
  a.addEventListener("timeupdate", () => emit({ position: a.currentTime }));
  a.addEventListener("durationchange", () => {
    if (Number.isFinite(a.duration)) emit({ duration: a.duration });
  });
  a.addEventListener("play", () => emit({ playing: true }));
  a.addEventListener("pause", () => emit({ playing: false }));
  a.addEventListener("ended", () => advance(true));
  a.addEventListener("error", () => {
    emit({ playing: false, error: "Could not play this file" });
  });
  audio = a;
  bindMediaSession();
  return a;
}

async function sourceFor(track: Track): Promise<string> {
  const a = el();
  const mime = MIME[track.ext];
  if (mime && a.canPlayType(mime) === "") {
    const wav = await invoke<string>("music_playable_path", { path: track.path, id: track.id });
    return convertFileSrc(wav);
  }
  return convertFileSrc(track.path);
}

async function load(track: Track, autoplay: boolean): Promise<void> {
  const token = ++loadToken;
  emit({ error: null, position: 0, duration: track.durationMs / 1000 });
  try {
    const src = await sourceFor(track);
    if (token !== loadToken) return;
    const a = el();
    a.src = src;
    if (autoplay) await a.play();
  } catch (e) {
    if (token === loadToken) emit({ playing: false, error: String(e) });
  }
  void updateMediaSession(track);
}

function bindMediaSession(): void {
  if (!("mediaSession" in navigator)) return;
  const ms = navigator.mediaSession;
  ms.setActionHandler("play", () => void togglePlay(true));
  ms.setActionHandler("pause", () => void togglePlay(false));
  ms.setActionHandler("previoustrack", () => previous());
  ms.setActionHandler("nexttrack", () => next());
  ms.setActionHandler("seekto", (d) => {
    if (typeof d.seekTime === "number") seek(d.seekTime);
  });
}

async function updateMediaSession(track: Track): Promise<void> {
  if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
  const cover = await getCover(track);
  if (currentTrack()?.id !== track.id) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: track.album,
    artwork: cover ? [{ src: cover }] : [],
  });
}

function shuffled<T>(items: T[], first?: T): T[] {
  const rest = items.filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return first === undefined ? rest : [first, ...rest];
}

/** Replaces the queue and starts playing `tracks[start]`. */
export function playTracks(tracks: Track[], start = 0): void {
  if (tracks.length === 0) return;
  const chosen = tracks[start] ?? tracks[0];
  const queue = state.shuffle ? shuffled(tracks, chosen) : tracks;
  emit({ queue, index: queue.indexOf(chosen) });
  void load(chosen, true);
}

export function playQueueIndex(index: number): void {
  const t = state.queue[index];
  if (!t) return;
  emit({ index });
  void load(t, true);
}

export function enqueue(tracks: Track[]): void {
  if (tracks.length === 0) return;
  if (state.queue.length === 0) {
    playTracks(tracks);
    return;
  }
  emit({ queue: [...state.queue, ...tracks] });
}

export function playNext(tracks: Track[]): void {
  if (tracks.length === 0) return;
  if (state.queue.length === 0) {
    playTracks(tracks);
    return;
  }
  const queue = [...state.queue];
  queue.splice(state.index + 1, 0, ...tracks);
  emit({ queue });
}

export function removeFromQueue(index: number): void {
  if (index < 0 || index >= state.queue.length) return;
  const queue = state.queue.filter((_, i) => i !== index);
  if (index === state.index) {
    if (queue.length === 0) return clearQueue();
    const nextIndex = Math.min(index, queue.length - 1);
    emit({ queue, index: nextIndex });
    void load(queue[nextIndex], state.playing);
    return;
  }
  emit({ queue, index: index < state.index ? state.index - 1 : state.index });
}

export function moveInQueue(from: number, to: number): void {
  if (to < 0 || to >= state.queue.length || from === to) return;
  const queue = [...state.queue];
  const [moved] = queue.splice(from, 1);
  queue.splice(to, 0, moved);
  const cur = state.queue[state.index];
  emit({ queue, index: queue.indexOf(cur) });
}

export function clearQueue(): void {
  loadToken++;
  audio?.pause();
  if (audio) audio.removeAttribute("src");
  emit({ queue: [], index: -1, playing: false, position: 0, duration: 0, error: null });
}

export async function togglePlay(want?: boolean): Promise<void> {
  const a = el();
  if (!currentTrack()) return;
  if (!a.src) return void load(currentTrack() as Track, true);
  const play = want ?? a.paused;
  try {
    if (play) await a.play();
    else a.pause();
  } catch (e) {
    emit({ error: String(e) });
  }
}

function advance(fromEnded: boolean): void {
  const { queue, index, repeat } = state;
  if (queue.length === 0) return;
  if (fromEnded && repeat === "one") {
    seek(0);
    void audio?.play();
    return;
  }
  if (index + 1 < queue.length) return playQueueIndex(index + 1);
  if (repeat === "all") return playQueueIndex(0);
  if (fromEnded) emit({ playing: false, position: 0 });
}

export function next(): void {
  advance(false);
}

export function previous(): void {
  if (audio && audio.currentTime > 3) return seek(0);
  if (state.index > 0) playQueueIndex(state.index - 1);
  else if (state.repeat === "all") playQueueIndex(state.queue.length - 1);
  else seek(0);
}

export function seek(seconds: number): void {
  const a = el();
  a.currentTime = Math.max(0, seconds);
  emit({ position: a.currentTime });
}

export function setVolume(v: number): void {
  const volume = Math.min(1, Math.max(0, v));
  el().volume = volume;
  emit({ volume });
  savePrefs();
}

export function setShuffle(on: boolean): void {
  const cur = currentTrack();
  if (on && state.queue.length > 1) {
    const queue = shuffled(state.queue, cur ?? undefined);
    emit({ shuffle: true, queue, index: cur ? 0 : state.index });
  } else {
    emit({ shuffle: on });
  }
  savePrefs();
}

export function cycleRepeat(): void {
  emit({ repeat: state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off" });
  savePrefs();
}
