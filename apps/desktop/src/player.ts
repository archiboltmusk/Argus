// Playback clock store, outside React state (Harbor's "re-render every tick"
// freeze). The Rust side already throttles to 4 Hz; components subscribe via
// useSyncExternalStore and re-render only when what they read changes.
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useSyncExternalStore } from "react";
import type { RankedStream } from "./api";

export type Clock = {
  position: number;
  duration: number;
  paused: boolean;
  buffering: boolean;
  bufferPercent: number;
  speed: number;
  subDelayMs: number;
};

export type Track = {
  id: number;
  kind: "audio" | "sub" | "video";
  lang?: string;
  title?: string;
  codec?: string;
  channels?: number;
  forced: boolean;
  default: boolean;
  external: boolean;
};

export type Segment = { kind: "intro" | "recap" | "outro"; start: number; end: number | null };

export type Session = {
  profile: number;
  itemId: string;
  kind: string;
  name: string;
  poster?: string;
  videoId: string;
  fileKey: string;
};

export type PlayerCommand =
  | { type: "togglePause" }
  | { type: "setPause"; paused: boolean }
  | { type: "seek"; seconds: number }
  | { type: "seekRelative"; seconds: number }
  | { type: "setAudio"; id: number }
  | { type: "setSub"; id: number | null }
  | { type: "setSecondarySub"; id: number | null }
  | { type: "subDelayStep"; steps: number }
  | { type: "addSub"; url: string; lang?: string }
  | { type: "setSpeed"; speed: number }
  | { type: "setVolume"; volume: number }
  | { type: "setDownmix"; enabled: boolean }
  | { type: "abLoop"; a: number | null; b: number | null }
  | { type: "screenshot" }
  | { type: "stop" };

type State = {
  visible: boolean;
  clock: Clock;
  tracks: Track[];
  segments: Segment[];
  stalled: boolean;
  ended: { eof: boolean; error?: string } | null;
  /** Ranked streams for this title and which one is playing, for fallback. */
  streams: RankedStream[];
  current: number;
  session: Session | null;
};

const EMPTY_CLOCK: Clock = { position: 0, duration: 0, paused: false, buffering: false, bufferPercent: 0, speed: 1, subDelayMs: 0 };

let state: State = { visible: false, clock: EMPTY_CLOCK, tracks: [], segments: [], stalled: false, ended: null, streams: [], current: 0, session: null };
const subs = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
}

function subscribe(f: () => void) {
  subs.add(f);
  return () => subs.delete(f);
}

let started = false;
/** Wires Rust events into the store once per app run. */
export function startPlayerEvents() {
  if (started) return;
  started = true;
  listen<Clock>("player://clock", (e) => {
    const c = e.payload;
    const prev = state.clock;
    // Skip no-op updates so nothing re-renders while paused.
    if (c.position !== prev.position || c.paused !== prev.paused || c.buffering !== prev.buffering || c.duration !== prev.duration || c.subDelayMs !== prev.subDelayMs || c.speed !== prev.speed) {
      set({ clock: c, stalled: c.buffering ? state.stalled : false });
    }
  });
  listen<Track[]>("player://tracks", (e) => set({ tracks: e.payload }));
  listen<Segment[]>("player://segments", (e) => set({ segments: e.payload }));
  listen<boolean>("player://visible", (e) => {
    document.documentElement.classList.toggle("playing", e.payload);
    set({ visible: e.payload });
  });
  listen("player://stall", () => set({ stalled: true }));
  listen<{ eof: boolean; error?: string }>("player://ended", (e) => set({ ended: e.payload }));
}

export function usePlayer<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

export const player = {
  get: () => state,
  load: (url: string, start: number, session: Session, streams: RankedStream[], current: number) => {
    set({ session, streams, current, stalled: false, ended: null, tracks: [], segments: [], clock: EMPTY_CLOCK });
    return invoke<void>("player_load", { url, start, session });
  },
  command: (command: PlayerCommand) => invoke<void>("player_command", { command }),
  setCurrent: (current: number) => set({ current, stalled: false }),
  clearEnded: () => set({ ended: null }),
};

export function formatTime(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}
