import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist/legacy/build/pdf.mjs";
import { useT } from "@/lib/i18n";
import { addBookmark, updateBook, usePrefs, useBook } from "@/lib/ebook/books";
import type { BookRecord } from "@/lib/ebook/books-core";
import { openPdf, pdfOutline, type PdfOutlineEntry } from "@/lib/ebook/pdf";
import { READER_BACKGROUND } from "@/lib/ebook/epub-render";
import { BookmarksPanel, PanelTitle, ReaderShell, type PanelId } from "./reader-shell";
import { ReadingSettings } from "./settings-panel";

const GAP = 16;

function PdfPage({
  doc,
  index,
  width,
  height,
  visible,
  onSize,
}: {
  doc: PDFDocumentProxy;
  index: number;
  width: number;
  height: number;
  visible: boolean;
  onSize: (index: number, ratio: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!visible) {
      canvas.width = 0;
      canvas.height = 0;
      return;
    }
    let task: RenderTask | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const page = await doc.getPage(index + 1);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        onSize(index, base.height / base.width);
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const viewport = page.getViewport({ scale: (width / base.width) * dpr });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${width}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        task = page.render({ canvasContext: ctx, viewport });
        await task.promise;
      } catch {}
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, index, width, visible, onSize]);

  return (
    <div
      data-page={index}
      style={{ width, height, marginBottom: GAP }}
      className="mx-auto bg-white shadow-lg"
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

export function PdfReader({ record, onClose }: { record: BookRecord; onClose: () => void }) {
  const t = useT();
  const prefs = usePrefs();
  const live = useBook(record.id) ?? record;
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outline, setOutline] = useState<PdfOutlineEntry[]>([]);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [zoom, setZoom] = useState(1);
  const [current, setCurrent] = useState(record.chapter);
  const [boxWidth, setBoxWidth] = useState(0);
  const [ratios, setRatios] = useState<Map<number, number>>(new Map());
  const [near, setNear] = useState<Set<number>>(new Set());
  const scrollerRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const saveTimer = useRef<number | null>(null);
  const pages = doc?.numPages ?? record.pages ?? 1;

  useEffect(() => {
    let cancelled = false;
    let opened: PDFDocumentProxy | null = null;
    void (async () => {
      try {
        const { readFile } = await import("@tauri-apps/plugin-fs");
        opened = await openPdf(await readFile(record.path));
        if (cancelled) return void opened.destroy();
        setDoc(opened);
        updateBook(record.id, { pages: opened.numPages });
        void pdfOutline(opened).then((o) => !cancelled && setOutline(o));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
      void opened?.destroy();
    };
  }, [record.path, record.id]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxWidth(el.clientWidth));
    ro.observe(el);
    setBoxWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const width = Math.max(200, Math.min(boxWidth - 32, 1100) * zoom);
  const ratioFor = useCallback((i: number) => ratios.get(i) ?? ratios.get(0) ?? 1.414, [ratios]);
  const tops = useMemo(() => {
    const out: number[] = [];
    let y = 16;
    for (let i = 0; i < pages; i++) {
      out.push(y);
      y += width * ratioFor(i) + GAP;
    }
    return out;
  }, [pages, width, ratioFor]);

  const onSize = useCallback((i: number, ratio: number) => {
    setRatios((prev) => (prev.get(i) === ratio ? prev : new Map(prev).set(i, ratio)));
  }, []);

  const pageAt = useCallback(
    (scrollTop: number, viewport: number) => {
      const probe = scrollTop + viewport * 0.35;
      let lo = 0;
      let hi = tops.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (tops[mid] <= probe) lo = mid;
        else hi = mid - 1;
      }
      return lo;
    },
    [tops],
  );

  const refresh = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || tops.length === 0) return;
    const first = pageAt(el.scrollTop - el.clientHeight, 0);
    const last = pageAt(el.scrollTop + el.clientHeight * 2, 0);
    setNear((prev) => {
      if (prev.size === last - first + 1 && prev.has(first) && prev.has(last)) return prev;
      const next = new Set<number>();
      for (let i = first; i <= last; i++) next.add(i);
      return next;
    });
    const page = pageAt(el.scrollTop, el.clientHeight);
    setCurrent(page);
    if (restored.current) {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(
        () =>
          updateBook(record.id, {
            chapter: page,
            progress: pages > 1 ? page / (pages - 1) : 1,
            openedAt: Date.now(),
          }),
        500,
      );
    }
  }, [pageAt, pages, record.id, tops.length]);

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  const jump = useCallback(
    (page: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const p = Math.min(pages - 1, Math.max(0, page));
      el.scrollTop = Math.max(0, tops[p] - 8);
    },
    [pages, tops],
  );

  // Restore the saved page once layout is known, then start tracking.
  useEffect(() => {
    if (!doc || boxWidth === 0 || restored.current) return;
    jump(record.chapter);
    restored.current = true;
    refresh();
  }, [doc, boxWidth, jump, record.chapter, refresh]);

  useEffect(() => {
    if (restored.current) refresh();
  }, [tops, refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown")
        jump(current + 1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp")
        jump(current - 1);
      else if (e.key === "Home") jump(0);
      else if (e.key === "End") jump(pages - 1);
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)));
      else if (e.key === "-") setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, jump, pages]);

  const label = (page: number) => `${t("Page")} ${page + 1}`;
  const sidePanel =
    panel === "toc" ? (
      <>
        <PanelTitle>{t("Contents")}</PanelTitle>
        <ul className="flex flex-col">
          {outline.map((e, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  jump(e.page);
                  setPanel(null);
                }}
                style={{ paddingLeft: 12 + e.depth * 14 }}
                className="w-full rounded-lg py-2 pr-3 text-left text-[13px] text-ink-muted hover:bg-raised hover:text-ink"
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
        label={(m) => m.label || label(m.chapter)}
        onOpen={(m) => {
          jump(m.chapter);
          setPanel(null);
        }}
      />
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

  const total = tops.length > 0 ? tops[tops.length - 1] + width * ratioFor(pages - 1) + 16 : 0;
  return (
    <ReaderShell
      title={record.title}
      subtitle={record.author || undefined}
      panel={panel}
      onPanel={setPanel}
      onClose={onClose}
      onBookmark={() =>
        addBookmark(record.id, {
          label: label(current),
          chapter: current,
          fraction: 0,
          progress: pages > 1 ? current / (pages - 1) : 1,
        })
      }
      hasToc={outline.length > 0}
      hasSearch={false}
      hasSettings
      sidePanel={sidePanel}
      footer={
        <div className="flex items-center gap-3 text-[12px] text-ink-muted">
          <label className="flex items-center gap-1.5">
            {t("Page")}
            <input
              type="number"
              min={1}
              max={pages}
              value={current + 1}
              onChange={(e) => jump(Number(e.target.value) - 1)}
              className="w-16 rounded-lg border border-edge-soft bg-canvas px-2 py-1 text-ink tabular-nums outline-none"
            />
            / {pages}
          </label>
          <input
            type="range"
            min={0}
            max={Math.max(0, pages - 1)}
            value={current}
            aria-label={t("Reading progress")}
            onChange={(e) => jump(Number(e.target.value))}
            className="min-w-0 flex-1 accent-current"
          />
          <button
            type="button"
            aria-label={t("Zoom out")}
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
            className="rounded-full p-1.5 hover:bg-raised"
          >
            <Minus size={15} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="w-12 text-center tabular-nums hover:text-ink"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            aria-label={t("Zoom in")}
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
            className="rounded-full p-1.5 hover:bg-raised"
          >
            <Plus size={15} />
          </button>
        </div>
      }
    >
      <div
        ref={scrollerRef}
        onScroll={refresh}
        style={{
          background:
            prefs.theme === "light"
              ? "#d9d9de"
              : prefs.theme === "sepia"
                ? "#d8cdb0"
                : READER_BACKGROUND.dark,
        }}
        className="absolute inset-0 overflow-auto"
      >
        {!doc && <div className="p-8 text-[13px] text-ink-muted">{t("Opening…")}</div>}
        {doc && (
          <div style={{ height: total, width: width + 32, minWidth: "100%", paddingTop: 16 }}>
            {Array.from({ length: pages }, (_, i) => (
              <PdfPage
                key={i}
                doc={doc}
                index={i}
                width={width}
                height={width * ratioFor(i)}
                visible={near.has(i)}
                onSize={onSize}
              />
            ))}
          </div>
        )}
      </div>
    </ReaderShell>
  );
}
