export interface JellyfinServerConfig {
  serverUrl: string;
  apiKey: string;
  userId?: string;
  serverName?: string;
  serverType?: "jellyfin" | "emby";
}

export interface JellyfinUser {
  Id: string;
  Name: string;
  HasPassword?: boolean;
}

export interface JellyfinLibrary {
  Id: string;
  Name: string;
  CollectionType?: string; // "movies", "tvshows", "music", etc.
  ItemCount?: number;
}

export interface JellyfinItemUserData {
  PlaybackPositionTicks?: number;
  PlayCount?: number;
  Played?: boolean;
  IsFavorite?: boolean;
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  OriginalTitle?: string;
  Type: "Movie" | "Series" | "Episode" | "CollectionFolder" | "Folder" | string;
  Overview?: string;
  RunTimeTicks?: number;
  ProductionYear?: number;
  PremiereDate?: string;
  CommunityRating?: number;
  SeriesId?: string;
  SeriesName?: string;
  SeasonId?: string;
  IndexNumber?: number; // Episode number
  ParentIndexNumber?: number; // Season number
  ImageTags?: Record<string, string>;
  BackdropImageTags?: string[];
  UserData?: JellyfinItemUserData;
  Container?: string;
}
