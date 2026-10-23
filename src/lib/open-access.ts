import { invoke } from "@tauri-apps/api/core";

export type OaMediaType = "article" | "lecture_video" | "audiobook" | "manuscript";

export type OaSource = {
  id: string;
  name: string;
  baseUrl: string;
  protocol: "oai_pmh";
  lastSyncedAt: string | null;
  enabled: boolean;
  recordCount: number;
};

export type OaSegment = { text: string; hit: boolean };

export type OaHit = {
  id: string;
  sourceId: string;
  title: string;
  authors: string | null;
  snippet: OaSegment[];
  mediaType: OaMediaType;
  directUrl: string;
  publishedYear: number | null;
};

export type OaSyncReport = { pages: number; upserted: number; deleted: number; complete: boolean };

export const addOaSource = (name: string, url: string) =>
  invoke<OaSource>("add_oa_source", { name, url, protocol: "oai_pmh" });

export const listOaSources = () => invoke<OaSource[]>("list_oa_sources");

export const setOaSourceEnabled = (sourceId: string, enabled: boolean) =>
  invoke<void>("set_oa_source_enabled", { sourceId, enabled });

export const removeOaSource = (sourceId: string) => invoke<void>("remove_oa_source", { sourceId });

export const syncOaSource = (sourceId: string) => invoke<OaSyncReport>("sync_oa_source", { sourceId });

export const searchOpenAccess = (query: string, filterType?: OaMediaType, limit = 25) =>
  invoke<OaHit[]>("search_open_access", { query, filterType: filterType ?? null, limit });
