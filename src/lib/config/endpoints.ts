function resolveBase(raw: string | undefined, fallback: string): string {
  const value = typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
  return value.replace(/\/+$/, "");
}

export const ARGUS_API_BASE = resolveBase(
  import.meta.env.VITE_ARGUS_API_BASE,
  "https://argus.invalid",
);

export const ARGUS_TRAKT_BASE = resolveBase(
  import.meta.env.VITE_ARGUS_TRAKT_BASE,
  ARGUS_API_BASE,
);

export const ARGUS_MAL_BASE = resolveBase(import.meta.env.VITE_ARGUS_MAL_BASE, ARGUS_API_BASE);

export const ARGUS_TVDB_BASE = resolveBase(import.meta.env.VITE_ARGUS_TVDB_BASE, ARGUS_API_BASE);

export const ARGUS_BUGS_BASE = resolveBase(
  import.meta.env.VITE_ARGUS_BUGS_BASE,
  "https://argus.invalid",
);

export const ARGUS_SYNC_BASE = resolveBase(
  import.meta.env.VITE_ARGUS_SYNC_BASE,
  "https://argus.invalid",
);

export const ARGUS_RELAY_BASE = resolveBase(
  import.meta.env.VITE_ARGUS_RELAY_BASE,
  ARGUS_API_BASE,
);

export const ARGUS_DISCORD_INVITE = resolveBase(
  import.meta.env.VITE_ARGUS_DISCORD_INVITE,
  "https://discord.gg/argus",
);
