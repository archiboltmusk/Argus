export function parseTmdbAliases(data: unknown): string[] {
  const d = data as { titles?: Array<{ title?: string }>; results?: Array<{ title?: string }> } | null;
  return (d?.titles ?? d?.results ?? []).map((t) => t.title ?? "");
}

export function parseTvmazeAkas(data: unknown): string[] {
  return Array.isArray(data) ? data.map((a: { name?: string }) => a?.name ?? "") : [];
}

export function parseAnilistSynonyms(data: unknown): string[] {
  const m = (data as { data?: { Media?: Record<string, unknown> } } | null)?.data?.Media;
  if (!m) return [];
  const t = (m.title ?? {}) as Record<string, string | null>;
  return [t.romaji ?? "", t.english ?? "", t.native ?? "", ...((m.synonyms as string[]) ?? [])];
}
