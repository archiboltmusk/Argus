import { episodeVariantMatch } from "@/lib/streams/episode-file";
import type { ScoredStream } from "@/lib/streams/types";

export function hasExactAutoplayPackFile(
  stream: ScoredStream,
  season: number | null,
  episode: number | null,
): boolean {
  if (!stream.seasonPack || episode == null) return true;
  const filename = stream.behaviorHints?.filename ?? stream.behaviorHints?.fileName;
  return (
    season != null &&
    Number.isInteger(stream.fileIdx) &&
    stream.fileIdx! >= 0 &&
    !!filename &&
    episodeVariantMatch(filename, season, episode)
  );
}

export function isEarlyAutoplaySource(stream: ScoredStream): boolean {
  // Only the resolver for a configured provider can confirm a cache entry.
  // Add-on labels such as “instant” alone do not establish readiness.
  return (
    (!!stream.url && /^https?:\/\//i.test(stream.url)) ||
    Object.values(stream.cacheVerified ?? {}).some(Boolean)
  );
}
