/** Stable query-key factory so cache entries stay consistent across views. */
export const queryKeys = {
  catalog: {
    list: (authKey: string | null) => ["argus", "catalog", "list", authKey ?? "anon"] as const,
    rows: (authKey: string | null) => ["argus", "catalog", "rows", authKey ?? "anon"] as const,
    shelf: (base: string, type: string, id: string) =>
      ["argus", "catalog", "shelf", base, type, id, 1] as const,
  },
  addons: {
    installed: (authKey: string | null) =>
      ["argus", "addons", "installed", authKey ?? "anon"] as const,
    directory: () => ["argus", "addons", "directory"] as const,
    manifest: (transportUrl: string) => ["argus", "addons", "manifest", transportUrl] as const,
  },
  detail: {
    data: (id: string, type: string, tmdbKey: string, language: string) =>
      ["argus", "detail", id, type, tmdbKey ? "tmdb" : "cinemeta", language] as const,
  },
} as const;
