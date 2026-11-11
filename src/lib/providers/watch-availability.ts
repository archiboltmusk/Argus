/**
 * Legal Streaming Availability Provider
 *
 * Checks where a movie or series is streaming in the user's country
 * (Netflix, Prime Video, Disney+, Apple TV+, etc.) using free public directory lookups.
 */

export interface StreamingService {
  name: string;
  type: "sub" | "rent" | "buy" | "free";
  iconUrl?: string;
  webUrl?: string;
}

export interface TitleAvailability {
  title: string;
  countryCode: string;
  services: StreamingService[];
  cinemaReleaseDate?: string;
}

/**
 * Common known streaming provider badges
 */
export const STREAMING_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  netflix: { label: "Netflix", bg: "bg-red-600", text: "text-white" },
  prime: { label: "Prime Video", bg: "bg-sky-600", text: "text-white" },
  disney: { label: "Disney+", bg: "bg-blue-800", text: "text-white" },
  apple: { label: "Apple TV+", bg: "bg-neutral-800", text: "text-white" },
  max: { label: "Max", bg: "bg-purple-900", text: "text-white" },
  hulu: { label: "Hulu", bg: "bg-emerald-600", text: "text-white" },
  crunchyroll: { label: "Crunchyroll", bg: "bg-amber-600", text: "text-white" },
};

/**
 * Queries TMDB watch providers for a given movie/show ID
 */
export async function getWatchProviders(params: {
  tmdbId: number;
  mediaType?: "movie" | "tv";
  countryCode?: string;
  signal?: AbortSignal;
}): Promise<StreamingService[]> {
  const { tmdbId, mediaType = "movie", countryCode = "US", signal } = params;
  if (!tmdbId) return [];

  try {
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/watch/providers`;
    // TMDB watch providers endpoint returns free JustWatch attribution data
    const res = await fetch(url, {
      method: "GET",
      signal: signal ?? AbortSignal.timeout(6000),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Record<
        string,
        {
          flatrate?: Array<{ provider_name: string; logo_path: string }>;
          rent?: Array<{ provider_name: string; logo_path: string }>;
          buy?: Array<{ provider_name: string; logo_path: string }>;
        }
      >;
    };

    const regional = data.results?.[countryCode.toUpperCase()];
    if (!regional) return [];

    const services: StreamingService[] = [];
    if (regional.flatrate) {
      for (const p of regional.flatrate) {
        services.push({
          name: p.provider_name,
          type: "sub",
          iconUrl: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : undefined,
        });
      }
    }

    if (regional.rent && services.length < 6) {
      for (const p of regional.rent) {
        if (!services.some((s) => s.name === p.provider_name)) {
          services.push({
            name: p.provider_name,
            type: "rent",
            iconUrl: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : undefined,
          });
        }
      }
    }

    return services;
  } catch {
    return [];
  }
}
