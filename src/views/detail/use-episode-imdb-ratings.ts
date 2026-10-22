import { useEffect, useMemo, useState } from "react";
import { argusImdbEpisodes } from "@/lib/providers/argus-imdb";
import { omdbSeasonRatings } from "@/lib/providers/omdb";

export function useEpisodeImdbRatings(imdbId: string | null, season: number, omdbKey: string) {
  const key = JSON.stringify([imdbId, season, omdbKey]);
  const [result, setResult] = useState({
    key: "",
    argus: new Map<string, number>(),
    omdb: new Map<string, number>(),
  });
  useEffect(() => {
    let cancelled = false;
    // The two sources answer in whatever order the network gives them, so keep them apart and rank
    // them when read, Argus first, matching src/lib/imdb-rating.ts. Merging in arrival order would
    // make the badge depend on which request happened to finish last.
    const publish = (source: "argus" | "omdb", ratings: Map<string, number>) => {
      const valid = new Map<string, number>();
      for (const [coordinate, rating] of ratings) {
        if (Number.isFinite(rating) && rating > 0 && rating <= 10) valid.set(coordinate, rating);
      }
      if (cancelled || valid.size === 0) return;
      setResult((previous) => {
        const held = previous.key === key ? previous : null;
        return {
          key,
          argus: source === "argus" ? valid : (held?.argus ?? new Map<string, number>()),
          omdb: source === "omdb" ? valid : (held?.omdb ?? new Map<string, number>()),
        };
      });
    };
    if (imdbId?.match(/^tt\d+$/)) {
      // Independent requests: a retired Argus server must not hold up OMDb.
      void argusImdbEpisodes(imdbId)
        .then((ratings) => publish("argus", ratings))
        .catch(() => {});
      if (omdbKey && season >= 1) {
        void omdbSeasonRatings(omdbKey, imdbId, season)
          .then((ratings) =>
            publish(
              "omdb",
              new Map([...ratings].map(([ep, rating]) => [`${season}:${ep}`, rating])),
            ),
          )
          .catch(() => {});
      }
    }
    return () => {
      cancelled = true;
    };
  }, [key, imdbId, season, omdbKey]);
  return useMemo(() => {
    if (result.key !== key) return new Map<string, number>();
    return new Map([...result.omdb, ...result.argus]);
  }, [result, key]);
}
