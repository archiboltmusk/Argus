import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { addBookmark, updateBook, usePrefs, useBook } from "@/lib/ebook/books";
import type { BookRecord } from "@/lib/ebook/books-core";
import {
  flattenToc,
  htmlToText,
  locateProgress,
  openEpub,
  overallProgress,
  spineIndexForHref,
  splitHref,
  type EpubBook,
} from "@/lib/ebook/epub";
import {
  READER_BACKGROUND,
  readerCss,
  renderChapter,
  type RenderedChapter,
} from "@/lib/ebook/epub-render";
import { BookmarksPanel, PanelTitle, ReaderShell, type PanelId } from "./reader-shell";
import { ReadingSettings } from "./settings-panel";

type Target = { chapter: number; fraction: number; anchor?: string };
type Shown = RenderedChapter & { chapter: number };
type Hit = { chapter: number; fraction: number; snippet: string };

function writeShadow(root: ShadowRoot, html: string) {
  root.innerHTML = html;
}

const cssEscape = (v: string) =>
  typeof CSS !== "undefined" && CSS.escape ? CSS.escape(v) : v.replace(/["\\]/g, "\\$&");

export function EpubReader({ record, onClose }: { record: BookRecord; onClose: () => void }) {
  const t = useT();
  const prefs = usePrefs();
  const live = useBook(record.id) ?? record;
  const [book, setBook] = useState<EpubBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chapter, setChapter] = useState(record.chapter);
  const [rendered, setRendered] = useState<Shown | null>(null);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [page, setPage] = useState({ index: 0, count: 1 });
  const [progress, setProgress] = useState(record.progress);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<ShadowRoot | null>(null);
  const pending = useRef<Target | null>({ chapter: record.chapter, fraction: record.fraction });
  const fractionRef = useRef(record.fraction);
  const pageRef = useRef({ index: 0, count: 1 });
  const urlsRef = useRef<string[]>([]);
  const shownRef = useRef(-1);
  const chapterRef = useRef(chapter);
  const [initial] = useState({ chapter: record.chapter, fraction: record.fraction });
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { readFile } = await import("@tauri-apps/plugin-fs");
        const opened = await openEpub(await readFile(record.path));
        if (cancelled) return;
        const start = Math.min(initial.chapter, opened.spine.length - 1);
        pending.current = { chapter: start, fraction: initial.fraction };
        chapterRef.current = start;
        setBook(opened);
        setChapter(start);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [record.path, initial]);

  const persist = useCallback(
    (nextChapter: number, fraction: number) => {
      if (!book) return;
      const p = overallProgress(book, nextChapter, fraction);
      setProgress(p);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(
        () =>
          updateBook(record.id, {
            chapter: nextChapter,
            fraction,
            progress: p,
            openedAt: Date.now(),
          }),
        500,
      );
    },
    [book, record.id],
  );

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  // Load the current chapter's markup.
  useEffect(() => {
    if (!book) return;
    let cancelled = false;
    void renderChapter(book, chapter, { publisherStyles: prefs.publisherStyles })
      .then((next) => {
        if (cancelled) {
          next.urls.forEach(URL.revokeObjectURL);
          return;
        }
        const old = urlsRef.current;
        urlsRef.current = next.urls;
        setRendered({ ...next, chapter });
        queueMicrotask(() => old.forEach(URL.revokeObjectURL));
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [book, chapter, prefs.publisherStyles]);

  useEffect(() => () => urlsRef.current.forEach(URL.revokeObjectURL), []);

  const layout = useCallback(() => {
    const root = shadowRef.current;
    const sc = scrollerRef.current;
    const body = root?.querySelector<HTMLElement>(".epub-body");
    if (!root || !sc || !body) return;
    const paged = prefs.layout === "paged";
    const w = sc.clientWidth;
    const h = sc.clientHeight;
    const m = prefs.margin;
    const style = root.querySelector<HTMLStyleElement>("style[data-layout]");
    if (style) {
      const css = paged
        ? `.epub-body{width:${w}px;height:${h}px;padding:28px ${m}px;column-width:${Math.max(120, w - 2 * m)}px;column-gap:${2 * m}px;column-fill:auto}.epub-body img,.epub-body svg{max-height:${Math.max(120, h - 72)}px;object-fit:contain}`
        : `.epub-body{max-width:${Math.max(320, 760 + m)}px;margin:0 auto;padding:36px ${m}px 120px}`;
      if (style.textContent !== css) style.textContent = css;
    }
    const target =
      pending.current && pending.current.chapter === shownRef.current ? pending.current : null;
    if (target) pending.current = null;
    const fraction = target ? target.fraction : fractionRef.current;
    if (paged) {
      const count =
        body.scrollWidth <= w + 1 ? 1 : Math.ceil((body.scrollWidth + m - 2) / Math.max(1, w));
      let index = Math.round(fraction * (count - 1));
      if (target?.anchor) {
        const el = root.querySelector<HTMLElement>(`[id="${cssEscape(target.anchor)}"]`);
        if (el)
          index = Math.min(
            count - 1,
            Math.max(
              0,
              Math.floor((el.getBoundingClientRect().left - body.getBoundingClientRect().left) / w),
            ),
          );
      }
      pageRef.current = { index, count };
      setPage({ index, count });
      body.style.transform = `translateX(${-index * w}px)`;
      sc.scrollTop = 0;
      fractionRef.current = count > 1 ? index / (count - 1) : 0;
    } else {
      body.style.transform = "";
      const max = Math.max(0, sc.scrollHeight - sc.clientHeight);
      const el = target?.anchor
        ? root.querySelector<HTMLElement>(`[id="${cssEscape(target.anchor)}"]`)
        : null;
      sc.scrollTop = el
        ? el.getBoundingClientRect().top - body.getBoundingClientRect().top
        : fraction * max;
      fractionRef.current = max > 0 ? Math.min(1, sc.scrollTop / max) : 0;
    }
    if (target) persist(target.chapter, fractionRef.current);
  }, [prefs.layout, prefs.margin, persist]);

  // Write the chapter into the shadow root, then lay it out.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !rendered) return;
    const root = shadowRef.current ?? host.attachShadow({ mode: "open" });
    shadowRef.current = root;
    shownRef.current = rendered.chapter;
    writeShadow(
      root,
      `<style>${readerCss(prefs)}</style><style>${rendered.css}</style><style data-layout></style><div class="epub-body">${rendered.html}</div>`,
    );
    layout();
    // <style> elements fire load too, and layout() edits one, so only react to images.
    const onLoad = (e: Event) => {
      if ((e.target as Element).localName === "img") layout();
    };
    root.addEventListener("load", onLoad, true);
    return () => root.removeEventListener("load", onLoad, true);
  }, [rendered, prefs, layout]);

  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const ro = new ResizeObserver(() => layout());
    ro.observe(sc);
    return () => ro.disconnect();
  }, [layout]);

  const go = useCallback(
    (target: Target) => {
      pending.current = target;
      fractionRef.current = target.fraction;
      if (target.chapter === chapterRef.current) layout();
      else {
        chapterRef.current = target.chapter;
        setChapter(target.chapter);
      }
    },
    [layout],
  );

  const goHref = useCallback(
    (href: string) => {
      if (!book) return;
      const { path, fragment } = splitHref(href);
      const idx = spineIndexForHref(book, path);
      if (idx < 0) return;
      go({
        chapter: idx,
        fraction: idx === chapterRef.current ? fractionRef.current : 0,
        anchor: fragment || undefined,
      });
    },
    [book, go],
  );

  // Links inside the chapter.
  useEffect(() => {
    const root = shadowRef.current;
    if (!root || !book) return;
    const onClick = (e: Event) => {
      const a = (e.target as Element).closest?.("a");
      if (!a) return;
      e.preventDefault();
      const internal = a.getAttribute("data-epub");
      const fragment = a.getAttribute("data-fragment");
      const external = a.getAttribute("data-external");
      if (internal) goHref(internal);
      else if (fragment) goHref(`${book.spine[chapter].path}#${fragment}`);
      else if (external) void import("@tauri-apps/plugin-opener").then((m) => m.openUrl(external));
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [book, chapter, goHref, rendered]);

  const paged = prefs.layout === "paged";

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!book) return;
      const sc = scrollerRef.current;
      if (paged) {
        const { index, count } = pageRef.current;
        const next = index + dir;
        if (next >= 0 && next < count) {
          const body = shadowRef.current?.querySelector<HTMLElement>(".epub-body");
          if (body && sc) body.style.transform = `translateX(${-next * sc.clientWidth}px)`;
          pageRef.current = { index: next, count };
          setPage({ index: next, count });
          const f = count > 1 ? next / (count - 1) : 0;
          fractionRef.current = f;
          persist(chapter, f);
        } else if (dir === 1 && chapter < book.spine.length - 1)
          go({ chapter: chapter + 1, fraction: 0 });
        else if (dir === -1 && chapter > 0) go({ chapter: chapter - 1, fraction: 1 });
      } else if (sc) {
        const atEnd = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2;
        const atStart = sc.scrollTop <= 0;
        if (dir === 1 && atEnd && chapter < book.spine.length - 1)
          go({ chapter: chapter + 1, fraction: 0 });
        else if (dir === -1 && atStart && chapter > 0) go({ chapter: chapter - 1, fraction: 1 });
        else sc.scrollBy({ top: dir * sc.clientHeight * 0.9, behavior: "smooth" });
      }
    },
    [book, chapter, go, paged, persist],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) step(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp" || (e.key === " " && e.shiftKey))
        step(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const onScroll = useCallback(() => {
    if (paged) return;
    const sc = scrollerRef.current;
    if (!sc || shownRef.current !== chapter) return;
    const max = sc.scrollHeight - sc.clientHeight;
    const f = max > 0 ? Math.min(1, Math.max(0, sc.scrollTop / max)) : 0;
    fractionRef.current = f;
    persist(chapter, f);
  }, [chapter, paged, persist]);

  const onPageClick = (e: React.MouseEvent) => {
    if (!paged) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x < 0.22) step(-1);
    else if (x > 0.78) step(1);
  };

  const toc = useMemo(() => (book ? flattenToc(book.toc) : []), [book]);
  const tocChapters = useMemo(
    () => (book ? toc.map((e) => spineIndexForHref(book, splitHref(e.href).path)) : []),
    [book, toc],
  );
  const chapterLabel = useCallback(
    (index: number) => {
      let best = -1;
      tocChapters.forEach((c, i) => {
        if (c >= 0 && c <= index) best = i;
      });
      return best >= 0 ? toc[best].label : `${t("Chapter")} ${index + 1}`;
    },
    [toc, tocChapters, t],
  );

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);
  const runSearch = async () => {
    const q = query.trim().toLowerCase();
    if (!book || q.length < 2) return setHits(null);
    const seq = ++searchSeq.current;
    setSearching(true);
    const found: Hit[] = [];
    for (let i = 0; i < book.spine.length && found.length < 100; i++) {
      const text = htmlToText((await book.zip.readText(book.spine[i].path)) ?? "");
      const lower = text.toLowerCase();
      let at = lower.indexOf(q);
      let perChapter = 0;
      while (at >= 0 && perChapter < 5 && found.length < 100) {
        const from = Math.max(0, at - 40);
        found.push({
          chapter: i,
          fraction: text.length > 0 ? at / text.length : 0,
          snippet: `${from > 0 ? "…" : ""}${text.slice(from, at + q.length + 60)}…`,
        });
        perChapter++;
        at = lower.indexOf(q, at + q.length);
      }
      if (seq !== searchSeq.current) return;
    }
    setHits(found);
    setSearching(false);
  };

  const sidePanel =
    panel === "toc" ? (
      <>
        <PanelTitle>{t("Contents")}</PanelTitle>
        {toc.length === 0 && (
          <p className="text-[13px] text-ink-muted">{t("This book has no table of contents.")}</p>
        )}
        <ul className="flex flex-col">
          {toc.map((e, i) => (
            <li key={`${e.href}-${i}`}>
              <button
                type="button"
                onClick={() => {
                  goHref(e.href);
                  setPanel(null);
                }}
                style={{ paddingLeft: 12 + e.depth * 14 }}
                className={`w-full rounded-lg py-2 pr-3 text-left text-[13px] hover:bg-raised ${
                  tocChapters[i] === chapter ? "font-semibold text-ink" : "text-ink-muted"
                }`}
              >
                {e.label}
              </button>
            </li>
          ))}
        </ul>
      </>
    ) : panel === "marks" ? (
      <BookmarksPanel
        book={live}
        label={(m) => chapterLabel(m.chapter)}
        onOpen={(m) => {
          go({ chapter: m.chapter, fraction: m.fraction });
          setPanel(null);
        }}
      />
    ) : panel === "search" ? (
      <>
        <PanelTitle>{t("Search in book")}</PanelTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch();
          }}
          className="mb-3"
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search text…")}
            className="w-full rounded-xl border border-edge-soft bg-canvas px-3 py-2 text-[13px] outline-none focus:border-ink-muted"
          />
        </form>
        {searching && <p className="text-[13px] text-ink-muted">{t("Searching…")}</p>}
        {hits && hits.length === 0 && !searching && (
          <p className="text-[13px] text-ink-muted">{t("No matches.")}</p>
        )}
        <ul className="flex flex-col gap-1">
          {(hits ?? []).map((h, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  go({ chapter: h.chapter, fraction: h.fraction });
                  setPanel(null);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-[12.5px] hover:bg-raised"
              >
                <div className="mb-0.5 text-[11px] font-semibold text-ink-subtle">
                  {chapterLabel(h.chapter)}
                </div>
                {h.snippet}
              </button>
            </li>
          ))}
        </ul>
      </>
    ) : panel === "settings" ? (
      <ReadingSettings prefs={prefs} />
    ) : null;

  if (error) {
    return (
      <ReaderShell
        title={record.title}
        panel={null}
        onPanel={() => {}}
        onClose={onClose}
        onBookmark={() => {}}
        hasToc={false}
        hasSearch={false}
        hasSettings={false}
        sidePanel={null}
        footer={null}
      >
        <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
          <p className="text-[15px] font-semibold">{t("This book could not be opened.")}</p>
          <p className="text-[13px] text-ink-muted">{error}</p>
        </div>
      </ReaderShell>
    );
  }

  const pct = Math.round(progress * 100);
  return (
    <ReaderShell
      title={book?.meta.title ?? record.title}
      subtitle={book ? chapterLabel(chapter) : undefined}
      panel={panel}
      onPanel={setPanel}
      onClose={onClose}
      onBookmark={() =>
        book &&
        addBookmark(record.id, {
          label: chapterLabel(chapter),
          chapter,
          fraction: fractionRef.current,
          progress: overallProgress(book, chapter, fractionRef.current),
        })
      }
      hasToc={toc.length > 0}
      hasSearch
      hasSettings
      sidePanel={sidePanel}
      footer={
        <div className="flex items-center gap-3 text-[12px] text-ink-muted">
          <span className="w-24 shrink-0 tabular-nums">
            {paged
              ? `${t("Page")} ${page.index + 1}/${page.count}`
              : `${t("Chapter")} ${chapter + 1}/${book?.spine.length ?? 1}`}
          </span>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(progress * 1000)}
            disabled={!book}
            aria-label={t("Reading progress")}
            onChange={(e) => book && go(locateProgress(book, Number(e.target.value) / 1000))}
            className="min-w-0 flex-1 accent-current"
          />
          <span className="w-10 shrink-0 text-right tabular-nums">{pct}%</span>
        </div>
      }
    >
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onClick={onPageClick}
        style={{ background: READER_BACKGROUND[prefs.theme] }}
        className={`absolute inset-0 ${paged ? "overflow-hidden" : "overflow-y-auto"}`}
      >
        {!rendered && !error && (
          <div className="p-8 text-[13px] text-ink-muted">{t("Opening…")}</div>
        )}
        <div ref={hostRef} />
      </div>
    </ReaderShell>
  );
}
