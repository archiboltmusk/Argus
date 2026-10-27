import type { ArxRecipeManifest } from "./arx-recipe";
import { composeProviderSource } from "@/lib/streams/plugins/provider-compat/prelude";
import type { PluginStream, StreamPluginRequest } from "@/lib/streams/plugins/types";

const SHADOW = [
  "self",
  "globalThis",
  "window",
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "importScripts",
  "indexedDB",
  "caches",
  "Worker",
  "SharedWorker",
  "BroadcastChannel",
  "MessageChannel",
  "postMessage",
  "close",
  "navigator",
  "location",
  "document",
  "Request",
  "Response",
];

type HostBridgeContext = {
  http?: (url: string, opts: Record<string, unknown>) => Promise<unknown>;
  log?: (msg: string) => void;
};

type RegisteredPlugin = {
  streams?: (req: unknown) => Promise<PluginStream[]>;
  getStreams?: (tmdbId: number, mediaType: string, season?: number, episode?: number) => Promise<PluginStream[]>;
};

export async function runArxRecipeInHost(
  recipe: ArxRecipeManifest,
  req: {
    type: "movie" | "series";
    id: string;
    tmdb?: { id: number; kind: "movie" | "tv" };
    title?: string;
    year?: number;
    season?: number | null;
    episode?: number | null;
  },
  bridgeCtx: HostBridgeContext = {},
): Promise<PluginStream[]> {
  let registered: RegisteredPlugin | null = null;
  let pluginRef: unknown = null;

  const argus = {
    http: bridgeCtx.http || (async () => ({ status: 200, ok: true, body: "" })),
    log: bridgeCtx.log || (() => {}),
    grpc: async () => ({}),
    parseHtml: async () => ({}),
    register: (p: RegisteredPlugin) => {
      registered = p;
    },
  };

  const composed = composeProviderSource(recipe.code, {
    id: recipe.id,
    name: recipe.name,
    settings: {},
  });

  const factory = new Function(
    ...["argus", ...SHADOW],
    `"use strict";\n${composed}\n;return (typeof plugin !== 'undefined') ? plugin : undefined;`,
  );

  pluginRef = factory(argus, ...SHADOW.map(() => undefined));

  const target = (registered ?? pluginRef) as RegisteredPlugin | null;
  if (!target || typeof target.streams !== "function") {
    throw new Error(`recipe-failed: no getStreams function registered by ${recipe.id}`);
  }

  const result = await target.streams({
    type: req.type,
    id: req.id,
    ids: [req.id],
    imdbId: req.id.startsWith("tt") ? req.id : undefined,
    tmdb: req.tmdb,
    title: req.title,
    year: req.year,
    season: req.season,
    episode: req.episode,
    absoluteEpisode: null,
    settings: {},
  } as StreamPluginRequest);

  return Array.isArray(result) ? (result as PluginStream[]) : [];
}
