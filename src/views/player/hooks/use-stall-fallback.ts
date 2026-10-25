import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerSnapshot } from "@/lib/player/bridge";
import type { PlayerSrc } from "@/lib/view";
import type { DebridStore } from "@/lib/debrid/types";
import type { ScoredStream } from "@/lib/streams/types";
import { isLocalUrl } from "@/lib/player/local-url";
import { peekPickerCache } from "@/lib/picker-cache";
import {
  evaluateStallStatus,
  findNextFallbackStream,
  STALL_TIMEOUT_MS,
} from "@/lib/player/stall-fallback";

export type StallOffer = {
  nextStream: ScoredStream | null;
  secondsLeft: number | null;
};

export function useStallFallback(params: {
  src: PlayerSrc;
  snap: PlayerSnapshot;
  debrids: DebridStore[];
  autoSwitchEnabled: boolean;
  onSwitchStream: (stream: ScoredStream) => Promise<void>;
  openSwitcher: () => void;
  inRoom?: boolean;
}) {
  const {
    src,
    snap,
    debrids,
    autoSwitchEnabled,
    onSwitchStream,
    openSwitcher,
    inRoom = false,
  } = params;

  const [stallOffer, setStallOffer] = useState<StallOffer | null>(null);
  const dismissedUntilRef = useRef<number>(0);
  const lastProgressAtRef = useRef<number>(Date.now());
  const lastPosRef = useRef<number>(snap.positionSec);
  const switchingRef = useRef(false);

  // Reset tracking on source change
  useEffect(() => {
    lastProgressAtRef.current = Date.now();
    lastPosRef.current = snap.positionSec;
    setStallOffer(null);
    switchingRef.current = false;
    dismissedUntilRef.current = 0;
  }, [src.url]);

  // Track decoded frame / position advancement
  useEffect(() => {
    const pos = snap.positionSec;
    if (Math.abs(pos - lastPosRef.current) > 0.1 || snap.lastDecodedFrameAt) {
      lastPosRef.current = pos;
      lastProgressAtRef.current = Date.now();
      // Clear offer if playback resumed on its own
      if (!switchingRef.current) {
        setStallOffer(null);
      }
    }
  }, [snap.positionSec, snap.lastDecodedFrameAt]);

  // Periodic stall evaluator (runs every 500ms while active)
  useEffect(() => {
    if (src.isLive || inRoom || isLocalUrl(src.url)) return;
    if (snap.status === "paused" || snap.status === "ended") {
      lastProgressAtRef.current = Date.now();
      setStallOffer(null);
      return;
    }

    const interval = window.setInterval(() => {
      const now = Date.now();
      if (now < dismissedUntilRef.current || switchingRef.current) return;

      const stall = evaluateStallStatus({
        status: snap.status,
        buffering: snap.buffering,
        coreIdle: snap.coreIdle,
        lastDecodedFrameAt: snap.lastDecodedFrameAt,
        lastProgressAt: lastProgressAtRef.current,
        now,
        stallTimeoutMs: autoSwitchEnabled ? 4000 : STALL_TIMEOUT_MS,
      });

      if (stall.isStalled) {
        // Query candidate streams from picker cache
        const cacheEntry = peekPickerCache(src.meta, src.episode);
        const candidates = cacheEntry?.result?.picker?.all ?? [];
        const currentHash = src.streamRef?.infoHash;
        const nextStream = findNextFallbackStream(candidates, src.url, currentHash, debrids);

        setStallOffer((prev) => {
          if (prev) return prev;
          return {
            nextStream,
            secondsLeft: autoSwitchEnabled && nextStream ? 4 : null,
          };
        });
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [
    src.isLive,
    src.meta,
    src.episode,
    src.streamRef?.infoHash,
    src.url,
    snap.status,
    snap.buffering,
    snap.coreIdle,
    snap.lastDecodedFrameAt,
    debrids,
    autoSwitchEnabled,
    inRoom,
  ]);

  // Countdown timer for auto-switch on timeout
  useEffect(() => {
    if (!stallOffer || stallOffer.secondsLeft == null) return;

    if (stallOffer.secondsLeft <= 0) {
      if (stallOffer.nextStream && !switchingRef.current) {
        switchingRef.current = true;
        setStallOffer(null);
        void onSwitchStream(stallOffer.nextStream).finally(() => {
          switchingRef.current = false;
        });
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setStallOffer((prev) => {
        if (!prev || prev.secondsLeft == null) return null;
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [stallOffer, onSwitchStream]);

  const dismissOffer = useCallback(() => {
    setStallOffer(null);
    dismissedUntilRef.current = Date.now() + 30_000;
  }, []);

  const acceptOffer = useCallback(() => {
    if (!stallOffer?.nextStream) {
      openSwitcher();
      setStallOffer(null);
      return;
    }
    switchingRef.current = true;
    const target = stallOffer.nextStream;
    setStallOffer(null);
    void onSwitchStream(target).finally(() => {
      switchingRef.current = false;
    });
  }, [stallOffer, onSwitchStream, openSwitcher]);

  return {
    stallOffer,
    acceptOffer,
    dismissOffer,
  };
}
