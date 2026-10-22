import type { Addon } from "@/lib/addons";
import { dinfo, dwarn } from "@/lib/debug";
import type { SubResult, SubSearchQuery } from "./types";
import { searchWyzie } from "./providers/wyzie";
import { searchAddons } from "./providers/addons";
import { searchOpenSubtitlesV3 } from "./providers/opensubtitles-v3";
import { langScore, normalizeLang } from "./language";
import { SUBTITLE_PROVIDER_TIMEOUT_MS, withSubtitleTimeout } from "./autoload";

export type SearchOptions = {
  providers?: { wyzie?: boolean; addons?: boolean; opensubtitles?: boolean };
  addons?: Addon[];
  preferredLangs: string[];
  streamHints?: StreamHints;
};

export type StreamHints = {
  release?: string | null;
  source?: string | null;
  resolution?: string | null;
  preferHearingImpaired?: boolean;
  fps?: number | null;
  videoHash?: string | null;
};

export async function searchSubtitles(
  q: SubSearchQuery,
  opts: SearchOptions,
): Promise<SubResult[]> {
  const want = opts.providers ?? {};
  const wyzieOn = want.wyzie === true;
  const addonsOn = want.addons ?? true;
  const osOn = want.opensubtitles ?? true;
  dinfo("[subs] search", {
    q,
    providers: { osOn, addonsOn, wyzieOn },
    addons: opts.addons?.length ?? 0,
  });
  const tasks: Array<{ name: string; p: Promise<SubResult[]> }> = [];
  if (osOn)
    tasks.push({
      name: "opensubtitles-v3",
      p: withSubtitleTimeout(searchOpenSubtitlesV3(q), SUBTITLE_PROVIDER_TIMEOUT_MS, []),
    });
  if (wyzieOn)
    tasks.push({
      name: "wyzie",
      p: withSubtitleTimeout(searchWyzie(q), SUBTITLE_PROVIDER_TIMEOUT_MS, []),
    });
  if (addonsOn && opts.addons && opts.addons.length > 0)
    tasks.push({
      name: "addons",
      p: withSubtitleTimeout(searchAddons(opts.addons, q), SUBTITLE_PROVIDER_TIMEOUT_MS, []),
    });
  const settled = await Promise.allSettled(tasks.map((t) => t.p));
  const all: SubResult[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      dinfo(`[subs] ${tasks[i].name}: ${r.value.length} results`);
      all.push(...r.value);
    } else {
      dwarn(`[subs] ${tasks[i].name} failed`, r.reason);
    }
  });
  const ranked = dedupAndRank(all, opts.preferredLangs, opts.streamHints);
  dinfo(`[subs] total ${ranked.length} after dedup/rank`);
  return ranked;
}

const RELEASE_GROUP_RX =
  /[-.][A-Z0-9]{2,}$|\b(EVO|RARBG|YTS|YIFY|FGT|PSA|TBS|GalaxyRG|GalaxyTV|MeGusta|ION10|EZTV|NTb|FLUX|TEPES|KOGi|SMURF|RZeroX|d3g|TGx)\b/gi;

function extractReleaseGroup(text: string | null | undefined): string | null {
  if (!text) return null;
  const matches = text.match(RELEASE_GROUP_RX);
  if (!matches || matches.length === 0) return null;
  const last = matches[matches.length - 1].replace(/^[-.]/, "").toUpperCase();
  return last.length >= 2 ? last : null;
}

function sourceTokens(source: string | null | undefined): string[] {
  if (!source) return [];
  const s = source.toLowerCase();
  if (s.includes("bluray") || s === "remux" || s.includes("bdrip"))
    return ["bluray", "bdrip", "remux"];
  if (s.includes("web-dl") || s === "webdl" || s.includes("webrip"))
    return ["web-dl", "webdl", "webrip", "web"];
  if (s.includes("hdtv")) return ["hdtv"];
  if (s.includes("dvd")) return ["dvd", "dvdrip"];
  return [s];
}

const MATCH_FULL_SCORE = 260;
const RELEASE_TOKEN_RX = /[a-z0-9]+/g;
const NOISE_TOKENS = new Set(["the", "and", "mkv", "mp4", "avi", "srt", "www", "com"]);

