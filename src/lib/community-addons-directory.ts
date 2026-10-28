export type CommunityAddonEntry = {
  id: string;
  name: string;
  version: string;
  description: string;
  manifestUrl: string;
  category: "streams" | "subtitles" | "anime" | "metadata" | "catalogs";
  iconUrl?: string;
  author: string;
  sandboxMode: "safe" | "direct-stream-only" | "full-network";
  recommended?: boolean;
};

export const CURATED_COMMUNITY_DIRECTORY: CommunityAddonEntry[] = [
  {
    id: "community.torrentio",
    name: "Torrentio",
    version: "1.0.14",
    description: "Scrapes torrent streams from multiple providers with Debrid caching and resolution filters.",
    manifestUrl: "https://torrentio.strem.fun/manifest.json",
    category: "streams",
    author: "TheCommunity",
    sandboxMode: "direct-stream-only",
    recommended: true,
  },
  {
    id: "community.comet",
    name: "Comet",
    version: "2.1.0",
    description: "Fast, lightweight debrid and torrent stream scraper with real-time health checks.",
    manifestUrl: "https://comet.elfhosted.com/manifest.json",
    category: "streams",
    author: "Gabe",
    sandboxMode: "direct-stream-only",
    recommended: true,
  },
  {
    id: "community.mediafusion",
    name: "MediaFusion",
    version: "3.4.1",
    description: "Multi-source scraper supporting live TV, sports replays, and debrid streams.",
    manifestUrl: "https://mediafusion.elfhosted.com/manifest.json",
    category: "streams",
    author: "Mhancoc",
    sandboxMode: "direct-stream-only",
    recommended: false,
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
    id: "community.song-scene",
    name: "Song Scene (Soundtracks & Music)",
    version: "1.1.0",
    description: "Highlights the soundtrack songs, artists, composers, and music supervisors behind any movie or series episode.",
    manifestUrl: "https://addons.zrk.app/song-scene/manifest.json",
    category: "metadata",
    author: "ZRK",
    sandboxMode: "safe",
    recommended: true,
  },
];
