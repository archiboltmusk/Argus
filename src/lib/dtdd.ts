import { safeFetch } from "@/lib/safe-fetch";

const BASE = "https://www.doesthedogdie.com";
const MIN_YES_VOTES = 3;

export type DtddWarning = { name: string; yes: number; no: number; spoiler: boolean };

type SearchItem = { id?: number; name?: string; releaseYear?: string | number; imdbId?: string };
type TopicStat = {
  yesSum?: number;
  noSum?: number;
  topic?: { name?: string; isSpoiler?: boolean };
};

/** Picks the DoesTheDogDie entry for a title. Never guesses between look-alikes. */
export function pickDtddItem(
  items: SearchItem[],
  want: { imdbId?: string | null; title: string; year?: number | null },
): number | null {
  if (want.imdbId) {
    const byImdb = items.find((i) => i.imdbId === want.imdbId);
    if (byImdb?.id != null) return byImdb.id;
  }
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const exact = items.filter(
    (i) =>
      i.id != null &&
      norm(i.name ?? "") === norm(want.title) &&
      (want.year == null || String(i.releaseYear ?? "") === String(want.year)),
  );
  return exact.length === 1 && want.year != null ? (exact[0].id ?? null) : null;
}

/** Keeps topics most voters say apply, strongest first. */
export function parseDtddStats(stats: TopicStat[]): DtddWarning[] {
  return stats
    .map((s) => ({
      name: s.topic?.name?.trim() ?? "",
      yes: s.yesSum ?? 0,
      no: s.noSum ?? 0,
      spoiler: s.topic?.isSpoiler === true,
    }))
    .filter((w) => w.name && w.yes >= MIN_YES_VOTES && w.yes > w.no)
    .sort((a, b) => b.yes - a.yes);
}

const cache = new Map<string, Promise<DtddWarning[]>>();

export function fetchDtddWarnings(
  apiKey: string,
  want: { imdbId?: string | null; title: string; year?: number | null },
): Promise<DtddWarning[]> {
  const key = `${want.imdbId ?? want.title}|${want.year ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const headers = { Accept: "application/json", "X-API-KEY": apiKey };
  const p = (async () => {
    const search = await safeFetch(`${BASE}/dddsearch?q=${encodeURIComponent(want.title)}`, {
      headers,
      signal: AbortSignal.timeout(6000),
    });
    if (!search.ok) throw new Error(`dtdd search ${search.status}`);
    const id = pickDtddItem(((await search.json()) as { items?: SearchItem[] }).items ?? [], want);
    if (id == null) return [];
    const media = await safeFetch(`${BASE}/media/${id}`, { headers, signal: AbortSignal.timeout(6000) });
    if (!media.ok) throw new Error(`dtdd media ${media.status}`);
    return parseDtddStats(((await media.json()) as { topicItemStats?: TopicStat[] }).topicItemStats ?? []);
  })();
  cache.set(key, p);
  p.catch(() => cache.delete(key));
  return p;
}