function releaseTokens(text: string | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const t of (text ?? "").toLowerCase().match(RELEASE_TOKEN_RX) ?? []) {
    if (t.length >= 3 && !NOISE_TOKENS.has(t)) out.add(t);
  }
  return out;
}

function streamMatchScore(r: SubResult, hints: StreamHints | undefined): number {
  if (!hints) return 0;
  if (hints.videoHash && r.hash && r.hash.toLowerCase() === hints.videoHash.toLowerCase())
    return MATCH_FULL_SCORE * 2;
  const release = extractReleaseGroup(hints.release);
  const subText = `${r.release ?? ""} ${r.title ?? ""} ${r.url ?? ""}`.toLowerCase();
  let score = 0;
  if (release && subText.includes(release.toLowerCase())) score += 120;
  const wantSrc = sourceTokens(hints.source);
  for (const src of wantSrc) {
    if (subText.includes(src)) {
      score += 40;
      break;
    }
  }
  if (hints.resolution) {
    const res = hints.resolution.toLowerCase();
    if (subText.includes(res) || (res === "4k" && subText.includes("2160p"))) score += 8;
  }
  const want = releaseTokens(hints.release);
  if (want.size > 0) {
    const have = releaseTokens(`${r.release ?? ""} ${r.title ?? ""}`);
    let shared = 0;
    for (const t of want) if (have.has(t)) shared++;
    score += Math.round((shared / want.size) * 60);
  }
  if (hints.fps && r.fps) {
    const diff = Math.abs(hints.fps - r.fps);
    score += diff < 0.05 ? 20 : diff > 0.5 ? -30 : 0;
  }
  if (r.hearingImpaired && !hints.preferHearingImpaired) score -= 25;
  return score;
}

function toConfidence(score: number): number {
  return Math.max(0, Math.min(100, Math.round((score / MATCH_FULL_SCORE) * 100)));
}

function sourcePriority(source: SubResult["source"]): number {
  switch (source) {
    case "addon":
      return 3;
    case "opensubtitles":
      return 2;
    case "wyzie":
      return 2;
    case "jimaku":
      return 1;
    default:
      return 0;
  }
}

function dedupAndRank(results: SubResult[], preferred: string[], hints?: StreamHints): SubResult[] {
  const seen = new Set<string>();
  const filtered: SubResult[] = [];
  for (const r of results) {
    // Include title and format in dedup key to handle cases where same URL appears multiple times
    const key = `${normalizeLang(r.lang)}|${r.url}|${r.title || ""}|${r.format || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    filtered.push(r);
  }
  if (hints) {
    for (const r of filtered) r.matchScore = toConfidence(streamMatchScore(r, hints));
  }
  return interleaveBySource(filtered, preferred, hints);
}

function interleaveBySource(
  list: SubResult[],
  preferred: string[],
  hints?: StreamHints,
): SubResult[] {
  const buckets = new Map<string, SubResult[]>();
  for (const r of list) {
    const key = r.source;
    const arr = buckets.get(key) ?? [];
    arr.push(r);
    buckets.set(key, arr);
  }
  for (const arr of buckets.values()) {
    arr.sort((a, b) => {
      const la = langScore(a.lang, preferred);
      const lb = langScore(b.lang, preferred);
      if (la !== lb) return lb - la;
      const sa = streamMatchScore(a, hints);
      const sb = streamMatchScore(b, hints);
      if (sa !== sb) return sb - sa;
      const da = a.downloads ?? 0;
      const db = b.downloads ?? 0;
      if (da !== db) return db - da;
      return (a.title || "").localeCompare(b.title || "");
    });
  }
  const sourceOrder = [...buckets.keys()].sort(
    (a, b) => sourcePriority(b as SubResult["source"]) - sourcePriority(a as SubResult["source"]),
  );
  const out: SubResult[] = [];
  const seen = new Set<SubResult>();
  const drain = (predicate: (r: SubResult) => boolean) => {
    let depth = 0;
    let more = true;
    while (more) {
      more = false;
      for (const src of sourceOrder) {
        const item = buckets.get(src)?.[depth];
        if (!item) continue;
        more = true;
        if (!seen.has(item) && predicate(item)) {
          seen.add(item);
          out.push(item);
        }
      }
      depth++;
    }
  };
  drain((r) => langScore(r.lang, preferred) > 0);
  drain(() => true);
  return out;
}
