import { RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import {
  addOaSource,
  listOaSources,
  removeOaSource,
  searchOpenAccess,
  setOaSourceEnabled,
  syncOaSource,
  type OaHit,
  type OaSource,
} from "@/lib/open-access";
import { openUrl } from "@/lib/window";

const FIELD =
  "h-10 w-full rounded-xl bg-canvas/60 px-3 text-[13px] text-ink ring-1 ring-edge-soft outline-none focus:ring-accent";

const message = (e: unknown) => (typeof e === "string" ? e : "Something went wrong.");

export function OpenAccessSection() {
  const t = useT();
  const [sources, setSources] = useState<OaSource[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<OaHit[] | null>(null);

  const refresh = useCallback(
    () =>
      listOaSources()
        .then(setSources)
        .catch((e) => setNotice(message(e))),
    [],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (key: string, job: () => Promise<string | void>) => {
    setBusy(key);
    setNotice(null);
    try {
      const done = await job();
      if (done) setNotice(done);
    } catch (e) {
      setNotice(message(e));
    } finally {
      setBusy(null);
      void refresh();
    }
  };

  const search = async (text: string) => {
    setQuery(text);
    if (!text.trim()) return setHits(null);
    try {
      setHits(await searchOpenAccess(text));
    } catch (e) {
      setNotice(message(e));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {sources.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-3 rounded-xl bg-elevated/40 px-4 py-3 ring-1 ring-edge-soft/60"
        >
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium text-ink">{s.name}</div>
            <div className="truncate text-[11.5px] text-ink-subtle">
              {new URL(s.baseUrl).host} · {s.recordCount} {t("records")}
              {s.lastSyncedAt ? ` · ${s.lastSyncedAt.slice(0, 10)}` : ""}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={t("Sync")}
              disabled={busy !== null || !s.enabled}
              onClick={() =>
                run(s.id, async () => {
                  const r = await syncOaSource(s.id);
                  return r.complete
                    ? `${s.name}: ${r.upserted} ${t("records")}`
                    : `${s.name}: ${r.upserted} ${t("records")} · ${t("Sync again to continue.")}`;
                })
              }
              className="text-ink-subtle transition-colors hover:text-ink disabled:opacity-40"
            >
              <RefreshCw size={15} className={busy === s.id ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={s.enabled}
              onClick={() => run(s.id, () => setOaSourceEnabled(s.id, !s.enabled))}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                s.enabled ? "bg-accent/15 text-accent" : "bg-canvas/70 text-ink-subtle"
              }`}
            >
              {s.enabled ? t("On") : t("Off")}
            </button>
            <button
              type="button"
              aria-label={t("Remove")}
              onClick={() => run(s.id, () => removeOaSource(s.id))}
              className="text-ink-subtle transition-colors hover:text-ink"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-2 rounded-xl bg-elevated/30 p-3 ring-1 ring-edge-soft/50">
        <input className={FIELD} placeholder={t("Name")} value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className={FIELD}
          placeholder={t("OAI-PMH address, e.g. https://export.arxiv.org/oai2?set=cs")}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="button"
          disabled={busy !== null || !name.trim() || !url.trim()}
          onClick={() =>
            run("add", async () => {
              await addOaSource(name.trim(), url.trim());
              setName("");
              setUrl("");
            })
          }
          className="h-10 w-fit rounded-full bg-ink px-5 text-[13px] font-semibold text-canvas transition-opacity disabled:opacity-40"
        >
          {t("Add repository")}
        </button>
      </div>
      {notice ? <div className="text-[12px] text-ink-subtle">{notice}</div> : null}
      <input
        className={FIELD}
        placeholder={t("Search the index")}
        value={query}
        onChange={(e) => void search(e.target.value)}
      />
      {hits?.length === 0 ? <div className="text-[12px] text-ink-subtle">{t("No matches.")}</div> : null}
      {hits?.map((h) => (
        <button
          key={h.id}
          type="button"
          onClick={() => openUrl(h.directUrl)}
          className="flex flex-col gap-1 rounded-xl bg-elevated/40 px-4 py-3 text-left ring-1 ring-edge-soft/60 transition-colors hover:bg-elevated/70"
        >
          <span className="text-[14px] font-medium text-ink">{h.title}</span>
          <span className="text-[11.5px] text-ink-subtle">
            {[h.authors, h.publishedYear].filter(Boolean).join(" · ")}
          </span>
          <span className="text-[12px] text-ink-subtle">
            {h.snippet.map((p, i) =>
              p.hit ? (
                <b key={i} className="text-ink">
                  {p.text}
                </b>
              ) : (
                <span key={i}>{p.text}</span>
              ),
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
