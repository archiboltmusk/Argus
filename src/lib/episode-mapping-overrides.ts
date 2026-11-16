import { cwProfileScope } from "./cw-profile";
import type { KitsuEpisode } from "./providers/kitsu";

export type EpisodeMappingOverride = {
  kitsuId: number;
  episode: number;
  imdbId: string;
  season: number;
  providerEpisode: number;
};
const PREFIX = "argus.episode-mapping.v1.";
function key(): string {
  return PREFIX + encodeURIComponent(cwProfileScope().profileId || "default");
}
function valid(value: EpisodeMappingOverride): boolean {
  return (
    !!value &&
    Number.isSafeInteger(value.kitsuId) &&
    value.kitsuId > 0 &&
    Number.isSafeInteger(value.episode) &&
    value.episode >= 0 &&
    /^tt\d+$/.test(value.imdbId) &&
    Number.isSafeInteger(value.season) &&
    value.season >= 0 &&
    Number.isSafeInteger(value.providerEpisode) &&
    value.providerEpisode >= 0
  );
}
export function readEpisodeMappingOverrides(): EpisodeMappingOverride[] {
  try {
    const value = JSON.parse(localStorage.getItem(key()) ?? "[]");
    return Array.isArray(value) ? value.filter(valid).slice(-400) : [];
  } catch {
    return [];
  }
}
export function saveEpisodeMappingOverride(value: EpisodeMappingOverride): void {
  if (!valid(value))
    throw new Error(
      "Use a numeric Kitsu ID, an IMDb tt ID, and whole episode/season numbers (zero is allowed for specials).",
    );
  const rows = readEpisodeMappingOverrides().filter(
    (row) => row.kitsuId !== value.kitsuId || row.episode !== value.episode,
  );
  rows.push(value);
  localStorage.setItem(key(), JSON.stringify(rows.slice(-400)));
}
export function removeEpisodeMappingOverride(kitsuId: number, episode: number): void {
  localStorage.setItem(
    key(),
    JSON.stringify(
      readEpisodeMappingOverrides().filter(
        (row) => row.kitsuId !== kitsuId || row.episode !== episode,
      ),
    ),
  );
}
export function episodeMappingCacheKey(): string {
  return `${key()}:${JSON.stringify(readEpisodeMappingOverrides())}`;
}
export function applyEpisodeMappingOverrides(episodes: KitsuEpisode[], kitsuId: number): void {
  const rows = readEpisodeMappingOverrides().filter((row) => row.kitsuId === kitsuId);
  for (const episode of episodes) {
    const row = rows.find((value) => value.episode === episode.number);
    if (!row) continue;
    episode.imdbId = row.imdbId;
    episode.imdbSeason = row.season;
    episode.imdbEpisode = row.providerEpisode;
    // Kitsu stream identity stays entry-relative: tracker progress must not use TV numbering.
  }
}
