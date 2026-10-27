import type { ScoredStream } from "@/lib/streams/types";
import type { DebridStore } from "@/lib/debrid/types";
import { isStreamPlayable } from "./stall-fallback";

export type QualityUpgradeReason = {
  betterResolution?: string;
  betterHdr?: string;
  betterAudio?: string;
  isRemux?: boolean;
};

export type QualityUpgradeCandidate = {
  stream: ScoredStream;
  reasons: string[];
  scoreDiff: number;
};

const RES_RANK: Record<string, number> = {
  "4K": 40,
  "1080p": 30,
  "720p": 20,
  "480p": 10,
  SD: 5,
};

const AUDIO_RANK: Record<string, number> = {
  Atmos: 50,
  TrueHD: 45,
  "DTS-HD MA": 40,
  "DD+": 30,
  DTS: 25,
  AC3: 20,
  AAC: 15,
  Opus: 15,
  FLAC: 35,
};

/**
 * Evaluates whether a candidate stream is a meaningful and safe quality upgrade over the currently playing stream.
 * Requires:
 * 1. Must be playable (e.g. cached on user's active debrid or valid direct URL).
 * 2. Must not be a CAM/TS/SCR screener.
 * 3. Must be objectively superior in resolution (e.g. 1080p -> 4K), HDR (SDR -> DV/HDR10), audio (Stereo/DD+ -> Atmos/TrueHD), or REMUX.
 * 4. Overall score must be substantially higher (score delta >= 8).
 */
export function evaluateQualityUpgrade(
  current: ScoredStream | null | undefined,
  candidate: ScoredStream,
  debrids: DebridStore[],
): QualityUpgradeCandidate | null {
  if (!isStreamPlayable(candidate, debrids)) return null;

  // Never upgrade to screeners
  if (
    candidate.source === "CAM" ||
    candidate.source === "TS" ||
    candidate.source === "HDTS" ||
    candidate.source === "TC" ||
    candidate.source === "SCR"
  ) {
    return null;
  }

  const upgradeReasons: string[] = [];

  if (current) {
    const curResRank = RES_RANK[current.resolution ?? "SD"] ?? 10;
    const candResRank = RES_RANK[candidate.resolution ?? "SD"] ?? 10;

    if (candResRank > curResRank) {
      upgradeReasons.push(candidate.resolution ?? "Higher Resolution");
    }

    if (!current.hdrFormat && candidate.hdrFormat) {
      upgradeReasons.push(candidate.hdrFormat);
    } else if (current.hdrFormat === "HDR10" && (candidate.hdrFormat === "DV" || candidate.hdrFormat === "DV+HDR10")) {
      upgradeReasons.push("Dolby Vision");
    }

    const curAudioCodec = current.audio?.codec ?? "";
    const candAudioCodec = candidate.audio?.codec ?? "";
    const curAudioRank = AUDIO_RANK[curAudioCodec] ?? 10;
    const candAudioRank = AUDIO_RANK[candAudioCodec] ?? 10;

    if (candAudioRank > curAudioRank && candAudioRank >= 40) {
      upgradeReasons.push(candAudioCodec);
    } else if ((candidate.audio?.channels ?? 2) >= 6 && (current.audio?.channels ?? 2) < 6) {
      upgradeReasons.push(`${candidate.audio?.channels}.1 Surround`);
    }

    if (!current.remux && candidate.remux) {
      upgradeReasons.push("Lossless REMUX");
    }

    const scoreDiff = (candidate.score ?? 0) - (current.score ?? 0);

    // Require both a tangible audio/video reason and overall score improvement
    if (upgradeReasons.length > 0 && scoreDiff >= 8) {
      return {
        stream: candidate,
        reasons: upgradeReasons,
        scoreDiff,
      };
    }
  } else {
    // If current stream metadata is unknown, check if candidate is 4K HDR / Atmos / Remux
    if (candidate.resolution === "4K") upgradeReasons.push("4K UHD");
    if (candidate.hdrFormat) upgradeReasons.push(candidate.hdrFormat);
    if (candidate.audio?.codec === "Atmos") upgradeReasons.push("Dolby Atmos");
    if (candidate.remux) upgradeReasons.push("REMUX");

    if (upgradeReasons.length > 0) {
      return {
        stream: candidate,
        reasons: upgradeReasons,
        scoreDiff: candidate.score ?? 20,
      };
    }
  }

  return null;
}

/**
 * Searches the picker cache for the single best quality upgrade stream available.
 */
export function findBestQualityUpgrade(
  candidates: ScoredStream[],
  currentStream: ScoredStream | null | undefined,
  currentUrl: string | undefined,
  currentHash: string | null | undefined,
  debrids: DebridStore[],
): QualityUpgradeCandidate | null {
  let bestCandidate: QualityUpgradeCandidate | null = null;

  for (const s of candidates) {
    // Skip current stream
    if (currentHash && s.infoHash && s.infoHash.toLowerCase() === currentHash.toLowerCase()) {
      continue;
    }
    if (currentUrl && s.url && s.url === currentUrl) {
      continue;
    }

    const evaluated = evaluateQualityUpgrade(currentStream, s, debrids);
    if (evaluated) {
      if (!bestCandidate || evaluated.scoreDiff > bestCandidate.scoreDiff) {
        bestCandidate = evaluated;
      }
    }
  }

  return bestCandidate;
}
