import { useT } from "@/lib/i18n";
import { useMangaLibrary, useMangaProgress } from "@/lib/manga/store";
import { CoverGrid } from "./cover-grid";

export function LibraryTab({
  onOpen,
  onBrowse,
}: {
  onOpen: (sourceId: string, seriesId: string, title: string, cover?: string) => void;
  onBrowse: () => void;
}) {
  const t = useT();
  const library = useMangaLibrary();
  const progress = useMangaProgress();

  if (library.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-edge-soft bg-elevated/40 p-6">
        <div className="text-[15px] font-medium text-ink">{t("Your manga library is empty")}</div>
        <div className="max-w-xl text-[13px] text-ink-muted">
          {t(
            "Search a source you added in Settings, or open a CBZ file from your computer. Series you save show up here with your reading progress.",
          )}
        </div>
        <button
          type="button"
          onClick={onBrowse}
          className="rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white"
        >
          {t("Browse")}
        </button>
      </div>
    );
  }

  const sorted = [...library].sort(
    (a, b) =>
      (progress[b.key]?.last?.updatedAt ?? b.addedAt) -
      (progress[a.key]?.last?.updatedAt ?? a.addedAt),
  );

  return (
    <CoverGrid
      items={sorted.map((e) => {
        const last = progress[e.key]?.last;
        return {
          key: e.key,
          title: e.title,
          cover: e.cover,
          subtitle: last ? `${last.chapterLabel} · ${last.page + 1}/${last.total}` : undefined,
        };
      })}
      onOpen={(key) => {
        const e = library.find((x) => x.key === key);
        if (e) onOpen(e.sourceId, e.seriesId, e.title, e.cover);
      }}
    />
  );
}
