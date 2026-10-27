export type EpisodeHint = { season: number | null; episode: number | null };
import { episodeSpanContains, parseEpisodeSpan } from "@/lib/episode-span";

const VIDEO_EXT_RE = /\.(mkv|mp4|avi|mov|m4v|webm|ts|flv|wmv|m2ts|mpg|mpeg|ogv|3gp)(\?|#|$)/i;

export function episodeFileRegex(season: number, episode: number): RegExp {
  const s = String(season).padStart(2, "0");
  const e = String(episode).padStart(2, "0");
  return new RegExp(
    `s0*${season}[^0-9]?e0*${episode}(?![0-9])|(?<![A-Za-z0-9])${s}${e}(?![0-9])|\\b${season}x0*${episode}(?![0-9])`,
    "i",
  );
}

export function episodeVariantMatch(text: string, season: number | null, episode: number): boolean {
  const span = parseEpisodeSpan(text);
  if (span && season != null) return episodeSpanContains(span, season, episode);
  if (season != null && episodeFileRegex(season, episode).test(text)) return true;
  if (
    season != null &&
    new RegExp(`season\\s*0*${season}\\s*(?:episode|ep|e)\\s*0*${episode}(?![0-9])`, "i").test(text)
  ) {
    return true;
  }
  const hasSeasonToken =
    season == null ||
    new RegExp(`(?:^|[^a-z0-9])(?:s0*${season}|season\\s*0*${season})(?![0-9])`, "i").test(text);
  return hasSeasonToken && new RegExp(`(?:^|[^a-z0-9])e0*${episode}(?![0-9])`, "i").test(text);
}

export function matchEpisodeFileIndex(names: string[], hint: EpisodeHint | undefined): number {
  if (!hint || hint.season == null || hint.episode == null) return -1;
  const s = hint.season;
  const e = hint.episode;
  const re = episodeFileRegex(s, e);
  let bestIdx = -1;
  let bestScore = -1;

  for (let i = 0; i < names.length; i++) {
    const name = names[i] ?? "";
    const isVideo = VIDEO_EXT_RE.test(name);
    if (!isVideo && /\.(nfo|txt|jpg|png|srt|ass|sub)$/i.test(name)) continue;

    let score = 0;
    const span = parseEpisodeSpan(name);
    if (span && episodeSpanContains(span, s, e)) {
      score += 100;
    } else if (re.test(name)) {
      score += 90;
    } else if (episodeVariantMatch(name, s, e)) {
      score += 80;
    } else {
      // Anime absolute episode numbering fallback: e.g. "Show - 05.mkv" or "[Group] Title - 142 [1080p].mkv"
      const animeMatch = name.match(/(?:^|[^a-z0-9])(?:ep|episode|\-)\s*0*(\d{1,4})(?![0-9])/i);
      if (animeMatch && Number(animeMatch[1]) === e) {
        score += 75;
      }
    }

    if (score > 0) {
      if (isVideo) score += 20;
      if (!name.toLowerCase().includes("sample")) score += 10;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
  }

  return bestIdx;
}
