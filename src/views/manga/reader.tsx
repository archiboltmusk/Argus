import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  Rows3,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import {
  buildSpreads,
  chapterIndex,
  clickZone,
  displayOrder,
  spreadIndexOf,
} from "@/lib/manga/reader-logic";
import { setReaderPrefs, useReaderPrefs } from "@/lib/manga/store";
import type { Chapter, PageFit, ReaderMode, ReadingDirection } from "@/lib/manga/types";

export type LoadedPages = { pages: string[]; revoke?: () => void };

type Props = {
  title: string;
  chapters: Chapter[];
  chapterId: string;
  startPage: number;
  loadPages: (chapterId: string) => Promise<LoadedPages>;
  onProgress: (chapter: Chapter, page: number, total: number) => void;
  onChapter: (chapterId: string) => void;
  onClose: () => void;
};

const FIT_CLASS: Record<PageFit, string> = {
  width: "w-full h-auto",
  height: "h-full w-auto max-w-none",
  both: "max-h-full max-w-full object-contain",
};

export function MangaReader({
  title,
  chapters,
  chapterId,
  startPage,
  loadPages,
  onProgress,
  onChapter,
  onClose,
}: Props) {
  const t = useT();
  const prefs = useReaderPrefs();
  const idx = chapterIndex(chapters, chapterId);
  const chapter = chapters[idx];
  const prev = idx > 0 ? chapters[idx - 1] : undefined;
  const next = idx >= 0 ? chapters[idx + 1] : undefined;

  const [pages, setPages] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(startPage);
  const [menu, setMenu] = useState(true);
  const [wide, setWide] = useState<ReadonlySet<number>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: LoadedPages | null = null;
    loadPages(chapterId).then(
      (res) => {
        if (cancelled) {
          res.revoke?.();
          return;
        }
        loaded = res;
        setPages(res.pages);
        setPage(Math.min(Math.max(0, startPage), res.pages.length - 1));
      },
      (e) => !cancelled && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      cancelled = true;
      loaded?.revoke?.();
    };
    // startPage only seeds the first page of a chapter load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, loadPages]);

  const total = pages?.length ?? 0;

  useEffect(() => {
    if (!chapter || !pages) return;
    const timer = window.setTimeout(() => onProgress(chapter, page, pages.length), 350);
    return () => window.clearTimeout(timer);
  }, [chapter, pages, page, onProgress]);

  useEffect(() => {
    rootRef.current?.focus();
  }, [chapterId]);

  const spreads = useMemo(
    () => buildSpreads(total, wide, prefs.mode === "paged" && prefs.spread),
    [total, wide, prefs.mode, prefs.spread],
  );
  const spreadIdx = spreadIndexOf(spreads, page);

  const goChapter = useCallback(
    (target: Chapter | undefined) => {
      if (target) onChapter(target.id);
    },
    [onChapter],
  );

  const step = useCallback(
    (dir: 1 | -1) => {
      if (prefs.mode === "webtoon") return;
      const target = spreadIdx + dir;
      if (target < 0) return goChapter(prev);
      if (target >= spreads.length) return goChapter(next);
      setPage(spreads[target][0]);
    },
    [prefs.mode, spreadIdx, spreads, goChapter, prev, next],
  );

  const onKey = (e: React.KeyboardEvent) => {
    const rtl = prefs.direction === "rtl";
    switch (e.key) {
      case "ArrowRight":
        step(rtl ? -1 : 1);
        break;
      case "ArrowLeft":
        step(rtl ? 1 : -1);
        break;
      case " ":
      case "PageDown":
        if (prefs.mode === "paged") step(1);
        else return;
        break;
      case "PageUp":
        if (prefs.mode === "paged") step(-1);
        else return;
        break;
      case "Home":
        if (prefs.mode === "paged") setPage(0);
        else return;
        break;
      case "End":
        if (prefs.mode === "paged") setPage(Math.max(0, total - 1));
        else return;
        break;
      case "]":
        goChapter(next);
        break;
      case "[":
        goChapter(prev);
        break;
      case "m":
        setMenu((v) => !v);
        break;
      case "Escape":
        onClose();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const onStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const zone = clickZone(e.clientX - rect.left, rect.width, prefs.direction);
    if (prefs.mode === "webtoon" || zone === "menu") return setMenu((v) => !v);
    step(zone === "forward" ? 1 : -1);
  };

  const markWide = useCallback((i: number, w: boolean) => {
    if (!w) return;
    setWide((cur) => (cur.has(i) ? cur : new Set(cur).add(i)));
  }, []);

  // Warm the next spread so turning pages never waits on the network.
  useEffect(() => {
    if (!pages || prefs.mode !== "paged") return;
    for (const s of [spreads[spreadIdx + 1], spreads[spreadIdx + 2]]) {
      for (const p of s ?? []) {
        const img = new Image();
        img.referrerPolicy = "no-referrer";
        img.src = pages[p];
      }
    }
  }, [pages, spreads, spreadIdx, prefs.mode]);

  if (!chapter) return null;
  const label = chapter.title;

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKey}
      className="absolute inset-0 z-30 flex flex-col bg-black text-white outline-none"
    >
      {menu && (
        <header className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 bg-gradient-to-b from-black/85 to-transparent px-4 pb-8 pt-3">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close reader")}
            className="rounded-lg p-2 hover:bg-white/10"
          >
            <X size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-medium">{title}</div>
            <div className="truncate text-[12px] text-white/60">
              {label}
              {total > 0 && ` · ${Math.min(page + 1, total)} / ${total}`}
            </div>
          </div>
          <button
            type="button"
            disabled={!prev}
            onClick={() => goChapter(prev)}
            aria-label={t("Previous chapter")}
            className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30"
          >
            <SkipBack size={16} />
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() => goChapter(next)}
            aria-label={t("Next chapter")}
            className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-30"
          >
            <SkipForward size={16} />
          </button>
          <ReaderOptions />
        </header>
      )}

      {error && (
        <div className="m-auto flex flex-col items-center gap-3 text-center">
          <div className="text-[14px] text-white/80">{error}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-[13px] hover:bg-white/20"
          >
            {t("Close reader")}
          </button>
        </div>
      )}
      {!error && !pages && (
        <div className="m-auto text-[13px] text-white/60">{t("Loading chapter…")}</div>
      )}

      {pages && prefs.mode === "paged" && (
        <div
          onClick={onStageClick}
          className="flex min-h-0 flex-1 items-center justify-center gap-0 overflow-auto"
        >
          {displayOrder(spreads[spreadIdx] ?? [], prefs.direction).map((p) => (
            <img
              key={`${chapterId}:${p}`}
              src={pages[p]}
              alt={t("Page {n}", { n: p + 1 })}
              referrerPolicy="no-referrer"
              draggable={false}
              onLoad={(e) =>
                markWide(p, e.currentTarget.naturalWidth > e.currentTarget.naturalHeight)
              }
              className={`select-none ${FIT_CLASS[prefs.fit]} ${
                prefs.fit === "both" && (spreads[spreadIdx]?.length ?? 1) > 1
                  ? "max-w-[50%]"
                  : ""
              }`}
            />
          ))}
        </div>
      )}

      {pages && prefs.mode === "webtoon" && (
        <Webtoon
          key={chapterId}
          pages={pages}
          startPage={page}
          onPage={setPage}
          onTap={() => setMenu((v) => !v)}
          next={next}
          onNext={() => goChapter(next)}
        />
      )}

      {menu && pages && prefs.mode === "paged" && total > 1 && (
        <footer className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 to-transparent px-6 pb-4 pt-8">
          <input
            type="range"
            min={0}
            max={total - 1}
            value={page}
            dir={prefs.direction}
            onChange={(e) => setPage(Number(e.target.value))}
            aria-label={t("Page")}
            className="w-full accent-white"
          />
        </footer>
      )}
    </div>
  );
}

