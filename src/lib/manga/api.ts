import { anilistRequest } from "@/lib/anilist/client";
import { setItemWithRecovery } from "@/lib/storage-recovery";
import {
  activeMangaProvider,
  activeMangaSource,
  activeMangaSourceId,
  aggregateSubProviders,
  ensureMangaSources,
  listMangaSources,
} from "./sources";
import {
  routeById,
  streamAll,
  streamAggregateChapters,
  withProviderTag,
} from "./sources/aggregate";
import { mangadexProvider } from "./sources/mangadex";
import { suwayomiSourcesRevision } from "./sources/suwayomi/source-events";
import { mangaLibraryRevision } from "./library-events";
import { loadMangaLangFilter, mangaLangFilterRevision } from "./lang-filter";
import {
  filterSafeManga,
  isAdultManga,
  isAdultTag,
  shouldHideAdultManga,
} from "./model";
import type { MangaChapter, MangaProvider, MangaSummary } from "./types";

export {
  MANGA_PAGE,
  chapterLanguages,
  languageName,
  languageFlag,
  filterSafeManga,
  isAdultManga,
  isAdultTag,
  setHideAdultManga,
  shouldHideAdultManga,
  subscribeHideAdultManga,
  type MangaSummary,
  type MangaChapter,
  type MangaTag,
} from "./model";

type Entry = { at: number; p: Promise<unknown> };
type DiskRecord<T> = { at: number; data: T };
type DiskOpts = { key: string; fresh: number; stale: number };
type CallOpts = { disk?: DiskOpts; timeout?: number; tries?: number };

const cache = new Map<string, Entry>();

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const CALL_TIMEOUT = 12_000;
const PAGES_TIMEOUT = 25_000;
const TRIES = 2;

const DISK_PREFIX = "argus.manga.cache.v2.";
const DISK_MAX_AGE = 7 * DAY;
const POPULAR_DISK = { fresh: 30 * MIN, stale: 6 * HOUR };

function isEmpty(data: unknown): boolean {
  return data == null || (Array.isArray(data) && data.length === 0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Manga source timed out")), ms);
    p.then(
      (v) => {
        window.clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(timer);
        reject(e);
      },
    );
  });
}

async function attempt<T>(run: () => Promise<T>, tries: number, ms: number): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    if (i > 0) await sleep(350 * 2 ** (i - 1));
    try {
      return await withTimeout(run(), ms);
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error("Manga source failed");
}

function diskRead<T>(key: string): DiskRecord<T> | null {
  try {
    const raw = localStorage.getItem(DISK_PREFIX + key);
    if (!raw) return null;
    const rec = JSON.parse(raw) as DiskRecord<T>;
    if (!rec || typeof rec.at !== "number" || isEmpty(rec.data)) return null;
    if (Date.now() - rec.at > DISK_MAX_AGE) return null;
    return rec;
  } catch {
    return null;
  }
}

