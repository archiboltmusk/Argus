import { useEffect, useRef, useState, type RefObject } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type { PlayerBridge } from "@/lib/player/bridge";
import type { PlayerSnapshot } from "@/lib/player/bridge";
import type { PlayerSrc } from "@/lib/view";
import type { Settings } from "@/lib/settings";
import { fetchAndParse, type SubCue } from "@/lib/subtitles/parser";
import { applySync } from "@/lib/subtitles/text-sync";
import { toSrt, toVtt } from "@/lib/subtitles/serialize";
import { estimateSubtitleOffset, type AutoSyncResult } from "@/lib/subtitles/auto-sync";
import { setSyncStatus } from "@/lib/subtitles/sync-status";
import { readSyncCache, syncCacheKey, writeSyncCache } from "@/lib/subtitles/sync-cache";

export type AutoSyncStatus = "idle" | "analyzing" | "synced" | "declined" | "error";

export function useAutoSync(params: {
  bridgeRef: RefObject<PlayerBridge | null>;
  src: PlayerSrc;
  snap: PlayerSnapshot;
  engine: "html5" | "mpv";
  settings: Settings;
}) {
  const { bridgeRef, src, snap, engine, settings } = params;
  const [status, setStatus] = useState<AutoSyncStatus>("idle");
  const doneKeyRef = useRef<string | null>(null);
  useEffect(() => {
    doneKeyRef.current = null;
    setStatus("idle");
    setSyncStatus("idle");
  }, [src.url]);

  useEffect(() => {
    if (!settings.subtitleAutoSync || engine !== "mpv") return;
    if (isLoopback(src.url)) return;
    if (snap.durationSec < 60) return;
    const selected = snap.subtitleTracks.find((t) => t.selected);
    if (!selected || !selected.external) return;
    if (selected.title?.startsWith("Synced (")) return;
    const key = `${src.url}|${selected.id}`;
    if (doneKeyRef.current === key) return;
    doneKeyRef.current = key;

    const stale = () => doneKeyRef.current !== key;
    void (async () => {
      const b = bridgeRef.current;
      if (!b) return;
      const cues = await loadCues(b);
      if (stale() || !cues || cues.length < 4) return;
      const cacheKey = syncCacheKey(src.url, b.getSelectedTrackUrl(), cues.length);
      const cached = readSyncCache(cacheKey);
      if (cached) {
        try {
          await applyResult(b, cues, cached, formatOf(b));
          if (!stale()) {
            setStatus("synced");
            setSyncStatus("synced");
          }
        } catch {
          if (!stale()) {
            setStatus("error");
            setSyncStatus("error");
          }
        }
        return;
      }
      setStatus("analyzing");
      setSyncStatus("analyzing");
      try {
        const result = await estimateSubtitleOffset({
          mediaUrl: src.url,
          headers: src.headers,
          cues: cues.map((c) => [c.start, c.end] as [number, number]),
          durationSec: snap.durationSec,
          infoHash: null,
        });
        if (stale()) return;
        if (!result) {
          setStatus("declined");
          setSyncStatus("declined");
          return;
        }
        writeSyncCache(cacheKey, result);
        await applyResult(b, cues, result, formatOf(b));
        if (!stale()) {
          setStatus("synced");
          setSyncStatus("synced");
        }
      } catch (e) {
        console.warn("[auto-sync] failed", e);
        if (!stale()) {
          setStatus("error");
          setSyncStatus("error");
        }
      }
    })();
  }, [
    settings.subtitleAutoSync,
    engine,
    src.url,
    src.headers,
    snap.subtitleTracks,
    snap.durationSec,
    bridgeRef,
  ]);

  return status;
}

function isLoopback(url: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])[:/]/i.test(url);
}

async function loadCues(b: PlayerBridge): Promise<SubCue[] | null> {
  const inline = b.getSelectedTrackCues();
  if (inline && inline.length > 0) return inline;
  const raw = b.getSelectedTrackUrl();
  if (!raw) return null;
  const readable = /^(https?|blob|data|tauri|asset):/i.test(raw) ? raw : safeConvert(raw);
  if (!readable) return null;
  try {
    return await fetchAndParse(readable);
  } catch {
    return null;
  }
}

function safeConvert(url: string): string | null {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    try {
      return convertFileSrc(url);
    } catch {
      return null;
    }
  }
  return null;
}

function formatOf(b: PlayerBridge): "srt" | "vtt" {
  const url = b.getSelectedTrackUrl() ?? "";
  return /\.vtt(\?|#|$)/i.test(url) ? "vtt" : "srt";
}

async function applyResult(
  b: PlayerBridge,
  cues: SubCue[],
  r: AutoSyncResult,
  fmt: "srt" | "vtt",
) {
  if (Math.abs(r.offsetSec) < 0.25 && Math.abs(r.ratio - 1) < 0.003 && !(r.anchors ?? []).length)
    return;
  const anchors = r.anchors ?? [];
  const shift = (t: number) => {
    const fitted = t * r.ratio + r.offsetSec;
    return fitted + residualAt(anchors, fitted) - t;
  };
  const finalCues = applySync(cues, shift, 0);
  const text = fmt === "vtt" ? toVtt(finalCues) : toSrt(finalCues);
  const pathMod = await import("@tauri-apps/api/path");
  const dir = await pathMod.join(await pathMod.tempDir(), "argus-subs");
  const filePath = await pathMod.join(dir, `autosync-${Date.now()}.${fmt}`);
  await invoke("save_text_file", { path: filePath, contents: text });
  await b.addSubtitle(filePath, undefined, `Synced (${fmt.toUpperCase()})`, true);
  b.setSubDelay(0);
}

/** Linear interpolation of per-segment residuals; flat before the first and after the last anchor. */
function residualAt(anchors: Array<[number, number]>, t: number): number {
  if (anchors.length === 0) return 0;
  if (t <= anchors[0][0]) return anchors[0][1];
  for (let i = 1; i < anchors.length; i++) {
    const [t1, o1] = anchors[i];
    if (t <= t1) {
      const [t0, o0] = anchors[i - 1];
      return o0 + ((o1 - o0) * (t - t0)) / Math.max(1e-6, t1 - t0);
    }
  }
  return anchors[anchors.length - 1][1];
}
