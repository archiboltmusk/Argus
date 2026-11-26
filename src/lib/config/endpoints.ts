function resolveBase(raw: string | undefined, fallback: string): string {
  const value = typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
  return value.replace(/\/+$/, "");
}

export const HARBOR_FALLBACK_BASE = "https://harborcommunity.site";

export const ARGUS_API_BASE = resolveBase(
  import.meta.env.VITE_ARGUS_API_BASE,
  HARBOR_FALLBACK_BASE,
);

/**
 * False while no Argus server is configured. Argus-account sign-in, handles, profile
 * sync and community features all need one, so their UI stays hidden until
 * VITE_ARGUS_API_BASE points at a real deployment.
 */
export const ARGUS_HOSTED = !new URL(ARGUS_API_BASE).hostname.endsWith(".invalid");

export const ARGUS_TRAKT_BASE = resolveBase(
  import.meta.env.VITE_ARGUS_TRAKT_BASE,
  HARBOR_FALLBACK_BASE,
);

export const ARGUS_MAL_BASE = resolveBase(
  import.meta.env.VITE_ARGUS_MAL_BASE,
  HARBOR_FALLBACK_BASE,
);

export const ARGUS_MAL_REDIRECT_BASE = resolveBase(
  import.meta.env.VITE_ARGUS_MAL_REDIRECT_BASE,
  "https://archiboltmusk.github.io/argus-auth",
);

export const ARGUS_TVDB_BASE = resolveBase(
  import.meta.env.VITE_ARGUS_TVDB_BASE,
  HARBOR_FALLBACK_BASE,
);

export const ARGUS_BUGS_BASE = resolveBase(
  import.meta.env.VITE_ARGUS_BUGS_BASE,
  HARBOR_FALLBACK_BASE,
);

export const ARGUS_SYNC_BASE = resolveBase(
  import.meta.env.VITE_ARGUS_SYNC_BASE,
  HARBOR_FALLBACK_BASE,
);

export const ARGUS_RELAY_BASE = resolveBase(
  import.meta.env.VITE_ARGUS_RELAY_BASE,
  ARGUS_API_BASE,
);

export const ARGUS_STREAM_RELAY_URL = (import.meta.env.VITE_ARGUS_STREAM_RELAY_URL ?? "").trim().replace(/\/+$/, "");
export const ARGUS_COMPANION_URL = (import.meta.env.VITE_ARGUS_COMPANION_URL ?? "").trim().replace(/\/+$/, "");

export const ARGUS_DISCORD_INVITE = resolveBase(
  import.meta.env.VITE_ARGUS_DISCORD_INVITE,
  "https://discord.gg/argus",
);
