import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerSnapshot } from "@/lib/player/bridge";
import type { PlayerSrc } from "@/lib/view";
import type { DebridStore } from "@/lib/debrid/types";
import type { ScoredStream } from "@/lib/streams/types";
import { isLocalUrl } from "@/lib/player/local-url";
import { peekPickerCache } from "@/lib/picker-cache";
import { prepareCachedDebridStreams } from "@/lib/debrid/playback-preparation";
import { prewarmCandidateStream } from "@/lib/streams/prewarm-candidate";
import { recordHostFailure, recordHostThroughput } from "@/lib/streams/host-health";
import { markStreamDead, SOFT_STALL_TTL_MS } from "@/lib/dead-streams";
import {
  evaluateStallStatus,
  findNextFallbackStream,
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

  // Circuit breaker: Rate limit automatic failovers (max 3 auto-swaps per 60 seconds)
  const autoSwapTimestampsRef = useRef<number[]>([]);
  // Seek grace period: protect user scrubs from being mistaken for stalls
  const seekGraceUntilRef = useRef<number>(0);

  // Reset tracking on source change & pre-resolve hot standby fallback stream
  useEffect(() => {
    lastProgressAtRef.current = Date.now();
    lastPosRef.current = snap.positionSec;
    setStallOffer(null);
    switchingRef.current = false;
    dismissedUntilRef.current = 0;

    // Hot Standby Stream: As soon as a stream starts playing, quietly pre-resolve
    // the #1 next best fallback stream into cache so any future failover is instant (0ms delay)
    if (!src.isLive && !inRoom) {
      const cacheEntry = peekPickerCache(src.meta, src.episode);
      const candidates = cacheEntry?.result?.picker?.all ?? [];
      const currentHash = src.streamRef?.infoHash;
      const standby = findNextFallbackStream(candidates, src.url, currentHash, debrids);
      if (standby) {
        if (standby.url) {
          // Pre-warm connection for direct HTTPS / HTTP streams
          prewarmCandidateStream(standby);
        } else if (debrids.length > 0) {
          const hint = src.episode
            ? { season: src.episode.season ?? null, episode: src.episode.episode ?? null }
            : undefined;
          const ac = new AbortController();
          void prepareCachedDebridStreams([standby], debrids, hint, ac.signal).catch(() => {});
        }
      }
    }
  }, [src.url, src.meta, src.episode, src.isLive, inRoom, src.streamRef?.infoHash, debrids]);

  // Track decoded frame / position advancement and buffer recovery
  useEffect(() => {
    const pos = snap.positionSec;
    const delta = Math.abs(pos - lastPosRef.current);
    // User manual seek detected: position jump > 2.0s without continuous frames
    if (delta > 2.0) {
      seekGraceUntilRef.current = Date.now() + 8000;
      lastProgressAtRef.current = Date.now();
      setStallOffer(null);
    }
    const progressAdvance = delta > 0.1 || snap.lastDecodedFrameAt;
    const bufferHealthy = snap.bufferedSec >= 1.5;

    if (progressAdvance) {
      lastPosRef.current = pos;
      lastProgressAtRef.current = Date.now();
      // Record healthy steady playback advancement for host EWMA
      if (src.url && snap.status === "playing" && pos > 5) {
        recordHostThroughput(src.url, 15);
      }
    }

    // Elastic Recovery: If the video resumed decoding frames OR buffer is healthy again,
    // immediately cancel any pending stall offer so momentary speed drops don't switch links!
    if ((progressAdvance || bufferHealthy) && !switchingRef.current) {
      setStallOffer(null);
    }
  }, [snap.positionSec, snap.lastDecodedFrameAt, snap.bufferedSec, snap.status, src.url]);

  // Periodic stall evaluator (runs every 500ms while active)
  useEffect(() => {
    const isLiveStream = src.isLive || /\.m3u8(\?|#|$)/i.test(src.url) || src.url.includes("/live/");
    if (isLiveStream || inRoom || isLocalUrl(src.url)) return;
    if (snap.status === "paused" || snap.status === "ended") {
      lastProgressAtRef.current = Date.now();
      setStallOffer(null);
      return;
    }

    const interval = window.setInterval(() => {
      const now = Date.now();
      if (now < dismissedUntilRef.current || now < seekGraceUntilRef.current || switchingRef.current) return;

      const stall = evaluateStallStatus({
        status: snap.status,
        buffering: snap.buffering,
        coreIdle: snap.coreIdle,
        lastDecodedFrameAt: snap.lastDecodedFrameAt,
        lastProgressAt: lastProgressAtRef.current,
        now,
        stallTimeoutMs: autoSwitchEnabled ? 8000 : 12000,
        bufferedSec: snap.bufferedSec,
      });

      if (stall.isStalled) {
        // Query candidate streams from picker cache
        const cacheEntry = peekPickerCache(src.meta, src.episode);
        const candidates = cacheEntry?.result?.picker?.all ?? [];
        const currentHash = src.streamRef?.infoHash;
        const nextStream = findNextFallbackStream(candidates, src.url, currentHash, debrids);

        // Circuit Breaker Check: Check how many auto-swaps occurred in the last 60 seconds
        const oneMinuteAgo = now - 60_000;
        autoSwapTimestampsRef.current = autoSwapTimestampsRef.current.filter((ts) => ts > oneMinuteAgo);
        const circuitBreakerTripped = autoSwapTimestampsRef.current.length >= 3;

        // If circuit breaker is tripped, offer manual switch without auto countdown so it doesn't loop
        const canAutoSwitch = autoSwitchEnabled && nextStream && !circuitBreakerTripped;

        setStallOffer((prev) => {
          if (prev) return prev;
          return {
            nextStream,
            secondsLeft: canAutoSwitch ? 1 : null,
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
    snap.bufferedSec,
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
        autoSwapTimestampsRef.current.push(Date.now());
        // Record host failure for EWMA algorithmic scoring
        if (src.url) {
          recordHostFailure(src.url);
        }
        // Soft Cooldown (90s): Mark stream stalled with a 90-second soft cooldown so temporary speed drops
        // do not permanently ban links that recover later
        if (src.streamRef) {
          markStreamDead(src.streamRef, "playback-stalled", SOFT_STALL_TTL_MS);
        } else if (src.url) {
          markStreamDead({ url: src.url }, "playback-stalled", SOFT_STALL_TTL_MS);
        }
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
    autoSwapTimestampsRef.current.push(Date.now());
    if (src.url) {
      recordHostFailure(src.url);
    }
    if (src.streamRef) {
      markStreamDead(src.streamRef, "playback-stalled", SOFT_STALL_TTL_MS);
    } else if (src.url) {
      markStreamDead({ url: src.url }, "playback-stalled", SOFT_STALL_TTL_MS);
    }
    void onSwitchStream(target).finally(() => {
      switchingRef.current = false;
    });
  }, [stallOffer, onSwitchStream, openSwitcher, src.streamRef, src.url]);

  return {
    stallOffer,
    acceptOffer,
    dismissOffer,
  };
}
