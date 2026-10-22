import { FolderOpen, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { searchSeries } from "@/lib/manga/client";
import { canOpenLocalFiles, importLocalCbz } from "@/lib/manga/local";
import { useMangaSources } from "@/lib/manga/store";
import type { SeriesSummary } from "@/lib/manga/types";
import { LOCAL_SOURCE_ID } from "@/lib/manga/types";
import { CoverGrid } from "./cover-grid";

export function BrowseTab({
  onOpen,
  onOpenSettings,
}: {
  onOpen: (sourceId: string, seriesId: string, title: string, cover?: string) => void;
  onOpenSettings: () => void;
}) {
  const t = useT();
  const sources = useMangaSources().filter((s) => s.enabled);
  const [sourceId, setSourceId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SeriesSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const source = sources.find((s) => s.id === sourceId) ?? sources[0];

  const run = async (q: string, nextPage: number) => {
    if (!source) return;
    const req = ++requestRef.current;
    setBusy(true);
    setError(null);
    try {
      const res = await searchSeries(source, q, nextPage);
      if (req !== requestRef.current) return;
      setResults((cur) => (nextPage === 1 ? res.results : [...cur, ...res.results]));
      setPage(nextPage);
      setHasMore(res.hasMore);
    } catch (e) {
      if (req !== requestRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (req === requestRef.current) setBusy(false);
    }
  };

  useEffect(() => {
    if (!source) return;
    // a new source starts from its default listing
    const timer = window.setTimeout(() => void run(query, 1), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.id]);

  const openLocal = async () => {
    setError(null);
    try {
      const picked = await importLocalCbz();
      if (picked) onOpen(LOCAL_SOURCE_ID, picked.path, picked.title);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        {sources.length > 0 && (
          <>
            <select
              value={source?.id ?? ""}
              onChange={(e) => setSourceId(e.target.value)}
              aria-label={t("Source")}
              className="h-10 rounded-xl bg-canvas/60 px-3 text-[13px] text-ink ring-1 ring-edge-soft outline-none focus:ring-accent"
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <form
              className="relative min-w-[220px] flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                void run(query.trim(), 1);
              }}
            >
              <Search size={15} className="pointer-events-none absolute start-3 top-3 text-ink-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search {name}", { name: source?.name ?? "" })}
                className="h-10 w-full rounded-xl bg-canvas/60 ps-9 pe-3 text-[13px] text-ink ring-1 ring-edge-soft outline-none focus:ring-accent"
              />
            </form>
          </>
        )}
        {canOpenLocalFiles && (
          <button
            type="button"
            onClick={() => void openLocal()}
            className="flex h-10 items-center gap-2 rounded-xl bg-elevated px-3 text-[13px] text-ink ring-1 ring-edge-soft hover:ring-accent"
          >
            <FolderOpen size={15} />
            {t("Open CBZ file")}
          </button>
        )}
      </div>

      {sources.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-edge-soft bg-elevated/40 p-6">
          <div className="text-[15px] font-medium text-ink">{t("No manga sources yet")}</div>
          <div className="max-w-xl text-[13px] text-ink-muted">
            {t(
              "Argus ships with no sources. Add the address of a source you trust in Settings, or open a CBZ file from your computer.",
            )}
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white"
          >
            {t("Add a source")}
          </button>
        </div>
      )}

      {error && <div className="text-[13px] text-red-400">{error}</div>}

      {results.length > 0 && (
        <CoverGrid
          items={results.map((r) => ({
            key: r.id,
            title: r.title,
            cover: r.cover,
            subtitle: r.author,
          }))}
          onOpen={(id) => {
            const r = results.find((x) => x.id === id);
            if (r && source) onOpen(source.id, r.id, r.title, r.cover);
          }}
        />
      )}
      {source && !busy && !error && results.length === 0 && (
        <div className="text-[13px] text-ink-muted">{t("Nothing found.")}</div>
      )}
      {busy && <div className="text-[13px] text-ink-muted">{t("Loading…")}</div>}
      {hasMore && !busy && (
        <button
          type="button"
          onClick={() => void run(query.trim(), page + 1)}
          className="w-fit rounded-xl bg-elevated px-4 py-2 text-[13px] text-ink ring-1 ring-edge-soft hover:ring-accent"
        >
          {t("Load more")}
        </button>
      )}
    </div>
  );
}
