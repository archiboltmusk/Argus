import { LoaderCircle, Play, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  magnetFromHash,
  type DebridStore,
  type LibraryEntry,
} from "@/lib/debrid/types";
import { useDebridClients } from "@/lib/debrid/registry";
import { useT } from "@/lib/i18n";
import { useView } from "@/lib/view";

// TorBox has its own tab; Premiumize transfers carry no info hash, so they cannot be replayed from a list.
const BROWSABLE = new Set(["rd", "ad", "dl"]);

type Row = LibraryEntry & { store: DebridStore };

export function useBrowsableDebrids(): DebridStore[] {
  const clients = useDebridClients();
  return useMemo(() => clients.filter((c) => BROWSABLE.has(c.slug)), [clients]);
}

export function DebridCloudTab() {
  const t = useT();
  const stores = useBrowsableDebrids();
  const { openPlayer, openSettings } = useView();
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const playRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    setRows([]);
    setError("");
    if (!stores.length) return;
    const controller = new AbortController();
    setLoading(true);
    void Promise.allSettled(stores.map((s) => s.listLibrary(controller.signal)))
      .then((results) => {
        if (controller.signal.aborted) return;
        const next: Row[] = [];
        const failed: string[] = [];
        results.forEach((r, i) => {
          if (r.status === "fulfilled" && r.value.ok) {
            for (const e of r.value.data)
              if (e.hash) next.push({ ...e, store: stores[i] });
          } else failed.push(stores[i].name);
        });
        setRows(next);
        if (failed.length)
          setError(t("Could not load: {names}", { names: failed.join(", ") }));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      playRequest.current?.abort();
      playRequest.current = null;
    };
  }, [stores, revision, t]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  const play = async (row: Row) => {
    const id = `${row.slug}:${row.id}`;
    playRequest.current?.abort();
    const controller = new AbortController();
    playRequest.current = controller;
    setPlaying(id);
    setError("");
    try {
      const res = await row.store.playableUrl(
        magnetFromHash(row.hash),
        undefined,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (!res.ok) {
        setError(
          t("Could not play this download ({code})", { code: res.code }),
        );
        return;
      }
      const name = res.data.filename || row.name;
      openPlayer({
        meta: { id: `debrid-cloud:${id}`, type: "movie", name },
        url: res.data.url,
        title: name,
        subtitle: `${row.store.name} · ${row.name}`,
        notWebReady: res.data.notWebReady ?? true,
        resume: true,
        suppressCloudSync: true,
      });
    } finally {
      if (playRequest.current === controller) {
        playRequest.current = null;
        setPlaying(null);
      }
    }
  };

  if (!stores.length)
    return (
      <div className="rounded-2xl bg-elevated/40 p-8 text-ink-muted">
        <p>
          {t(
            "Add a Real-Debrid, AllDebrid or Debrid-Link key in Streaming Sources to browse your cloud here.",
          )}
        </p>
        <button
          type="button"
          onClick={() => openSettings("streaming")}
          className="mt-4 rounded-full bg-ink px-5 py-2 text-canvas"
        >
          {t("Connect a debrid service")}
        </button>
      </div>
    );

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold text-ink">
            {t("Debrid cloud")}
          </h2>
          <p className="text-sm text-ink-muted">
            {t("{n} completed downloads", { n: rows.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRevision((v) => v + 1)}
          disabled={loading}
          title={t("Refresh")}
          className="rounded-full bg-elevated p-2.5 text-ink"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("Search cloud downloads")}
        className="w-full rounded-full bg-elevated/60 px-5 py-3 text-ink outline-none placeholder:text-ink-subtle"
      />
      {error && (
        <p role="alert" className="rounded-xl bg-red-500/10 p-4 text-red-300">
          {error}
        </p>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-ink-muted">
          <LoaderCircle size={18} className="animate-spin" />
          {t("Loading…")}
        </div>
      )}
      {!loading && !visible.length && (
        <p className="py-10 text-center text-ink-muted">
          {t("No completed downloads found.")}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {visible.map((row) => {
          const id = `${row.slug}:${row.id}`;
          return (
            <button
              key={id}
              type="button"
              disabled={playing != null}
              onClick={() => void play(row)}
              className="flex items-center gap-4 rounded-xl bg-elevated/40 px-4 py-3 text-left text-ink transition-colors hover:bg-elevated disabled:opacity-60"
            >
              {playing === id ? (
                <LoaderCircle size={20} className="shrink-0 animate-spin" />
              ) : (
                <Play size={20} className="shrink-0" />
              )}
              <span className="min-w-0 flex-1 truncate">{row.name}</span>
              <span className="shrink-0 text-xs text-ink-muted">
                {row.store.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
