// Starting playback: resolve a stream, resume from saved progress, choose
// built-in or external player, and attach addon subtitles.
import { invoke } from "@tauri-apps/api/core";
import { api, type MetaPreview, type RankedStream } from "./api";
import { player } from "./player";

/** What a starting playback is waiting on, shown next to the spinner. */
let stage: string | null = null;
const stageListeners = new Set<() => void>();
const setStage = (v: string | null) => { stage = v; stageListeners.forEach((f) => f()); };
export const playStage = {
  get: () => stage,
  subscribe: (f: () => void) => { stageListeners.add(f); return () => { stageListeners.delete(f); }; },
};

const LOG_HINT = "Logs: ~/Library/Logs/app.argus.desktop/mpv.log";

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let t: number;
  const timeout = new Promise<never>((_, rej) => { t = window.setTimeout(() => rej(new Error(`${what} took longer than ${ms / 1000}s and was stopped. Try another stream. ${LOG_HINT}`)), ms); });
  return Promise.race([p, timeout]).finally(() => window.clearTimeout(t));
}

export type PlayTarget = { item: MetaPreview; videoId: string };

/** Resume point for this exact video, or 0. */
async function resumeAt(profile: number, itemId: string, videoId: string): Promise<number> {
  const cw = await api.continueWatching(profile).catch(() => []);
  const p = cw.find((x) => x.item_id === itemId && x.video_id === videoId);
  return p ? Math.max(0, p.position_s - 3) : 0;
}

export async function play(profile: number, target: PlayTarget, streams: RankedStream[], index: number) {
  try {
    setStage("Resolving the stream (debrid and torrent links can take a moment)…");
    await playInner(profile, target, streams, index);
  } finally {
    setStage(null);
  }
}

async function playInner(profile: number, target: PlayTarget, streams: RankedStream[], index: number) {
  const r = streams[index];
  const url = await withTimeout(api.resolveStream(profile, r.stream), 90_000, "Resolving the stream");
  const start = await resumeAt(profile, target.item.id, target.videoId);
  setStage("Starting the player…");
  const mode = (await api.getSetting(profile, "player.mode")) ?? "builtin";
  if (mode === "external") {
    return invoke<void>("play_external", { profile, url, start });
  }
  try {
    await withTimeout(loadBuiltin(url, start, target, r, streams, index, profile), 30_000, "Starting the built-in player");
  } catch (e) {
    // The built-in player crashed last time or failed to start: hand off to
    // IINA/VLC/the system player so playback still works.
    await invoke<void>("play_external", { profile, url, start });
    throw new Error(
      String(e).includes("BUILTIN_PLAYER_CRASHED")
        ? "Built-in player crashed last time, so this opened in your external player. Retry it in Settings > Player."
        : `Built-in player failed (${e}); opened in your external player.`,
    );
  }
}

async function loadBuiltin(url: string, start: number, target: PlayTarget, r: RankedStream, streams: RankedStream[], index: number, profile: number) {
  await player.load(
    url,
    start,
    {
      profile,
      itemId: target.item.id,
      kind: target.item.type,
      name: target.item.name,
      poster: target.item.poster,
      videoId: target.videoId,
      fileKey: r.stream.infoHash ?? url,
    },
    streams,
    index,
  );
  // Addon subtitles load in the background; mpv adds them as they arrive.
  invoke<{ url: string; lang: string }[]>("subtitles", {
    profile,
    kind: target.item.type,
    id: target.videoId,
    filename: r.stream.behaviorHints?.filename ?? null,
  })
    .then((subs) => subs.slice(0, 30).forEach((s) => player.command({ type: "addSub", url: s.url, lang: s.lang })))
    .catch(() => {});
}

/** Auto-queue: best stream of the next episode, if one has aired. */
export async function playNextEpisode(profile: number): Promise<boolean> {
  const s = player.get().session;
  if (!s || s.kind !== "series") return false;
  const next = await invoke<{ id: string; title: string } | null>("next_episode", { profile, itemId: s.itemId, videoId: s.videoId });
  if (!next) return false;
  const streams = await api.streams(profile, "series", next.id);
  if (!streams.length) return false;
  const item: MetaPreview = { id: s.itemId, type: s.kind, name: s.name, poster: s.poster };
  await play(profile, { item, videoId: next.id }, streams, 0);
  return true;
}
