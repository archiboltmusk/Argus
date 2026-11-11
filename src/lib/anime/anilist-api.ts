/**
 * AniList Public GraphQL Client
 *
 * Provides rich anime/manga relationship trees, Japanese romaji/native titles,
 * voice actors, studios, and character profiles without requiring API keys.
 */

export interface AnimeRelation {
  id: number;
  title: string;
  relationType: string;
  format: string;
  coverImage?: string;
  status: string;
}

export interface AnimeCharacter {
  name: string;
  role: string;
  voiceActor?: {
    name: string;
    language: string;
    image?: string;
  };
  image?: string;
}

export interface AnimeRichDetail {
  id: number;
  titleRomaji: string;
  titleEnglish?: string;
  titleNative?: string;
  studios: string[];
  characters: AnimeCharacter[];
  relations: AnimeRelation[];
  episodes?: number;
  durationMinutes?: number;
}

const ANILIST_GRAPHQL_ENDPOINT = "https://graphql.anilist.co";

const ANIME_QUERY = `
query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    title {
      romaji
      english
      native
    }
    episodes
    duration
    studios(isMain: true) {
      nodes {
        name
      }
    }
    characters(sort: ROLE, perPage: 6) {
      edges {
        role
        node {
          name {
            full
          }
          image {
            medium
          }
        }
        voiceActors(language: JAPANESE, perPage: 1) {
          name {
            full
          }
          languageV2
          image {
            medium
          }
        }
      }
    }
    relations {
      edges {
        relationType
        node {
          id
          format
          status
          title {
            userPreferred
          }
          coverImage {
            medium
          }
        }
      }
    }
  }
}
`;

/**
 * Fetches rich anime details from AniList public GraphQL API
 */
export async function fetchAniListAnimeDetails(
  searchTitle: string,
  signal?: AbortSignal,
): Promise<AnimeRichDetail | null> {
  if (!searchTitle.trim()) return null;

  try {
    const res = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: signal ?? AbortSignal.timeout(8000),
      body: JSON.stringify({
        query: ANIME_QUERY,
        variables: { search: searchTitle },
      }),
    });

    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: {
        Media?: {
          id: number;
          title?: { romaji?: string; english?: string; native?: string };
          episodes?: number;
          duration?: number;
          studios?: { nodes?: Array<{ name: string }> };
          characters?: {
            edges?: Array<{
              role: string;
              node?: { name?: { full?: string }; image?: { medium?: string } };
              voiceActors?: Array<{
                name?: { full?: string };
                languageV2?: string;
                image?: { medium?: string };
              }>;
            }>;
          };
          relations?: {
            edges?: Array<{
              relationType: string;
              node?: {
                id: number;
                format: string;
                status: string;
                title?: { userPreferred?: string };
                coverImage?: { medium?: string };
              };
            }>;
          };
        };
      };
    };

    const media = body.data?.Media;
    if (!media) return null;

    const studios = (media.studios?.nodes || []).map((s) => s.name);
    const characters: AnimeCharacter[] = (media.characters?.edges || []).map((e) => {
      const va = e.voiceActors?.[0];
      return {
        name: e.node?.name?.full || "Character",
        role: e.role || "Supporting",
        image: e.node?.image?.medium,
        voiceActor: va?.name?.full
          ? {
              name: va.name.full,
              language: va.languageV2 || "Japanese",
              image: va.image?.medium,
            }
          : undefined,
      };
    });

    const relations: AnimeRelation[] = (media.relations?.edges || []).map((e) => ({
      id: e.node?.id || 0,
      title: e.node?.title?.userPreferred || "Untitled",
      relationType: e.relationType || "Other",
      format: e.node?.format || "TV",
      status: e.node?.status || "Unknown",
      coverImage: e.node?.coverImage?.medium,
    }));

    return {
      id: media.id,
      titleRomaji: media.title?.romaji || searchTitle,
      titleEnglish: media.title?.english,
      titleNative: media.title?.native,
      studios,
      characters,
      relations,
      episodes: media.episodes,
      durationMinutes: media.duration,
    };
  } catch {
    return null;
  }
}
