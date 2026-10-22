import { useCallback, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { fetchPages } from "@/lib/manga/client";
import { readLocalCbz } from "@/lib/manga/local";
import { entryKey, getSource, saveProgress } from "@/lib/manga/store";
import { LOCAL_SOURCE_ID, type Chapter, type SeriesDetail } from "@/lib/manga/types";
import { useView } from "@/lib/view";
import { BrowseTab } from "./browse-tab";
import { LibraryTab } from "./library-tab";
import { MangaReader, type LoadedPages } from "./reader";
import { SeriesScreen, type SeriesRef } from "./series-screen";

type ReaderState = {
  series: SeriesRef;
  detail: SeriesDetail;
  chapterId: string;
  startPage: number;
};

export function MangaView({ active }: { active: boolean }) {
  const t = useT();
  const { setView } = useView();
  const [tab, setTab] = useState<"library" | "browse">("library");
  const [series, setSeries] = useState<SeriesRef | null>(null);
  const [reader, setReader] = useState<ReaderState | null>(null);

  const open = useCallback(
    (sourceId: string, seriesId: string, title: string, cover?: string) =>
      setSeries({ sourceId, seriesId, title, cover }),
    [],
  );

  const sourceId = reader?.series.sourceId;
  const loadPages = useCallback(
    async (chapterId: string): Promise<LoadedPages> => {
      if (sourceId === LOCAL_SOURCE_ID) return readLocalCbz(chapterId);
      const source = sourceId ? getSource(sourceId) : undefined;
      if (!source) throw new Error(t("This source was removed."));
      return { pages: await fetchPages(source, chapterId) };
    },
    [sourceId, t],
  );

  const onProgress = useCallback(
    (chapter: Chapter, page: number, total: number) => {
      if (!reader) return;
      saveProgress(entryKey(reader.series.sourceId, reader.series.seriesId), {
        chapterId: chapter.id,
        chapterLabel: chapter.title,
        page,
        total,
        updatedAt: Date.now(),
      });
    },
    [reader],
  );

  const tabs = useMemo(
    () => [
      ["library", t("Library")],
      ["browse", t("Browse")],
    ] as const,
    [t],
  );

  return (
    <div className="relative h-full w-full" aria-hidden={!active}>
      <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-8 py-8">
        {series ? (
          <SeriesScreen
            key={`${series.sourceId}:${series.seriesId}`}
            series={series}
            onBack={() => setSeries(null)}
            onRead={(detail, chapterId, startPage) =>
              setReader({ series, detail, chapterId, startPage })
            }
          />
        ) : (
          <>
            <h1 className="text-[26px] font-semibold text-ink">{t("Manga")}</h1>
            <div className="flex gap-1 border-b border-edge-soft">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`-mb-px px-4 pb-3 pt-2 text-[13.5px] font-semibold ${
                    tab === id
                      ? "border-b-2 border-accent text-ink"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === "library" ? (
              <LibraryTab onOpen={open} onBrowse={() => setTab("browse")} />
            ) : (
              <BrowseTab onOpen={open} onOpenSettings={() => setView("settings")} />
            )}
          </>
        )}
      </div>
      </div>

      {reader && (
        <MangaReader
          key={reader.chapterId}
          title={reader.detail.title}
          chapters={reader.detail.chapters}
          chapterId={reader.chapterId}
          startPage={reader.startPage}
          loadPages={loadPages}
          onProgress={onProgress}
          onChapter={(chapterId) => setReader({ ...reader, chapterId, startPage: 0 })}
          onClose={() => setReader(null)}
        />
      )}
    </div>
  );
}
