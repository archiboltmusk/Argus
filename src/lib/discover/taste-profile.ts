import type { Affinity } from "./types";

export type TasteProfile = {
  version: 1;
  genres: Record<string, number>;
  decades: Record<string, number>;
  languages: Record<string, number>;
};

export const EMPTY_TASTE: TasteProfile = Object.freeze({
  version: 1,
  genres: {},
  decades: {},
  languages: {},
});

function bounded(values: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([key, value]) => key.length > 0 && Number.isFinite(value) && value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([key, value]) => [key, Math.round(value * 100) / 100]),
  );
}

/** Deliberately excludes raw events, titles, people, devices, and stream data. */
export function tasteFromAffinity(affinity: Affinity): TasteProfile {
  return {
    version: 1,
    genres: bounded(affinity.genres),
    decades: bounded(affinity.decades),
    languages: bounded(affinity.languages),
  };
}

export function normalizeTaste(value: unknown): TasteProfile {
  if (!value || typeof value !== "object") return { ...EMPTY_TASTE };
  const input = value as Partial<TasteProfile>;
  return {
    version: 1,
    genres: bounded(input.genres ?? {}),
    decades: bounded(input.decades ?? {}),
    languages: bounded(input.languages ?? {}),
  };
}

export function mergeTaste(...profiles: unknown[]): TasteProfile {
  const merged: TasteProfile = { version: 1, genres: {}, decades: {}, languages: {} };
  for (const profile of profiles.map(normalizeTaste)) {
    for (const field of ["genres", "decades", "languages"] as const) {
      for (const [key, value] of Object.entries(profile[field])) {
        merged[field][key] = Math.max(merged[field][key] ?? 0, value);
      }
    }
  }
  return normalizeTaste(merged);
}
