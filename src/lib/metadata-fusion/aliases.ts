import { loadStoredSettings } from "@/lib/settings/load";
import { get as tmdbGet } from "@/lib/providers/tmdb/tmdb-client";
import { tmdbIdFromImdb } from "@/lib/providers/tmdb/tmdb-imdb-resolve";
import { tvmazeShow } from "@/lib/providers/tvmaze";
import { safeFetch } from "@/lib/safe-fetch";
import { uniqueTitles } from "@/lib/title-match";
import { parseAnilistSynonyms, parseTmdbAliases, parseTvmazeAkas } from "./alias-parsers";

const KEY = "argus.aliases.v1";
const MAX = 200;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

type Entry = { at: number; titles: string[] };
let cache: Map<string, Entry> | null = null;
const inflight = new Map<string, Promise<string[]>>();

function load(): Map<string, Entry> {
  if (cache) return cache;
  cache = new Map();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Array<[string, Entry]>;
    for (const [k, v] of raw) cache.set(k, v);
  } catch {
    // unreadable cache is just a miss
  }
  return cache;
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...load()].slice(-MAX)));
  } catch {
    // storage full or blocked
  }
}

export function cachedAliases(imdbId?: string | null): string[] {
  if (!imdbId) return [];
  const e = load().get(imdbId);
  return e && Date.now() - e.at < TTL_MS ? e.titles : [];
}

async function fromTmdb(imdbId: string, type: "movie" | "series"): Promise<string[]> {
  const key = loadStoredSettings().tmdbKey;
  if (!key) return [];
  const id = await tmdbIdFromImdb(key, imdbId, type);
  const m = id?.match(/^tmdb:(movie|tv):(\d+)$/);
  if (!m) return [];
  const data = await tmdbGet<unknown>(key, `${m[1]}/${m[2]}/alternative_titles`);
  return parseTmdbAliases(data);
}

async function fromTvmaze(imdbId: string): Promise<string[]> {
  const show = await tvmazeShow(imdbId);
  if (!show) return [];
  const r = await safeFetch(`https://api.tvmaze.com/shows/${show.id}/akas`);
  return r.ok ? [show.name, ...parseTvmazeAkas(await r.json())] : [show.name];
}

async function fromAnilist(title: string): Promise<string[]> {
  const r = await safeFetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query:
        "query($s:String){Media(search:$s,type:ANIME){title{romaji english native} synonyms}}",
      variables: { s: title },
    }),
  });
  return r.ok ? parseAnilistSynonyms(await r.json()) : [];
}

// Alternate and regional titles from every enabled metadata source, merged
// under the IMDb id. Failures in one source never block the others.
export function loadAliases(
  imdbId: string | undefined,
  title: string,
  type: "movie" | "series",
  isAnime: boolean,
): Promise<string[]> {
  if (!imdbId || !loadStoredSettings().metadataFusion) return Promise.resolve([]);
  const hit = cachedAliases(imdbId);
  if (hit.length) return Promise.resolve(hit);
  const pending = inflight.get(imdbId);
  if (pending) return pending;
  const p = Promise.allSettled([
    fromTmdb(imdbId, type),
    type === "series" ? fromTvmaze(imdbId) : Promise.resolve([] as string[]),
    isAnime ? fromAnilist(title) : Promise.resolve([] as string[]),
  ])
    .then((rs) => {
      const titles = uniqueTitles(
        rs.flatMap((r) => (r.status === "fulfilled" ? r.value : [])),
      ).filter((t) => t.length <= 120);
      if (titles.length) {
        load().set(imdbId, { at: Date.now(), titles });
        persist();
      }
      return titles;
    })
    .finally(() => inflight.delete(imdbId));
  inflight.set(imdbId, p);
  return p;
}
