export type CommunityAddonEntry = {
  id: string;
  name: string;
  version: string;
  description: string;
  manifestUrl: string;
  category: "subtitles" | "anime" | "metadata" | "catalogs";
  iconUrl?: string;
  author: string;
  sandboxMode: "safe" | "direct-stream-only" | "full-network";
  recommended?: boolean;
};

/**
 * Curated Open Ecosystem Directory
 *
 * LEGAL & COMPLIANCE POLICY:
 * Argus strictly operates as an agnostic open-source media player (like VLC and Kodi).
 * Under DMCA safe harbor and app store policies (Apple App Store Guideline 5.2.3,
 * Google Play Developer Policies), Argus does NOT ship, curate, index, or link to
 * any scraping, torrent indexer, or infringing stream addons.
 *
 * Only benign, verified public metadata, soundtrack, catalog, and subtitle providers
 * are listed below. Users may independently connect their own private manifests or
 * external indexers via personal settings.
 */
export const CURATED_COMMUNITY_DIRECTORY: CommunityAddonEntry[] = [
  {
    id: "community.song-scene",
    name: "Song Scene (Soundtracks & Music)",
    version: "1.1.0",
    description: "Highlights soundtrack songs, artists, composers, and music supervisors behind movies and series episodes.",
    manifestUrl: "https://addons.zrk.app/song-scene/manifest.json",
    category: "metadata",
    author: "ZRK",
    sandboxMode: "safe",
    recommended: true,
  },
  {
    id: "community.tmdb-addon",
    name: "The Movie Database (TMDB)",
    version: "2.0.4",
    description: "Rich metadata, posters, cast lists, and backdrop art sourced from TMDB.",
    manifestUrl: "https://tmdb.strem.fun/manifest.json",
    category: "metadata",
    author: "mrcanelas",
    sandboxMode: "safe",
    recommended: true,
  },
  {
    id: "community.opensubtitles-v3",
    name: "OpenSubtitles v3",
    version: "1.0.2",
    description: "Official OpenSubtitles.org integration providing multi-lingual timed subtitles.",
    manifestUrl: "https://opensubtitles-v3.strem.io/manifest.json",
    category: "subtitles",
    author: "Stremio Team",
    sandboxMode: "safe",
    recommended: true,
  },
  {
    id: "community.cyberflix",
    name: "CyberFlix Catalog",
    version: "1.5.0",
    description: "Catalogs for Netflix, Disney+, Apple TV+, Prime, and other major streaming providers.",
    manifestUrl: "https://cyberflix.elfhosted.com/manifest.json",
    category: "catalogs",
    author: "CyberFlix",
    sandboxMode: "safe",
    recommended: true,
  },
  {
    id: "community.kitsu",
    name: "Kitsu Anime",
    version: "1.0.8",
    description: "Extensive anime catalog and metadata mapper with episode thumbnails and Japanese titles.",
    manifestUrl: "https://anime-kitsu.strem.fun/manifest.json",
    category: "anime",
    author: "Kitsu Community",
    sandboxMode: "safe",
    recommended: true,
  },
  {
    id: "community.subdl",
    name: "SubDL Subtitles",
    version: "1.2.0",
    description: "Extensive subtitle database focusing on international languages, Arabic, and Hindi subtitles.",
    manifestUrl: "https://subdl.strem.fun/manifest.json",
    category: "subtitles",
    author: "SubDL Team",
    sandboxMode: "safe",
    recommended: false,
  },
];
