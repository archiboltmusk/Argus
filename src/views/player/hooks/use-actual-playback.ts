import { useEffect, useRef } from "react";
import {
  capturePlaybackActor,
  playbackSourceKey,
  recordActualPlayback,
  type ActualPlayback,
} from "@/lib/playback-history";
import { actualPlaybackSnapshot } from "@/lib/player/actual-playback";
import { getPlaybackPosition, subscribePlaybackClock } from "@/lib/player/playback-clock";
import type { PlayerSnapshot } from "@/lib/player/bridge";
import type { PlayerSrc } from "@/lib/view";

/** The player, not a menu or a metadata write, owns actual playback recency. */
export function useActualPlayback(src: PlayerSrc, snap: PlayerSnapshot): void {
  const key = `${playbackSourceKey(src)}|${src.meta.id}|${src.episode?.season ?? ""}|${src.episode?.episode ?? ""}`;
  const latest = useRef({ key, src, snap });
  const continuousSince = useRef<number | null>(null);
  const flush = useRef<() => void>(() => {});
  const loaded = useRef({ key, armed: !snap.firstFrameReady });
  if (loaded.current.key !== key) loaded.current = { key, armed: !snap.firstFrameReady };
  if (!snap.firstFrameReady) loaded.current.armed = true;
  latest.current = { key, src, snap };
  useEffect(() => {
    const session = { id: crypto.randomUUID(), actor: capturePlaybackActor() };
    let last: ActualPlayback | null = null;
    let sustained = false;
    let lastMovingAt: number | null = null;
    continuousSince.current = null;
    let lastSavedAt = 0;
    let previousPosition = getPlaybackPosition();
    const save = () => {
      if (last && recordActualPlayback({ ...last, sustained })) lastSavedAt = Date.now();
    };
    const saveCurrent = () => {
      const current = latest.current;
      if (last && current.key === key) {
        last =
          actualPlaybackSnapshot(
            current.src,
            current.snap,
            last.positionMs / 1000,
            session,
            last.playedAt,
          ) ?? last;
      }
      save();
    };
    flush.current = saveCurrent;
    const observe = () => {
      const current = latest.current;
      if (current.key !== key || !loaded.current.armed) return;
      const position = getPlaybackPosition();
      // Buffer/cache updates share the clock subscription. They are not plays.
      if (position === previousPosition) return;
      previousPosition = position;
      const next = actualPlaybackSnapshot(current.src, current.snap, position, session);
      if (!next) return;
      last = next;
      if (
        current.snap.status === "playing" &&
        current.snap.firstFrameReady &&
        !current.snap.buffering
      ) {
        const now = performance.now();
        if (lastMovingAt == null || now - lastMovingAt > 3000) continuousSince.current = now;
        lastMovingAt = now;
        continuousSince.current ??= now;
        if (!sustained && now - continuousSince.current >= 30_000) {
          sustained = true;
          save();
          return;
        }
      } else {
        continuousSince.current = null;
        lastMovingAt = null;
      }
      if (!lastSavedAt || Date.now() - lastSavedAt >= 4000) save();
    };
    const unsubscribe = subscribePlaybackClock(observe);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      unsubscribe();
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", onVisibility);
      saveCurrent();
    };
  }, [key]);
  useEffect(() => {
    if (snap.status !== "playing" || snap.buffering || !snap.firstFrameReady) {
      continuousSince.current = null;
    }
    if (snap.status !== "playing") flush.current();
  }, [snap.status, snap.buffering, snap.firstFrameReady]);
}
