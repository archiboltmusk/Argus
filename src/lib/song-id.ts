import { invoke } from "@tauri-apps/api/core";
import { t } from "@/lib/i18n";

export type SongResult = {
  title: string;
  artist: string;
  album: string;
  artwork: string;
  link: string;
} | null;

export type SongIdToastMsg = {
  kind: "info" | "result" | "error";
  title: string;
  body?: string;
  art?: string;
  href?: string;
  song?: { title: string; artist: string; album: string; artwork: string };
};

const TOAST_EVENT = "argus:song-id-toast";

function toast(msg: SongIdToastMsg): void {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: msg }));
}

export function onSongIdToast(cb: (msg: SongIdToastMsg) => void): () => void {
  const h = (e: Event) => cb((e as CustomEvent<SongIdToastMsg>).detail);
  window.addEventListener(TOAST_EVENT, h);
  return () => window.removeEventListener(TOAST_EVENT, h);
}

export function youtubeSearchUrl(artist: string, title: string): string {
  const q = [artist, title].filter(Boolean).join(" ").trim();
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
}

let busy = false;

export function isIdentifying(): boolean {
  return busy;
}

export type SongIdProvider = "audd" | "ai" | "acoustid";

export type SongIdOptions = {
  provider: SongIdProvider;
  auddKey: string;
  aiKey: string;
  aiModel: string;
  acoustidKey: string;
};

export function songIdOptions(s: {
  songIdProvider: SongIdProvider;
  auddKey?: string;
  songIdAiKey?: string;
  songIdAiModel?: string;
  acoustidKey?: string;
}): SongIdOptions {
  return {
    provider: s.songIdProvider,
    auddKey: s.auddKey ?? "",
    aiKey: s.songIdAiKey ?? "",
    aiModel: s.songIdAiModel ?? "",
    acoustidKey: s.acoustidKey ?? "",
  };
}

const KEY_LABEL: Record<SongIdProvider, () => string> = {
  audd: () => t("Missing AudD key"),
  ai: () => t("Missing Gemini API key"),
  acoustid: () => t("Missing AcoustID key"),
};

function activeKey(opts: SongIdOptions): string {
  const keys: Record<SongIdProvider, string> = {
    audd: opts.auddKey,
    ai: opts.aiKey,
    acoustid: opts.acoustidKey,
  };
  return (keys[opts.provider] ?? "").trim();
}

function reportFailure(e: unknown): void {
  console.error("song-id failed", e);
  const detail = typeof e === "string" ? e : ((e as Error)?.message ?? String(e));
  toast({
    kind: "error",
    title: t("Song identification failed"),
    body: detail.trim().slice(0, 260) || undefined,
  });
}

export async function identifyFile(opts: SongIdOptions): Promise<void> {
  if (busy) return;
  const key = activeKey(opts);
  if (!key) {
    toast({
      kind: "error",
      title: KEY_LABEL[opts.provider](),
      body: t("Add it in Settings → Library & metadata"),
    });
    return;
  }
  const { open } = await import("@tauri-apps/plugin-dialog");
  const picked = await open({
    multiple: false,
    directory: false,
    filters: [
      {
        name: t("Audio and video"),
        extensions: [
          "mp3",
          "flac",
          "m4a",
          "aac",
          "ogg",
          "opus",
          "wav",
          "wma",
          "mp4",
          "mkv",
          "mov",
          "webm",
        ],
      },
    ],
  });
  if (typeof picked !== "string") return;
  busy = true;
  toast({ kind: "info", title: t("Listening…") });
  try {
    showResult(
      await invoke<SongResult>("recognize_file", {
        path: picked,
        provider: opts.provider,
        apiKey: key,
        model: opts.aiModel.trim() || null,
        startSec: null,
      }),
    );
  } catch (e) {
    reportFailure(e);
  } finally {
    busy = false;
  }
}

export interface MovieIdentificationContext {
  movieTitle?: string;
  playbackTimeSec?: number;
  filePath?: string;
}

function showResult(res: SongResult, movieTitle?: string): void {
  const head = res ? res.title || res.artist : "";
  if (!res || !head) {
    toast({ kind: "error", title: t("Couldn't identify the song") });
    return;
  }
  const filmLabel = movieTitle ? ` (from ${movieTitle})` : "";
  const sub = res.title ? [res.artist, res.album].filter(Boolean).join(" · ") : res.album;
  const musicSearchHref = `#/music?search=${encodeURIComponent(`${res.title} ${res.artist}`)}`;

  toast({
    kind: "result",
    title: head,
    body: (sub ? `${sub}${filmLabel}` : movieTitle ? `Soundtrack of ${movieTitle}` : undefined),
    art: res.artwork || undefined,
    href: musicSearchHref,
    song: { title: res.title, artist: res.artist, album: res.album || movieTitle || "", artwork: res.artwork },
  });
}

export async function identifyNowPlaying(
  opts: SongIdOptions,
  context?: MovieIdentificationContext,
): Promise<void> {
  if (busy) return;
  if (opts.provider === "acoustid") {
    toast({
      kind: "error",
      title: t("AcoustID identifies files"),
      body: t("Use Identify a file in Settings, or switch to AudD or Gemini for live playback."),
    });
    return;
  }
  const useAi = opts.provider === "ai";
  const key = activeKey(opts);
  if (!key) {
    toast({
      kind: "error",
      title: KEY_LABEL[opts.provider](),
      body: t("Add it in Settings → Library & metadata"),
    });
    return;
  }
  busy = true;
  toast({ kind: "info", title: t("Listening…") });
  try {
    let res: SongResult = null;
    if (context?.filePath) {
      res = await invoke<SongResult>("recognize_file", {
        path: context.filePath,
        provider: opts.provider,
        apiKey: key,
        model: (opts.aiModel ?? "").trim() || null,
        startSec: context.playbackTimeSec ?? null,
        movieContext: context.movieTitle ?? null,
      });
    } else {
      res = useAi
        ? await invoke<SongResult>("recognize_now_playing_ai", {
            apiKey: key,
            model: (opts.aiModel ?? "").trim() || null,
            seconds: 8,
          })
        : await invoke<SongResult>("recognize_now_playing", { apiToken: key, seconds: 7 });
    }
    showResult(res, context?.movieTitle);
  } catch (e) {
    reportFailure(e);
  } finally {
    busy = false;
  }
}
