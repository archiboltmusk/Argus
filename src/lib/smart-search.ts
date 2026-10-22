/**
 * Local, offline mood and natural-language matching over a library entry. No model
 * and no network: a small vocabulary maps feelings and decades onto genres and years.
 */

type Entry = {
  name?: string;
  type?: string;
  description?: string;
  genres?: string[];
  releaseInfo?: string;
};

const MOODS: Record<string, string[]> = {
  cozy: ["comedy", "family", "animation", "romance", "music"],
  funny: ["comedy"],
  light: ["comedy", "family", "animation"],
  scary: ["horror", "thriller"],
  spooky: ["horror", "mystery"],
  dark: ["thriller", "crime", "horror", "mystery", "drama"],
  tense: ["thriller", "crime", "mystery"],
  sad: ["drama", "romance"],
  romantic: ["romance"],
  exciting: ["action", "adventure", "thriller"],
  epic: ["adventure", "fantasy", "war", "history"],
  smart: ["mystery", "sci-fi", "documentary", "history"],
  kids: ["family", "animation"],
  true: ["documentary", "biography", "history"],
};

const FILLER = new Set(["a", "an", "the", "some", "something", "to", "watch", "me", "show", "movies", "movie", "shows", "series", "with", "that", "is", "i", "want", "something", "and", "of", "from"]);

function yearOf(e: Entry): number | null {
  const m = e.releaseInfo?.match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

function decade(token: string): [number, number] | null {
  const m = token.match(/^(\d{2}|\d{4})s$/);
  if (!m) return null;
  let start = Number(m[1]);
  if (m[1].length === 2) start += start < 30 ? 2000 : 1900;
  return [start, start + 9];
}

/** True when every meaningful word in the query is satisfied by the entry. */
export function smartMatch(entry: Entry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = (entry.name ?? "").toLowerCase();
  if (name.includes(q)) return true;
  const tokens = q.split(/[^a-z0-9-]+/).filter((t) => t && !FILLER.has(t));
  if (tokens.length === 0) return false;
  const genres = (entry.genres ?? []).map((g) => g.toLowerCase());
  const desc = (entry.description ?? "").toLowerCase();
  const year = yearOf(entry);
  return tokens.every((t) => {
    if (name.includes(t) || desc.includes(t)) return true;
    if (genres.some((g) => g.includes(t))) return true;
    const mood = MOODS[t];
    if (mood && genres.some((g) => mood.includes(g))) return true;
    const span = decade(t);
    if (span && year != null) return year >= span[0] && year <= span[1];
    return false;
  });
}
