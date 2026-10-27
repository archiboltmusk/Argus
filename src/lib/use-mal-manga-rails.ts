import { useEffect, useState } from "react";
import { useMal } from "@/lib/mal/provider";
import {
  fetchMalMangaList,
  readCachedMalMangaList,
  type MalMangaEntry,
  type MalMangaGroup,
  type MalMangaStatus,
} from "@/lib/mal/manga-lists";
import type { MangaListRail } from "@/lib/use-anilist-manga-rails";
import type { MangaSummary } from "@/lib/manga/types";

const RAIL_ORDER: Array<{ key: string; title: string; status: MalMangaStatus }> = [
  { key: "reading", title: "Reading", status: "reading" },
  { key: "planning", title: "Plan to Read", status: "plan_to_read" },
  { key: "completed", title: "Completed", status: "completed" },
  { key: "paused", title: "On Hold", status: "on_hold" },
  { key: "dropped", title: "Dropped", status: "dropped" },
];

function entryToSummary(entry: MalMangaEntry): MangaSummary | null {
  if (!entry.manga.title) return null;
  return {
    id: `mal:${entry.manga.id}`,
    title: entry.manga.title,
    cover: entry.manga.mainPicture ?? undefined,
    lastChapter:
      entry.manga.numChapters != null && entry.manga.numChapters > 0
        ? String(entry.manga.numChapters)
        : entry.numChaptersRead > 0
          ? String(entry.numChaptersRead)
          : undefined,
  };
}

function buildRails(groups: MalMangaGroup[]): MangaListRail[] {
  const byStatus = new Map(groups.map((g) => [g.status, g.entries]));
  const out: MangaListRail[] = [];
  for (const rail of RAIL_ORDER) {
    const entries = byStatus.get(rail.status) ?? [];
    const items = entries.map(entryToSummary).filter((x): x is MangaSummary => x != null);
    if (items.length > 0) out.push({ key: rail.key, title: rail.title, items });
  }
  return out;
}

export function useMalMangaRails(): { rails: MangaListRail[]; loading: boolean } {
  const { isConnected, session } = useMal();
  const [rails, setRails] = useState<MangaListRail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !session) {
      setRails([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const seed = readCachedMalMangaList();
    if (seed) setRails(buildRails(seed));
    setLoading(!seed);
    void fetchMalMangaList()
      .then((groups) => {
        if (!cancelled) {
          setRails(buildRails(groups));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, session?.accessToken]);

  return { rails, loading };
}