function diskWrite<T>(key: string, data: T): void {
  if (isEmpty(data)) return;
  try {
    setItemWithRecovery(DISK_PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    return;
  }
}

function settle<T>(key: string, data: T): void {
  cache.set(key, { at: Date.now(), p: Promise.resolve(data) });
}

function remember<T>(key: string, p: Promise<T>, disk: string): Promise<T> {
  const entry: Entry = { at: Date.now(), p };
  cache.set(key, entry);
  p.then(
    (data) => {
      if (isEmpty(data)) {
        if (cache.get(key) === entry) cache.delete(key);
        return;
      }
      if (disk) diskWrite(disk, data);
    },
    () => {
      if (cache.get(key) === entry) cache.delete(key);
    },
  );
  return p;
}

async function cached<T>(
  kind: string,
  parts: string,
  ttl: number,
  run: (p: MangaProvider) => Promise<T>,
  opts: CallOpts = {},
): Promise<T> {
  await ensureMangaSources();
  const sid = activeMangaSourceId();
  const hideFlag = shouldHideAdultManga() ? "sfw" : "all";
  const key = `${sid}|${hideFlag}|${kind}|${parts}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.p as Promise<T>;

  const call = () =>
    attempt(() => run(activeMangaProvider()), opts.tries ?? TRIES, opts.timeout ?? CALL_TIMEOUT);

  if (!opts.disk) return remember(key, call(), "");

  const disk = `${sid}|${hideFlag}|${opts.disk.key}`;
  const rec = diskRead<T>(disk);
  const age = rec ? Date.now() - rec.at : Number.POSITIVE_INFINITY;

  if (rec && age < opts.disk.fresh) {
    settle(key, rec.data);
    return rec.data;
  }

  if (rec && age < opts.disk.stale) {
    settle(key, rec.data);
    void call().then(
      (data) => {
        if (isEmpty(data)) return;
        diskWrite(disk, data);
        settle(key, data);
      },
      () => {},
    );
    return rec.data;
  }

  try {
    return await remember(key, call(), disk);
  } catch (e) {
    if (!rec) throw e;
    settle(key, rec.data);
    return rec.data;
  }
}

export function clearMangaCache(): void {
  cache.clear();
  virtualResolveCache.clear();
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(DISK_PREFIX)) stale.push(k);
    }
    for (const k of stale) localStorage.removeItem(k);
  } catch {
    return;
  }
}

export function popularManga(offset = 0, tagId?: string) {
  const tag = tagId ?? "";
  const revision = suwayomiSourcesRevision();
  return cached(
    "pop2",
    `${revision}|${offset}|${tag}`,
    5 * MIN,
    (p) => p.popular(offset, tagId).then(filterSafeManga),
    {
      tries: 3,
      timeout: 10_000,
      disk: offset === 0 ? { key: `pop2|${revision}|${tag}`, ...POPULAR_DISK } : undefined,
    },
  );
}

export function searchManga(query: string, offset = 0, tagId?: string) {
  return cached(
    "search",
    `${mangaLibraryRevision()}|${query}|${offset}|${tagId ?? ""}`,
    5 * MIN,
    (p) => withProviderTag(p, tagId, (tag) => p.search(query, offset, tag)).then(filterSafeManga),
  );
}

export function searchMangaEverywhere(query: string) {
  const revision = suwayomiSourcesRevision();
  return cached(
    "searchAll",
    `${revision}|${query}`,
    5 * MIN,
    (p) => (p.searchAll?.(query) ?? p.search(query, 0)).then(filterSafeManga),
    {
      tries: 1,
      timeout: 30_000,
    },
  );
}

/** Everywhere search without the stop-on-first-strong-match early exit: slower,
 * but every extension reports, so pickers can show each source's copy. */
export function searchMangaEverywhereExhaustive(query: string) {
  const revision = suwayomiSourcesRevision();
  return cached(
    "searchAllEx",
    `${revision}|${query}`,
    5 * MIN,
    (p) => (p.searchAll?.(query, { exhaustive: true }) ?? p.search(query, 0)).then(filterSafeManga),
    {
      tries: 1,
      timeout: 60_000,
    },
  );
}

/** Search every configured source and return IDs routed back to the source that owns them. */
export async function searchMangaAcrossSources(query: string): Promise<MangaSummary[]> {
  await ensureMangaSources();
  const list = await streamAll(
    (provider) => (provider.searchAll?.(query) ?? provider.search(query, 0)).then(filterSafeManga),
    () => {},
  );
  return filterSafeManga(list);
}

type Chunk = (items: MangaSummary[]) => void;

async function streamOrCall(
  kind: string,
  parts: string,
  ttl: number,
  run: (p: MangaProvider) => Promise<MangaSummary[]>,
  opts: CallOpts,
  onChunk: Chunk,
): Promise<MangaSummary[]> {
  await ensureMangaSources();
  const safeRun = (p: MangaProvider) => run(p).then(filterSafeManga);
  const safeChunk: Chunk = (items) => {
    const clean = filterSafeManga(items);
    if (clean.length) onChunk(clean);
  };
  const sid = activeMangaSourceId();
  const hideFlag = shouldHideAdultManga() ? "sfw" : "all";
  if (sid !== "all") {
    const data = filterSafeManga((await cached(kind, parts, ttl, safeRun, opts)) as MangaSummary[]);
    safeChunk(data);
    return data;
  }

  const key = `${sid}|${hideFlag}|${kind}|${parts}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) {
    const data = filterSafeManga((await hit.p) as MangaSummary[]);
    safeChunk(data);
    return data;
  }

  const disk = opts.disk ? `${sid}|${hideFlag}|${opts.disk.key}` : "";
  if (disk && opts.disk) {
    const rec = diskRead<MangaSummary[]>(disk);
    const age = rec ? Date.now() - rec.at : Number.POSITIVE_INFINITY;
    if (rec && age < opts.disk.fresh) {
      const clean = filterSafeManga(rec.data);
      settle(key, clean);
      safeChunk(clean);
      return clean;
    }
    if (rec && age < opts.disk.stale) {
      const clean = filterSafeManga(rec.data);
      settle(key, clean);
      safeChunk(clean);
      void streamAll(safeRun, () => {}).then((m) => {
        const cleanFresh = filterSafeManga(m);
        if (!cleanFresh.length) return;
        settle(key, cleanFresh);
        diskWrite(disk, cleanFresh);
      });
      return clean;
    }
  }

  const merged = filterSafeManga(await streamAll(safeRun, safeChunk));
  if (merged.length) {
    settle(key, merged);
    if (disk) diskWrite(disk, merged);
  }
  return merged;
}

