const KEY = "argus.saved-searches.v1";
const LIMIT = 20;
const MAX_QUERY_LENGTH = 200;

function storageKey(profileId: string): string {
  return `${KEY}.${encodeURIComponent(profileId)}`;
}

function normalize(query: unknown): string | null {
  if (typeof query !== "string") return null;
  const clean = query.replace(/\s+/g, " ").trim();
  return clean && clean.length <= MAX_QUERY_LENGTH ? clean : null;
}

export function loadSavedSearches(profileId: string): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey(profileId)) ?? "[]");
    if (!Array.isArray(stored)) return [];
    const seen = new Set<string>();
    const queries: string[] = [];
    for (const value of stored) {
      const query = normalize(value);
      if (!query || seen.has(query.toLowerCase())) continue;
      seen.add(query.toLowerCase());
      queries.push(query);
      if (queries.length === LIMIT) break;
    }
    return queries;
  } catch {
    return [];
  }
}

function persist(profileId: string, next: string[], previous: string[]): string[] {
  try {
    localStorage.setItem(storageKey(profileId), JSON.stringify(next));
    return next;
  } catch {
    return previous;
  }
}

export function saveSearch(profileId: string, query: string): string[] {
  const previous = loadSavedSearches(profileId);
  const clean = normalize(query);
  if (!clean) return previous;
  const next = [clean, ...previous.filter((value) => value.toLowerCase() !== clean.toLowerCase())]
    .slice(0, LIMIT);
  return persist(profileId, next, previous);
}

export function removeSavedSearch(profileId: string, query: string): string[] {
  const previous = loadSavedSearches(profileId);
  const clean = normalize(query);
  if (!clean) return previous;
  return persist(
    profileId,
    previous.filter((value) => value.toLowerCase() !== clean.toLowerCase()),
    previous,
  );
}
