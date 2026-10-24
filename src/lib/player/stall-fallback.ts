import type { ScoredStream } from "@/lib/streams/types";
import type { DebridStore } from "@/lib/debrid/types";

export const STALL_TIMEOUT_MS = 3500;

export function isStreamPlayable(
  stream: ScoredStream,
  debrids: DebridStore[],
): boolean {
  // Direct HTTP streams are playable without debrid
  if (!stream.infoHash && stream.url) {
    if (stream.url.startsWith("http://") || stream.url.startsWith("https://")) {
      return true;
    }
  }

  // Torrent streams require active debrid that has cached this stream
  if (stream.infoHash && debrids.length > 0) {
    const cached = stream.cached ?? {};
    return debrids.some((d) => cached[d.slug] === true);
  }

  return false;
}

export function findNextFallbackStream(
  candidates: ScoredStream[],
  currentUrl: string | undefined,
  currentInfoHash: string | null | undefined,
  debrids: DebridStore[],
): ScoredStream | null {
  // First priority: Same torrent file / infoHash, but resolved via alternate healthy Debrid provider
  if (currentInfoHash) {
    const sameTorrent = candidates.find(
      (s) =>
        s.infoHash &&
        s.infoHash.toLowerCase() === currentInfoHash.toLowerCase() &&
        s.url !== currentUrl &&
        isStreamPlayable(s, debrids),
    );
    if (sameTorrent) return sameTorrent;
  }

  // Second priority: Alternate candidate streams
  for (const s of candidates) {
    // Skip current stream by info hash
    if (currentInfoHash && s.infoHash && s.infoHash.toLowerCase() === currentInfoHash.toLowerCase()) {
      continue;
    }
    // Skip current stream by URL
    if (currentUrl && s.url && s.url === currentUrl) {
      continue;
    }

    if (isStreamPlayable(s, debrids)) {
      return s;
    }
  }

  return null;
}

export type StallState = {
  isStalled: boolean;
  stalledDurationMs: number;
  reason?: "buffering" | "core-idle" | "frozen-clock";
};

export function evaluateStallStatus(params: {
  status: string;
  buffering: boolean;
  coreIdle?: boolean;
  lastDecodedFrameAt?: number;
  lastProgressAt: number;
  now: number;
  stallTimeoutMs?: number;
}): StallState {
  const {
    status,
    buffering,
    coreIdle = false,
    lastDecodedFrameAt = 0,
    lastProgressAt,
    now,
    stallTimeoutMs = STALL_TIMEOUT_MS,
  } = params;

  // Manual pause or ended playback is never considered a stall
  if (status === "paused" || status === "ended" || status === "idle") {
    return { isStalled: false, stalledDurationMs: 0 };
  }

  // 1. mpv paused-for-cache event active
  if (buffering) {
    const dur = Math.max(0, now - lastProgressAt);
    return {
      isStalled: dur >= stallTimeoutMs,
      stalledDurationMs: dur,
      reason: "buffering",
    };
  }

  // 2. mpv core-idle active while in playing state
  if (coreIdle && status === "playing") {
    const dur = Math.max(0, now - lastProgressAt);
    return {
      isStalled: dur >= stallTimeoutMs,
      stalledDurationMs: dur,
      reason: "core-idle",
    };
  }

  // 3. Time elapsed since last decoded frame or position progress
  const referenceTime = Math.max(lastProgressAt, lastDecodedFrameAt);
  if (status === "playing" && referenceTime > 0) {
    const dur = now - referenceTime;
    if (dur >= stallTimeoutMs) {
      return {
        isStalled: true,
        stalledDurationMs: dur,
        reason: "frozen-clock",
      };
    }
  }

  return { isStalled: false, stalledDurationMs: 0 };
}
