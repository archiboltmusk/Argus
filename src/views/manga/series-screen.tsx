import { ArrowLeft, Bookmark, BookmarkCheck, Check, Circle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { fetchSeries } from "@/lib/manga/client";
import { resumeTarget, unreadCount } from "@/lib/manga/reader-logic";
import {
  addToLibrary,
  entryKey,
  getSource,
  removeFromLibrary,
  setChapterRead,
  useMangaLibrary,
  useMangaProgress,
} from "@/lib/manga/store";
import { titleFromPath } from "@/lib/manga/cbz";
import { LOCAL_SOURCE_ID, type Chapter, type SeriesDetail } from "@/lib/manga/types";

export type SeriesRef = { sourceId: string; seriesId: string; title: string; cover?: string };

export function SeriesScreen({
  series,
  onBack,
  onRead,
}: {
  series: SeriesRef;
  onBack: () => void;
  onRead: (detail: SeriesDetail, chapterId: string, startPage: number) => void;
}) {
  const t = useT();
  const key = entryKey(series.sourceId, series.seriesId);
  const library = useMangaLibrary();
  const progress = useMangaProgress()[key];
  const saved = library.some((e) => e.key === key);
  const [remote, setRemote] = useState<SeriesDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const local = useMemo<SeriesDetail | null>(() => {
    if (series.sourceId !== LOCAL_SOURCE_ID) return null;
    const title = series.title || titleFromPath(series.seriesId);
    return {
      id: series.seriesId,
      title,
      cover: series.cover,
      chapters: [{ id: series.seriesId, number: null, title }],
    };
  }, [series.sourceId, series.seriesId, series.title, series.cover]);

  const source = local ? undefined : getSource(series.sourceId);
  const missingSource = !local && !source;

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    fetchSeries(source, series.seriesId).then(
      (d) => !cancelled && setRemote(d),
      (e) => !cancelled && setFetchError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      cancelled = true;
    };
  }, [source, series.seriesId]);

  const detail = local ?? remote;
  const error = missingSource
    ? t("This source was removed. Add it again in Settings to keep reading.")
    : fetchError;
  const chapters = useMemo(() => detail?.chapters ?? [], [detail]);
  const target = useMemo(() => resumeTarget(chapters, progress), [chapters, progress]);
  const readSet = useMemo(() => new Set(progress?.read ?? []), [progress]);
  const title = detail?.title ?? series.title;
  const cover = detail?.cover ?? series.cover;

  const toggleSaved = () => {
    if (saved) removeFromLibrary(key);
    else
      addToLibrary({
        sourceId: series.sourceId,
        seriesId: series.seriesId,
        title,
        cover,
      });
  };

  const open = (c: Chapter, page = 0) => detail && onRead(detail, c.id, page);

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-2 text-[13px] text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={15} />
        {t("Back")}
      </button>

      <div className="flex gap-6">
        <div className="aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-xl bg-elevated ring-1 ring-edge-soft">
          {cover && (
            <img src={cover} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="text-[22px] font-semibold text-ink">{title}</h2>
          <div className="text-[12.5px] text-ink-muted">
            {[detail?.author, detail?.status, detail?.tags?.slice(0, 4).join(", ")]
              .filter(Boolean)
              .join(" · ")}
          </div>
          {detail?.description && (
            <p className="line-clamp-5 max-w-2xl text-[13px] text-ink-muted">{detail.description}</p>
          )}
          <div className="flex flex-wrap gap-3">
            {target && (
              <button
                type="button"
                onClick={() => open(target.chapter, target.page)}
                className="rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white"
              >
                {progress?.last ? t("Continue: {title}", { title: target.chapter.title }) : t("Start reading")}
              </button>
            )}
            <button
              type="button"
              onClick={toggleSaved}
              className="flex items-center gap-2 rounded-xl bg-elevated px-4 py-2 text-[13px] text-ink ring-1 ring-edge-soft hover:ring-accent"
            >
              {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
              {saved ? t("In library") : t("Add to library")}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="text-[13px] text-red-400">{error}</div>}
      {!detail && !error && <div className="text-[13px] text-ink-muted">{t("Loading…")}</div>}

      {detail && detail.chapters.length > 1 && (
        <section className="flex flex-col gap-2">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">
            {t("{n} chapters · {unread} unread", {
              n: chapters.length,
              unread: unreadCount(chapters, progress),
            })}
          </div>
          <ul className="flex flex-col divide-y divide-edge-soft/60 rounded-2xl border border-edge-soft bg-elevated/30">
            {[...chapters].reverse().map((c) => {
              const read = readSet.has(c.id);
              return (
                <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => open(c, progress?.last?.chapterId === c.id && !read ? progress.last.page : 0)}
                    className={`min-w-0 flex-1 truncate text-start text-[13.5px] hover:text-accent ${
                      read ? "text-ink-subtle" : "text-ink"
                    }`}
                  >
                    {c.title}
                    {c.group && <span className="text-ink-subtle"> · {c.group}</span>}
                  </button>
                  {c.date && <span className="shrink-0 text-[11.5px] text-ink-subtle">{c.date.slice(0, 10)}</span>}
                  <button
                    type="button"
                    aria-label={read ? t("Mark unread") : t("Mark read")}
                    aria-pressed={read}
                    onClick={() => setChapterRead(key, c.id, !read)}
                    className="shrink-0 text-ink-subtle hover:text-ink"
                  >
                    {read ? <Check size={15} /> : <Circle size={15} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