export function popularMangaStream(offset: number, tagId: string | undefined, onChunk: Chunk) {
  const tag = tagId ?? "";
  return streamOrCall(
    "pop2",
    `${offset}|${tag}`,
    5 * MIN,
    (p) => withProviderTag(p, tagId, (tag) => p.popular(offset, tag)),
    {
      tries: 3,
      timeout: 10_000,
      disk: offset === 0 ? { key: `pop2|${tag}`, ...POPULAR_DISK } : undefined,
    },
    onChunk,
  );
}

export function searchMangaStream(
  query: string,
  offset: number,
  tagId: string | undefined,
  onChunk: Chunk,
) {
  return streamOrCall(
    "search",
    `${mangaLibraryRevision()}|${query}|${offset}|${tagId ?? ""}`,
    5 * MIN,
    (p) => withProviderTag(p, tagId, (tag) => p.search(query, offset, tag)),
    {},
    onChunk,
  );
}

function normTitleKey(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function pickBestTitleMatch(results: MangaSummary[], query: string): MangaSummary | null {
  if (!results.length) return null;
  const key = normTitleKey(query);
  if (!key) return results[0];
  let best = results[0];
  let bestScore = -Infinity;
  for (const r of results) {
    const titles = [r.title, r.altTitle].filter((t): t is string => !!t).map(normTitleKey);
    let score = 0;
    if (titles.some((t) => t === key)) score += 100;
    else if (titles.some((t) => t.startsWith(key) || key.startsWith(t))) score += 55;
    else if (titles.some((t) => t.includes(key) || key.includes(t))) score += 25;
    if (r.cover) score += 5;
    score -= Math.min(...titles.map((t) => Math.abs(t.length - key.length))) / 25;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

const ANILIST_FALLBACK_QUERY = `query ($s: String) {
  Page(perPage: 1) {
    media(search: $s, type: MANGA, isAdult: false) {
      id
      isAdult
      title { english romaji }
      coverImage { extraLarge large }
      startDate { year }
      status
      description(asHtml: false)
      chapters
    }
  }
}`;

async function fetchAnilistFallback(title: string, id: string): Promise<MangaSummary | null> {
  try {
    const data = await anilistRequest<{
      Page?: {
        media?: Array<{
          id: number;
          isAdult?: boolean | null;
          title?: { english?: string | null; romaji?: string | null } | null;
          coverImage?: { extraLarge?: string | null; large?: string | null } | null;
          startDate?: { year?: number | null } | null;
          status?: string | null;
          description?: string | null;
          chapters?: number | null;
        }> | null;
      } | null;
    }>(ANILIST_FALLBACK_QUERY, { s: title }, undefined, true);
    const node = data?.Page?.media?.[0];
    if (!node || node.isAdult) return null;
    const eng = node.title?.english?.trim();
    const rom = node.title?.romaji?.trim();
    const displayTitle = eng || rom || title;
    const altTitle = eng && rom && eng.toLowerCase() !== rom.toLowerCase() ? rom : undefined;
    const description = node.description
      ? node.description
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .trim()
      : undefined;
    return {
      id,
      title: displayTitle,
      altTitle,
      cover: node.coverImage?.extraLarge ?? node.coverImage?.large ?? undefined,
      year: node.startDate?.year ?? undefined,
      status: node.status ? node.status.toLowerCase() : undefined,
      description,
      lastChapter: node.chapters != null ? String(node.chapters) : undefined,
    };
  } catch {
    return null;
  }
}

type VirtualResolved = {
  resolvedId: string | null;
  fallback: MangaSummary | null;
};

const virtualResolveCache = new Map<string, Promise<VirtualResolved>>();

function parseVirtualTitle(id: string): string | null {
  if (id.startsWith("title:")) {
    return decodeURIComponent(id.slice("title:".length)).trim() || null;
  }
  return null;
}

function resolveVirtualManga(id: string): Promise<VirtualResolved> {
  const title = parseVirtualTitle(id);
  if (!title) return Promise.resolve({ resolvedId: id, fallback: null });
  const cacheKey = `${activeMangaSourceId()}|${id}`;
  const hit = virtualResolveCache.get(cacheKey);
  if (hit) return hit;

  const p = (async (): Promise<VirtualResolved> => {
    const fallbackP = fetchAnilistFallback(title, id);

    let match: MangaSummary | null = null;
    const everywhere = await withTimeout(searchMangaEverywhere(title), 7_000).catch(() => []);
    match = pickBestTitleMatch(everywhere, title);

    if (!match) {
      const across = await withTimeout(searchMangaAcrossSources(title), 7_000).catch(() => []);
      match = pickBestTitleMatch(across, title);
    }

    if (!match) {
      const md = await withTimeout(mangadexProvider.search(title, 0), 7_000).catch(() => []);
      const mdMatch = pickBestTitleMatch(md, title);
      if (mdMatch) {
        match = {
          ...mdMatch,
          id: activeMangaSourceId() === "mangadex" ? mdMatch.id : `mangadex::${mdMatch.id}`,
        };
      }
    }

    const fallback = await fallbackP;
    return {
      resolvedId: match?.id ?? null,
      fallback: fallback ?? (match ? { ...match, id } : { id, title }),
    };
  })();

  virtualResolveCache.set(cacheKey, p);
  return p;
}

export function mangaDetail(id: string): Promise<MangaSummary | null> {
  if (parseVirtualTitle(id)) {
    return (async () => {
      const { resolvedId, fallback } = await resolveVirtualManga(id);
      if (!resolvedId) return fallback;
      const detail = await mangaDetail(resolvedId).catch(() => null);
      if (!detail) return fallback;
      return {
        ...fallback,
        ...detail,
        id,
        cover: detail.cover ?? fallback?.cover,
        description: detail.description || fallback?.description,
        year: detail.year ?? fallback?.year,
        status: detail.status ?? fallback?.status,
        altTitle: detail.altTitle ?? fallback?.altTitle,
      };
    })();
  }
  return cached(
    "detail",
    id,
    20 * MIN,
    async (provider) => {
      const routed = routeById(id);
      const item = await (routed ? routed.provider.detail(routed.orig) : provider.detail(id));
      return item && !isAdultManga(item) ? item : null;
    },
    { timeout: 15_000 },
  );
}

export function mangaChapters(
  id: string,
  opts?: { tries?: number; timeout?: number; refresh?: boolean },
): Promise<MangaChapter[]> {
  if (parseVirtualTitle(id)) {
    return resolveVirtualManga(id).then(({ resolvedId }) =>
      resolvedId ? mangaChapters(resolvedId, opts) : [],
    );
  }
  return cached(
    "chapters",
    id,
    opts?.refresh ? 0 : 20 * MIN,
    async (provider) => {
      const routed = routeById(id);
      if (routed) {
        const chs = await routed.provider.chapters(routed.orig, opts);
        return chs.map((c) => ({
          ...c,
          id: c.id.includes("::") ? c.id : `${routed.provider.id}::${c.id}`,
        }));
      }
      return provider.chapters(id, opts);
    },
    { timeout: 15_000, ...opts },
  );
}

export function resumeChapters(id: string): Promise<MangaChapter[]> {
  if (parseVirtualTitle(id)) {
    return resolveVirtualManga(id).then(({ resolvedId }) =>
      resolvedId ? resumeChapters(resolvedId) : [],
    );
  }
  // Resume only needs the copy the user was reading, not every source's copy
  // by title. The aggregate title search fans out to all providers and almost
  // always exceeds the resume timeout, which pushed Continue Reading back to
  // the details page. Fetch just the owning provider's chapters here; the
  // details page already streams the full aggregate list separately.
  if (aggregateSubProviders().length > 1 || id.includes("::")) {
    return cached(
      "chapters.own",
      id,
      20 * MIN,
      async () => {
        const routed = routeById(id);
        if (routed) {
          const chs = await routed.provider.chapters(routed.orig);
          return chs.map((c) => ({
            ...c,
            id: c.id.includes("::") ? c.id : `${routed.provider.id}::${c.id}`,
          }));
        }
        const subs = aggregateSubProviders();
        const hint = subs.find((p) => p.id === activeMangaProvider().id) ?? subs[0];
        if (!hint) return [];
        const chs = await hint.chapters(id);
        return chs.map((c) => ({
          ...c,
          id: c.id.includes("::") ? c.id : `${hint.id}::${c.id}`,
        }));
      },
      {
        tries: 2,
        timeout: 15_000,
      },
    );
  }
  return mangaChapters(id, { tries: 2, timeout: 15_000 });
}

export async function streamChapters(
  id: string,
  onChunk: (chs: MangaChapter[]) => void,
  opts?: { refresh?: boolean },
): Promise<void> {
  if (parseVirtualTitle(id)) {
    const { resolvedId } = await resolveVirtualManga(id);
    if (!resolvedId) return;
    return streamChapters(resolvedId, onChunk, opts);
  }
  await ensureMangaSources();
  if (opts?.refresh) cache.delete(`${activeMangaSourceId()}|chapters.own|${id}`);
  const subs = aggregateSubProviders();
  if (subs.length < 2) {
    const chs = await mangaChapters(id, opts).catch(() => [] as MangaChapter[]);
    if (chs.length) onChunk(chs);
    return;
  }
  const key = `all|chaptersAll|${id}`;
  const hit = cache.get(key);
  if (!opts?.refresh && hit && Date.now() - hit.at < 20 * MIN) {
    onChunk((await hit.p) as MangaChapter[]);
    return;
  }
  const all: MangaChapter[] = [];
  await streamAggregateChapters(
    id,
    (chunk) => {
      all.push(...chunk);
      onChunk(chunk);
    },
    activeMangaProvider().id,
    opts,
  );
  if (all.length) settle(key, all);
}

export function chapterPages(chapterId: string) {
  const routed = routeById(chapterId);
  const run = routed
    ? () => routed.provider.pageUrls(routed.orig)
    : (p: MangaProvider) => p.pageUrls(chapterId);
  return cached("pages", chapterId, 5 * MIN, run, { timeout: PAGES_TIMEOUT });
}

export function mangaTags() {
  const revision = suwayomiSourcesRevision();
  const lib = mangaLibraryRevision();
  const langRev = mangaLangFilterRevision();
  // Key by the selection itself (not just a counter) so entries stay valid across app restarts.
  const serverBase = activeMangaSource()?.baseUrl;
  const langKey = encodeURIComponent(loadMangaLangFilter(serverBase).slice().sort().join("+"));
  return cached(
    "tags",
    `${revision}|${lib}|${langRev}|${langKey}`,
    30 * MIN,
    (p) => (p.tags ? p.tags() : Promise.resolve([])).then((list) => list.filter((t) => !isAdultTag(t))),
    { tries: 1 },
  );
}

export async function setMangaInLibrary(
  id: string,
  inLibrary: boolean,
  sourceId?: string,
  expectedBaseUrl?: string,
): Promise<boolean> {
  await ensureMangaSources();
  const routed = routeById(id);
  if (id.includes("::") && !routed) return false;
  const owner = routed?.provider.id ?? sourceId;
  if (
    expectedBaseUrl !== undefined &&
    listMangaSources().find((source) => source.id === owner)?.baseUrl !== expectedBaseUrl
  )
    return false;
  const provider =
    routed?.provider ??
    (sourceId && sourceId !== "all"
      ? aggregateSubProviders().find((source) => source.id === sourceId)
      : activeMangaProvider());
  const mangaId = routed?.orig ?? id;
  if (!provider?.setLibrary) return false;
  await provider.setLibrary(mangaId, inLibrary);
  return true;
}
