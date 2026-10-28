import { useSyncExternalStore } from "react";

export type StreamFeedbackType = "upvote" | "downvote";

export type DownvoteReason =
  | "wrong-movie" // e.g. same title / same year confusion or mockbuster
  | "bad-audio-sync"
  | "hardcoded-ads-or-subs"
  | "cam-rip-fake"
  | "dead-or-buffering"
  | "low-quality";

export type StreamRatingRecord = {
  upvotes: number;
  downvotes: number;
  reasons: Record<DownvoteReason, number>;
  userVote?: StreamFeedbackType;
  userReason?: DownvoteReason;
  lastUpdated: number;
};

const STORAGE_KEY = "argus:stream-ratings:v1";

type RatingsStore = Record<string, StreamRatingRecord>;

export const DEFAULT_RATING_RECORD: StreamRatingRecord = Object.freeze({
  upvotes: 0,
  downvotes: 0,
  reasons: {
    "wrong-movie": 0,
    "bad-audio-sync": 0,
    "hardcoded-ads-or-subs": 0,
    "cam-rip-fake": 0,
    "dead-or-buffering": 0,
    "low-quality": 0,
  },
  lastUpdated: 0,
});

let cache: RatingsStore | null = null;
const listeners = new Set<() => void>();

function getStreamKey(stream: { infoHash?: string; url?: string; title?: string }): string {
  if (stream.infoHash) return stream.infoHash.toLowerCase();
  if (stream.url) {
    try {
      const u = new URL(stream.url);
      return `${u.hostname}${u.pathname}`.toLowerCase();
    } catch {
      return stream.url.toLowerCase();
    }
  }
  return (stream.title ?? "unknown").toLowerCase();
}

function readStore(): RatingsStore {
  if (cache) return cache;
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      cache = raw ? (JSON.parse(raw) as RatingsStore) : {};
    } else {
      cache = {};
    }
  } catch {
    cache = {};
  }
  return cache;
}

function commitStore(store: RatingsStore): void {
  cache = store;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
  } catch (e) {
    console.warn("[stream-ratings] failed to save ratings", e);
  }
  for (const l of listeners) l();
}

export function subscribeRatings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStreamRating(stream: { infoHash?: string; url?: string; title?: string }): StreamRatingRecord {
  const store = readStore();
  const key = getStreamKey(stream);
  return store[key] ?? DEFAULT_RATING_RECORD;
}

export function rateStream(
  stream: { infoHash?: string; url?: string; title?: string },
  type: StreamFeedbackType,
  reason?: DownvoteReason,
): void {
  const store = { ...readStore() };
  const key = getStreamKey(stream);
  const current = store[key] ?? {
    upvotes: 0,
    downvotes: 0,
    reasons: {
      "wrong-movie": 0,
      "bad-audio-sync": 0,
      "hardcoded-ads-or-subs": 0,
      "cam-rip-fake": 0,
      "dead-or-buffering": 0,
      "low-quality": 0,
    },
    lastUpdated: Date.now(),
  };

  // Toggle off if already voted same
  if (current.userVote === type) {
    if (type === "upvote") {
      current.upvotes = Math.max(0, current.upvotes - 1);
    } else {
      current.downvotes = Math.max(0, current.downvotes - 1);
      if (current.userReason && current.reasons[current.userReason]) {
        current.reasons[current.userReason] = Math.max(0, current.reasons[current.userReason] - 1);
      }
    }
    current.userVote = undefined;
    current.userReason = undefined;
  } else {
    // Switching or new vote
    if (current.userVote === "upvote") {
      current.upvotes = Math.max(0, current.upvotes - 1);
    } else if (current.userVote === "downvote") {
      current.downvotes = Math.max(0, current.downvotes - 1);
      if (current.userReason && current.reasons[current.userReason]) {
        current.reasons[current.userReason] = Math.max(0, current.reasons[current.userReason] - 1);
      }
    }

    if (type === "upvote") {
      current.upvotes += 1;
      current.userVote = "upvote";
      current.userReason = undefined;
    } else {
      current.downvotes += 1;
      current.userVote = "downvote";
      if (reason) {
        current.userReason = reason;
        current.reasons[reason] = (current.reasons[reason] ?? 0) + 1;
      }
    }
  }

  current.lastUpdated = Date.now();
  store[key] = current;
  commitStore(store);
}

export function useStreamRating(stream: { infoHash?: string; url?: string; title?: string }): StreamRatingRecord {
  const key = getStreamKey(stream);
  return useSyncExternalStore(
    subscribeRatings,
    () => {
      const store = readStore();
      return store[key] ?? DEFAULT_RATING_RECORD;
    },
    () => DEFAULT_RATING_RECORD,
  );
}

/**
 * Returns score penalty/bonus calculated from community and local ratings
 */
export function calculateRatingScoreAdjustment(stream: { infoHash?: string; url?: string; title?: string }): {
  delta: number;
  isFlaggedWrong: boolean;
  isFlaggedDead: boolean;
  isVerifiedGood: boolean;
} {
  const rating = getStreamRating(stream);
  let delta = 0;

  // Upvotes boost score
  if (rating.upvotes > 0) {
    delta += Math.min(rating.upvotes * 25, 100);
  }

  // Downvotes penalize score heavily
  if (rating.downvotes > 0) {
    delta -= Math.min(rating.downvotes * 60, 300);
  }

  // Specific severe penalties
  const isFlaggedWrong = (rating.reasons["wrong-movie"] ?? 0) > 0;
  if (isFlaggedWrong) {
    delta -= 250; // Massively demote wrong movie / mockbuster
  }

  const isFlaggedDead = (rating.reasons["dead-or-buffering"] ?? 0) > 0 || (rating.reasons["cam-rip-fake"] ?? 0) > 0;
  if (isFlaggedDead) {
    delta -= 200;
  }

  const isVerifiedGood = rating.upvotes >= 2 && rating.downvotes === 0;

  return { delta, isFlaggedWrong, isFlaggedDead, isVerifiedGood };
}