function Webtoon({
  pages,
  startPage,
  onPage,
  onTap,
  next,
  onNext,
}: {
  pages: string[];
  startPage: number;
  onPage: (p: number) => void;
  onTap: () => void;
  next: Chapter | undefined;
  onNext: () => void;
}) {
  const t = useT();
  const hostRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) onPage(Number((en.target as HTMLElement).dataset.page));
        }
      },
      { root: host, rootMargin: "-45% 0px -45% 0px" },
    );
    host.querySelectorAll("[data-page]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pages, onPage]);

  // Images above the resume point change height as they load, so re-anchor until they settle.
  useEffect(() => {
    if (startPage <= 0 || loaded > startPage + 1) return;
    hostRef.current
      ?.querySelector(`[data-page="${startPage}"]`)
      ?.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  return (
    <div ref={hostRef} onClick={onTap} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[900px] flex-col">
        {pages.map((src, i) => (
          <img
            key={src}
            data-page={i}
            src={src}
            alt={t("Page {n}", { n: i + 1 })}
            referrerPolicy="no-referrer"
            loading={i < startPage + 4 ? "eager" : "lazy"}
            draggable={false}
            onLoad={() => setLoaded((n) => n + 1)}
            className="block min-h-[40vh] w-full select-none"
          />
        ))}
        {next && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="m-8 rounded-xl bg-white/10 px-4 py-3 text-[14px] hover:bg-white/20"
          >
            {t("Next: {title}", { title: next.title })}
          </button>
        )}
      </div>
    </div>
  );
}

function ReaderOptions() {
  const t = useT();
  const prefs = useReaderPrefs();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={t("Reader options")}
        aria-expanded={open}
        className="rounded-lg p-2 hover:bg-white/10"
      >
        {prefs.mode === "webtoon" ? <Rows3 size={16} /> : <Columns2 size={16} />}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 flex w-64 flex-col gap-3 rounded-xl bg-neutral-900 p-3 text-[12.5px] shadow-xl ring-1 ring-white/10">
          <Choice<ReaderMode>
            label={t("Layout")}
            value={prefs.mode}
            options={[
              ["paged", t("Pages")],
              ["webtoon", t("Webtoon")],
            ]}
            onChange={(mode) => setReaderPrefs({ mode })}
          />
          {prefs.mode === "paged" && (
            <>
              <Choice<ReadingDirection>
                label={t("Direction")}
                value={prefs.direction}
                options={[
                  ["ltr", t("Left to right")],
                  ["rtl", t("Right to left")],
                ]}
                onChange={(direction) => setReaderPrefs({ direction })}
              />
              <Choice<PageFit>
                label={t("Fit")}
                value={prefs.fit}
                options={[
                  ["both", t("Screen")],
                  ["width", t("Width")],
                  ["height", t("Height")],
                ]}
                onChange={(fit) => setReaderPrefs({ fit })}
              />
              <Choice<"on" | "off">
                label={t("Two pages")}
                value={prefs.spread ? "on" : "off"}
                options={[
                  ["off", t("Off")],
                  ["on", t("On")],
                ]}
                onChange={(v) => setReaderPrefs({ spread: v === "on" })}
              />
            </>
          )}
          <div className="flex items-center gap-1 text-[11px] text-white/45">
            <ChevronLeft size={12} />
            <ChevronRight size={12} />
            {t("arrows turn pages · [ ] chapters · M menu")}
          </div>
        </div>
      )}
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-white/50">{label}</div>
      <div className="flex gap-1 rounded-lg bg-white/5 p-0.5">
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={(e) => {
              e.stopPropagation();
              onChange(v);
            }}
            className={`flex-1 rounded-md px-2 py-1 ${
              value === v ? "bg-white/20 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
