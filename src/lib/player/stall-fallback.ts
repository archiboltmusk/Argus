import type { ScoredStream, Resolution } from "@/lib/streams/types";
import type { DebridStore } from "@/lib/debrid/types";
import { isStreamDead } from "@/lib/dead-streams";
import { getHostScoreBonus } from "@/lib/streams/host-health";

export const STALL_TIMEOUT_MS = 8000;

const RESOLUTION_LADDER_ORDER: Record<string, number> = {
  "4K": 4,
  "1080p": 3,
  "720p": 2,
  "480p": 1,
  SD: 0,
};

function resolutionRank(res?: Resolution | null): number {
  if (!res) return 2.5; // Unknown default between 720p and 1080p
  return RESOLUTION_LADDER_ORDER[res] ?? 2.5;
}

export function isStreamPlayable(
  stream: ScoredStream,
  debrids: DebridStore[],
): boolean {
  // If the stream has been flagged dead or stubbed, don't consider it playable
  if (isStreamDead(stream)) {
    return false;
  }

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
  currentUrl: string | undefined | null,
  currentInfoHash: string | null | undefined,
  debrids: DebridStore[],
): ScoredStream | null {
  // First priority: Same torrent file / infoHash, but resolved via alternate healthy Debrid provider
  if (currentInfoHash && currentUrl) {
    const sameTorrent = candidates.find(
      (s) =>
        s.infoHash &&
        s.infoHash.toLowerCase() === currentInfoHash.toLowerCase() &&
        s.url &&
        s.url !== currentUrl &&
        isStreamPlayable(s, debrids),
    );
    if (sameTorrent) return sameTorrent;
  }

  // Find the currently playing stream to reference its resolution for intelligent downshifting
  const currentStream = candidates.find(
    (s) =>
      (currentUrl && s.url && s.url === currentUrl) ||
      (currentInfoHash && s.infoHash && s.infoHash.toLowerCase() === currentInfoHash.toLowerCase()),
  );
  const currentResRank = currentStream ? resolutionRank(currentStream.resolution) : 3; // Default 1080p rank

  // Filter playable alternate candidates
  const eligible = candidates.filter((s) => {
    if (currentInfoHash && s.infoHash && s.infoHash.toLowerCase() === currentInfoHash.toLowerCase()) {
      return false;
    }
    if (currentUrl && s.url && s.url === currentUrl) {
      return false;
    }
    return isStreamPlayable(s, debrids);
  });

  if (eligible.length === 0) return null;

  // Smart Adaptive Downshift Sorting:
  // When a stream stalls, preferring a stream with <= current resolution prevents
  // failing over to an even heavier 4K stream that will stall immediately.
  // Combines resolution adaptation with CDN host health bonus.
  const sorted = eligible.slice().sort((a, b) => {
    const aRank = resolutionRank(a.resolution);
    const bRank = resolutionRank(b.resolution);

    // Penalize streams heavier than the one that just stalled
    const aExcessPenalty = aRank > currentResRank ? 40 : 0;
    const bExcessPenalty = bRank > currentResRank ? 40 : 0;

    const aHostBonus = getHostScoreBonus(a.url);
    const bHostBonus = getHostScoreBonus(b.url);

    const scoreA = a.score - aExcessPenalty + aHostBonus;
    const scoreB = b.score - bExcessPenalty + bHostBonus;

    return scoreB - scoreA;
  });

  return sorted[0] ?? null;
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
