// Typed wrappers over the Rust commands in src-tauri/src/lib.rs.
import { invoke } from "@tauri-apps/api/core";

export type MetaPreview = {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  genres?: string[];
};

export type Video = {
  id: string;
  title: string;
  season?: number;
  episode?: number;
  released?: string;
  thumbnail?: string;
};

export type Meta = MetaPreview & { runtime?: string; cast?: string[]; director?: string[]; videos?: Video[] };

export type Stream = {
  url?: string;
  infoHash?: string;
  fileIdx?: number;
  ytId?: string;
  externalUrl?: string;
  name?: string;
  description?: string;
  origin?: string;
  behaviorHints: { notWebReady: boolean; bingeGroup?: string; filename?: string; videoSize?: number };
};

export type StreamInfo = {
  resolution: number;
  hdr: "none" | "hlg" | "hdr10" | "hdr10plus" | "dolbyvision";
  codec: "av1" | "hevc" | "h264" | "other";
  release: "remux" | "bluray" | "web" | "hdtv" | "cam" | "unknown";
  audio?: string;
  channels?: string;
  sizeBytes?: number;
  seeders?: number;
  cached?: boolean;
};

export type RankedStream = { stream: Stream; info: StreamInfo; score: number };

export type Addon = {
  base_url: string;
  manifest: { id: string; name: string; version: string; description?: string; logo?: string; types: string[] };
};

export type Profile = { id: number; name: string; has_pin: boolean; kids: boolean };

export type LibraryItem = { item_id: string; kind: string; name: string; poster?: string; added_at: number };

export type CalendarEntry = {
  date: string;
  showId: string;
  showName: string;
  poster?: string;
  videoId: string;
  season?: number;
  episode?: number;
  title: string;
};

export type Progress = {
  item_id: string;
  video_id: string;
  kind: string;
  name: string;
  poster?: string;
  position_s: number;
  duration_s: number;
  updated_at: number;
};

export type CatalogRow = { addon: string; title: string; kind: string; id: string; items: MetaPreview[] };

export const api = {
  profiles: () => invoke<Profile[]>("profiles"),
  createProfile: (name: string, kids = false) => invoke<Profile>("create_profile", { name, kids }),
  deleteProfile: (profile: number) => invoke<void>("delete_profile", { profile }),
  renameProfile: (profile: number, name: string) => invoke<void>("rename_profile", { profile, name }),
  setPin: (profile: number, pin: string | null) => invoke<void>("set_pin", { profile, pin }),
  checkPin: (profile: number, pin: string) => invoke<boolean>("check_pin", { profile, pin }),
  library: (profile: number) => invoke<LibraryItem[]>("library", { profile }),
  addToLibrary: (profile: number, item: LibraryItem) => invoke<void>("add_to_library", { profile, item }),
  removeFromLibrary: (profile: number, itemId: string) => invoke<void>("remove_from_library", { profile, itemId }),
  calendar: (profile: number) => invoke<CalendarEntry[]>("calendar", { profile }),
  getAppSetting: (key: string) => invoke<string | null>("get_app_setting", { key }),
  setAppSetting: (key: string, value: string) => invoke<void>("set_app_setting", { key, value }),
  addons: (profile: number) => invoke<Addon[]>("addons", { profile }),
  installAddon: (profile: number, url: string) => invoke<Addon>("install_addon", { profile, url }),
  removeAddon: (profile: number, baseUrl: string) => invoke<void>("remove_addon", { profile, baseUrl }),
  reorderAddons: (profile: number, baseUrls: string[]) => invoke<void>("reorder_addons", { profile, baseUrls }),
  homeRows: (profile: number) => invoke<CatalogRow[]>("home_rows", { profile }),
  search: (profile: number, query: string) => invoke<MetaPreview[]>("search", { profile, query }),
  meta: (profile: number, kind: string, id: string) => invoke<Meta>("meta", { profile, kind, id }),
  streams: (profile: number, kind: string, id: string) => invoke<RankedStream[]>("streams", { profile, kind, id }),
  resolveStream: (profile: number, stream: Stream) => invoke<string>("resolve_stream", { profile, stream }),
  playExternal: (profile: number, url: string) => invoke<void>("play_external", { profile, url }),
  continueWatching: (profile: number) => invoke<Progress[]>("continue_watching", { profile }),
  getSetting: (profile: number, key: string) => invoke<string | null>("get_setting", { profile, key }),
  setSetting: (profile: number, key: string, value: string) => invoke<void>("set_setting", { profile, key, value }),
};

/** Metadata-only addon (no streams). Offered on first run so Home isn't empty. */
export const CINEMETA_URL = "https://v3-cinemeta.strem.io/manifest.json";
