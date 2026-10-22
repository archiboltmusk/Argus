import { safeFetch as fetch } from "@/lib/safe-fetch";
import { buildSearchUrl, parseFeed, type Indexer, type IndexerQuery } from "./indexer-feed";
import type { Stream } from "./types";

export type { Indexer, IndexerQuery } from "./indexer-feed";

const TIMEOUT_MS = 12_000;

async function search(indexer: Indexer, q: IndexerQuery, signal: AbortSignal): Promise<Stream[]> {
  for (const mode of ["id", "text"] as const) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    const onAbort = () => ctl.abort();
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      const res = await fetch(buildSearchUrl(indexer, q, mode), { signal: ctl.signal });
      if (!res.ok) return [];
      const streams = parseFeed(await res.text(), indexer);
      if (streams.length > 0) return streams;
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    }
  }
  return [];
}

// Indexers are endpoints the user added themselves; nothing ships preconfigured.
export async function fetchIndexerStreams(
  indexers: Indexer[],
  q: IndexerQuery,
  signal: AbortSignal,
): Promise<Stream[]> {
  const active = indexers.filter((i) => i.enabled && i.url && i.apiKey !== undefined);
  if (active.length === 0) return [];
  const settled = await Promise.allSettled(active.map((i) => search(i, q, signal)));
  return settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
