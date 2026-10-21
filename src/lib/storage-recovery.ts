const PRUNABLE_EXACT = new Set<string>([
  "argus.omdb.v1",
  "argus.omdb.misses",
  "argus.omdb.budget",
  "argus.iptv.hydration.v2",
  "argus.iptv.epgmap.v1",
  "argus.iptv.stats.v1",
  "argus.dead-streams.v1",
  "argus.discover.v1",
  "argus.discover.events.v1",
  "argus.discover.awards.v1",
  "argus.discover.rows.v1",
  "argus.scroll.v1",
  "argus.webhook.lastTick",
  "argus.calendar.webhook.last",
  "argus.anidbtvdbcache",
  "argus.armcache",
  "argus.armkitsucache",
  "argus.armsrcmalcache",
  "argus.extkitsucache",
  "argus.imdb.tmdb.v1",
  "argus.tmdb.imdb.v1",
  "argus.tmdb.personName.v1",
  "argus.awards.wikidata.v8",
  "argus.awards.wikidata.v9",
  "argus.awards.wikidata.v10",
  "argus.anime_awards.metas.v2",
  "argus.animefillercache.v2",
  "argus.jikancatalog",
  "argus.malscorecache",
  "argus.anime.recs_by_mal.v1",
  "argus.anime.toppicks.cache.v1",
  "argus.anime.toppicks.shown.v1",
  "argus.anime.toppicks.visit.v1",
  "argus.anime.mal_id_by_franchise.v1",
  "argus.anime.detected.v1",
  "argus.picker-cache.v4",
  "argus.picker-cache.v5",
  "argus.shows.hero.pool.v2",
  "argus.mdblist.cards",
  "argus.build.rating.v1",
  "argus.parental",
  "argus.lastseason.v1",
  "argus.surprise.recent.v1",
  "argus.stremio-addons.velocity.v1",
  "argus.playback-history.v1",
]);

const PRUNABLE_PREFIXES = [
  "argus.libraryNameRepair.v1.",
  "argus.anilist.collection.v1.",
];

function isPrunable(key: string): boolean {
  if (PRUNABLE_EXACT.has(key)) return true;
  return PRUNABLE_PREFIXES.some((p) => key.startsWith(p));
}

function prunableEntries(): Array<{ key: string; size: number }> {
  const out: Array<{ key: string; size: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !isPrunable(key)) continue;
    const v = localStorage.getItem(key);
    if (v == null) continue;
    out.push({ key, size: v.length + key.length });
  }
  out.sort((a, b) => b.size - a.size);
  return out;
}

function isQuotaError(e: unknown): boolean {
  if (e instanceof DOMException) {
    if (e.name === "QuotaExceededError") return true;
    if (e.name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
    if (e.code === 22) return true;
    if (e.code === 1014) return true;
  }
  return false;
}

function pruneOne(key: string): number {
  try {
    const cur = localStorage.getItem(key);
    if (cur == null) return 0;
    const freed = cur.length + key.length;
    localStorage.removeItem(key);
    console.info(`[storage] pruned "${key}" to free ${freed} chars`);
    return freed;
  } catch {
    return 0;
  }
}

export function setItemWithRecovery(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (!isQuotaError(e)) throw e;
  }
  for (const { key: candidate } of prunableEntries()) {
    if (candidate === key) continue;
    pruneOne(candidate);
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      if (!isQuotaError(e)) throw e;
    }
  }
  console.warn(`[storage] giving up on "${key}" after pruning every cache`);
  return false;
}

export function freeStorageSpace(): { freedBytes: number; pruned: string[] } {
  let freed = 0;
  const pruned: string[] = [];
  for (const { key } of prunableEntries()) {
    const n = pruneOne(key);
    if (n > 0) {
      freed += n;
      pruned.push(key);
    }
  }
  return { freedBytes: freed, pruned };
}

const PROACTIVE_PER_KEY_THRESHOLD = 256 * 1024;
const PROACTIVE_TOTAL_THRESHOLD = 3.5 * 1024 * 1024;

const DEAD_CACHE_PREFIXES = ["argus.picker-cache."];
const VERSIONED_CACHE_PREFIXES = ["argus.awards.wikidata"];

function purgeDeadCaches(): void {
  const kill: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && DEAD_CACHE_PREFIXES.some((p) => k.startsWith(p))) kill.push(k);
  }
  for (const k of kill) pruneOne(k);
}

function purgeOldCacheVersions(): void {
  for (const prefix of VERSIONED_CACHE_PREFIXES) {
    const re = new RegExp(`^${prefix.replace(/\./g, "\\.")}\\.v(\\d+)$`);
    const found: Array<{ key: string; v: number }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const m = re.exec(k);
      if (m) found.push({ key: k, v: Number(m[1]) });
    }
    if (found.length < 2) continue;
    const max = Math.max(...found.map((f) => f.v));
    for (const f of found) if (f.v < max) pruneOne(f.key);
  }
}

export function proactiveStorageCleanup(): void {
  if (typeof localStorage === "undefined") return;
  purgeDeadCaches();
  purgeOldCacheVersions();
  const entries = prunableEntries();
  let total = 0;
  for (const { key, size } of entries) {
    total += size;
    if (size > PROACTIVE_PER_KEY_THRESHOLD) pruneOne(key);
  }
  if (total > PROACTIVE_TOTAL_THRESHOLD) {
    const r = freeStorageSpace();
    console.info(`[storage] proactive total cleanup: ${r.pruned.length} caches, ${r.freedBytes} bytes`);
  }
}
