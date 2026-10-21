import { useEffect, useState } from "react";
import type { Meta } from "@/lib/cinemeta";
import { useTmdbImdbId } from "@/lib/providers/tmdb";
import { argusImdbTitle } from "@/lib/providers/argus-imdb";

export type LiveImdb = { value: string | undefined; isImdb: boolean };

export function useLiveImdbRating(meta: Meta): LiveImdb {
  const resolved = useTmdbImdbId(meta.id);
  const tt = meta.id.startsWith("tt") ? meta.id : resolved;
  const [argus, setArgus] = useState<string | undefined>(undefined);
  useEffect(() => {
    setArgus(undefined);
    if (!tt || !tt.startsWith("tt")) return;
    let cancelled = false;
    argusImdbTitle(tt)
      .then((r) => {
        if (!cancelled && r != null) setArgus(r.toFixed(1));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tt]);
  if (argus) return { value: argus, isImdb: true };
  if (meta.imdbRating) return { value: meta.imdbRating, isImdb: meta.id.startsWith("tt") };
  return { value: undefined, isImdb: false };
}
