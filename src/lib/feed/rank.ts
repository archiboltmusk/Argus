import type { Meta } from "@/lib/cinemeta";
import type { FeedItem } from "@/lib/feed";
import { getStore } from "@/lib/discover/store";
import { loadStoredSettings } from "@/lib/settings/load";
import { localeWeights } from "./locale";

type Affinity = ReturnType<typeof getStore>["affinity"];
type Locale = ReturnType<typeof localeWeights>;

export type RecommendationExplanation = {
  label: string;
  detail: string;
};

function decadeOf(year?: string): string | undefined {
  if (!year) return undefined;
  const y = parseInt(year.slice(0, 4), 10);
  if (!Number.isFinite(y)) return undefined;
  return `${Math.floor(y / 10) * 10}s`;
}

function maxAbs(map: Record<string, number>): number {
  let max = 0;
  for (const v of Object.values(map)) {
    const a = Math.abs(v);
    if (a > max) max = a;
  }
  return max;
}

function localeScore(meta: Meta, locale: Locale, affinity: Affinity): number {
  if (locale.penalty === 0) return 0;
  const code = meta.originalLanguage;
  if (!code || locale.codes.has(code)) return 0;
  const langMax = maxAbs(affinity.languages) || 1;
  const liked = Math.max(0, (affinity.languages[code] ?? 0) / langMax);
  return -locale.penalty * (1 - liked);
}

function scoreItem(item: FeedItem, affinity: Affinity, locale: Locale): number {
  let score = localeScore(item.meta, locale, affinity);
  if (affinity.totalEvents === 0) return score;
  const genreMax = maxAbs(affinity.genres) || 1;
  for (const g of item.meta.genres ?? []) {
    const w = affinity.genres[g] ?? 0;
    if (w !== 0) score += (w / genreMax) * 4;
  }
  const decade = decadeOf(item.meta.releaseInfo);
  if (decade) {
    const decadeMax = maxAbs(affinity.decades) || 1;
    const w = affinity.decades[decade] ?? 0;
    if (w !== 0) score += (w / decadeMax) * 1.5;
  }
  return score;
}

/** Gives people a truthful, on-device explanation for a ranked title. */
export function explainAffinity(meta: Meta, affinity: Affinity): RecommendationExplanation | null {
  if (affinity.totalEvents < 1) return null;

  const matchingGenres = (meta.genres ?? [])
    .map((genre) => ({ genre, weight: affinity.genres[genre] ?? 0 }))
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight);
  if (matchingGenres.length > 0) {
    return {
      label: `Because you enjoy ${matchingGenres[0].genre}`,
      detail: "Based only on your on-device viewing and rating activity.",
    };
  }

  const decade = decadeOf(meta.releaseInfo);
  if (decade && (affinity.decades[decade] ?? 0) > 0) {
    return {
      label: `Because you enjoy ${decade} titles`,
      detail: "Based only on your on-device viewing and rating activity.",
    };
  }

  return null;
}

export function rankByAffinity(items: FeedItem[]): FeedItem[] {
  const { affinity } = getStore();
  const locale = localeWeights(loadStoredSettings());
  if (affinity.totalEvents < 1 && locale.penalty === 0) return items;
  const scored = items.map((item, idx) => ({
    item,
    score: scoreItem(item, affinity, locale),
    idx,
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.idx - b.idx;
  });
  return scored.map((s) => s.item);
}

export function rankMetasByAffinity(metas: Meta[]): Meta[] {
  const wrapped: FeedItem[] = metas.map((m) => ({ meta: m, tag: "", category: "" }));
  const ranked = rankByAffinity(wrapped);
  return ranked.map((w) => w.meta);
}
