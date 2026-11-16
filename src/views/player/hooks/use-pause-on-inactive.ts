import { useEffect, useRef } from "react";
import type { PlayerBridge, PlayerSnapshot } from "@/lib/player/bridge";
import { useSettings } from "@/lib/settings";
import { tracePlayback } from "@/lib/player/pause-trace";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export function usePauseOnInactive({
  bridgeRef,
  snapRef,
}: {
  bridgeRef: React.RefObject<PlayerBridge | null>;
  snapRef: React.RefObject<PlayerSnapshot>;
}) {
  const { settings } = useSettings();
  const pauseMinimized = settings.pauseMinimized;
  const pauseUnfocused = settings.pauseUnfocused;
  const autoPausedRef = useRef(false);
  const pausePrefsRef = useRef({ pauseMinimized, pauseUnfocused });
  pausePrefsRef.current = { pauseMinimized, pauseUnfocused };

  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void import("@tauri-apps/api/event").then(({ listen }) =>
      listen<{ focused: boolean; minimized: boolean }>("argus://window-activity", (e) => {
        const prefs = pausePrefsRef.current;
        tracePlayback(
          `window-activity focused=${e.payload.focused} minimized=${e.payload.minimized} pauseMinimized=${prefs.pauseMinimized} pauseUnfocused=${prefs.pauseUnfocused}`,
        );
        window.dispatchEvent(new Event("argus:mpv-force-geom"));
      }).then((u) => {
        if (cancelled) u();
        else unlisten = u;
      }),
    );
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    if (!pauseMinimized && !pauseUnfocused) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void import("@tauri-apps/api/event").then(({ listen }) =>
      listen<{ focused: boolean; minimized: boolean }>("argus://window-activity", (e) => {
        const bridge = bridgeRef.current;
        // Switching to the user's own external mpv window does not mean leaving, so don't pause the playback.
        if (!bridge || bridge.capabilities().external) return;
        const { focused, minimized } = e.payload;
        if (!focused) {
          const shouldPause = minimized ? pauseMinimized : pauseUnfocused;
          if (shouldPause && snapRef.current.status === "playing") {
            autoPausedRef.current = true;
            bridge.pause(`inactive focused=false minimized=${minimized}`);
          }
        } else if (autoPausedRef.current) {
          autoPausedRef.current = false;
          // Smart rewind: rewind ~2.0 seconds on resume so dialogue context is never dropped
          const currentPos = snapRef.current.positionSec;
          if (currentPos > 2.0) {
            bridge.seek(Math.max(0, currentPos - 2.0));
          }
          void bridge.play({ reason: "inactive-resume" });
        }
      }).then((u) => {
        if (cancelled) u();
        else unlisten = u;
      }),
    );
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [bridgeRef, snapRef, pauseMinimized, pauseUnfocused]);

  // Web & browser visibility fallback for attention-aware pause
  useEffect(() => {
    if (isTauri) return;
    if (!pauseMinimized && !pauseUnfocused) return;

    const handleVisibilityChange = () => {
      const bridge = bridgeRef.current;
      if (!bridge) return;

      if (document.hidden) {
        if (snapRef.current.status === "playing") {
          autoPausedRef.current = true;
          bridge.pause("inactive visibility-hidden");
        }
      } else if (autoPausedRef.current) {
        autoPausedRef.current = false;
        const currentPos = snapRef.current.positionSec;
        if (currentPos > 2.0) {
          bridge.seek(Math.max(0, currentPos - 2.0));
        }
        void bridge.play({ reason: "inactive-resume" });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [bridgeRef, snapRef, pauseMinimized, pauseUnfocused]);
}
