import { useCallback, useEffect, useState } from "react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { useView } from "@/lib/view";
import { ModalShell, useModalExit } from "@/components/modal-shell";
import {
  archiveFiles,
  searchArchive,
  type ArchiveFile,
  type ArchiveItem,
} from "@/lib/archive-org";
import { Section, ToggleRow } from "./shared";

const FIELD =
  "h-10 w-full rounded-lg bg-canvas/70 px-3 text-[13px] text-ink ring-1 ring-edge-soft/60 outline-none focus:ring-accent";
const ROW =
  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-[13.5px] text-ink hover:bg-elevated/50";

function Browser({ onClose }: { onClose: () => void }) {
  const t = useT();
  const view = useView();
  const { closing, close } = useModalExit(onClose);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ArchiveItem[] | null>(null);
  const [open, setOpen] = useState<ArchiveItem | null>(null);
  const [files, setFiles] = useState<ArchiveFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback((q: string) => {
    setItems(null);
    setError(null);
    searchArchive(q)
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => search(""), [search]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setFiles(null);
    setError(null);
    archiveFiles(open.identifier)
      .then((f) => !cancelled && setFiles(f))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const play = (item: ArchiveItem, file: ArchiveFile) => {
    close();
    view.openPlayer({
      meta: { id: `archive:${item.identifier}:${file.name}`, type: "movie", name: item.title },
      url: file.url,
      title: files && files.length > 1 ? `${item.title}: ${file.title}` : item.title,
      subtitle: "Internet Archive",
      notWebReady: true,
    });
  };

  return (
    <ModalShell closing={closing} onDismiss={close} width={600}>
      <div className="flex items-center justify-between gap-3 border-b border-edge-soft/60 px-5 py-4">
        <div className="min-w-0 truncate text-[15px] font-semibold text-ink">
          {open ? open.title : t("Internet Archive (open license)")}
        </div>
        <button type="button" onClick={close} className="text-[13px] text-ink-subtle hover:text-ink">
          {t("Close")}
        </button>
      </div>
      {!open && (
        <form
          className="p-3"
          onSubmit={(e) => {
            e.preventDefault();
            search(query);
          }}
        >
          <input
            className={FIELD}
            placeholder={t("Search lectures, e.g. anatomy, calculus")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
      )}
      <div className="max-h-[60vh] min-h-[200px] overflow-y-auto p-2">
        {open && (
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="w-full rounded-lg px-3 py-2 text-start text-[13px] text-ink-muted hover:bg-elevated/50"
          >
            ← {t("Back")}
          </button>
        )}
        {error && <div className="px-3 py-4 text-[13px] text-red-400">{error}</div>}
        {!error && !(open ? files : items) && (
          <div className="px-3 py-4 text-[13px] text-ink-subtle">{t("Loading…")}</div>
        )}
        {!open && items?.length === 0 && (
          <div className="px-3 py-4 text-[13px] text-ink-subtle">{t("No videos here.")}</div>
        )}
        {!open &&
          items?.map((item) => (
            <button key={item.identifier} type="button" onClick={() => setOpen(item)} className={ROW}>
              <span className="truncate">{item.title}</span>
              {item.year && <span className="shrink-0 text-[11.5px] text-ink-subtle">{item.year}</span>}
            </button>
          ))}
        {open &&
          files?.map((file) => (
            <button key={file.name} type="button" onClick={() => play(open, file)} className={ROW}>
              <span className="truncate">{file.title}</span>
              {file.sizeBytes && (
                <span className="shrink-0 text-[11.5px] text-ink-subtle">
                  {Math.round(file.sizeBytes / 1e6)} MB
                </span>
              )}
            </button>
          ))}
        {open && files?.length === 0 && (
          <div className="px-3 py-4 text-[13px] text-ink-subtle">{t("No videos here.")}</div>
        )}
      </div>
    </ModalShell>
  );
}

export function ArchiveSection() {
  const t = useT();
  const { settings, update } = useSettings();
  const [open, setOpen] = useState(false);
  return (
    <Section
      title={t("Internet Archive")}
      subtitle={t(
        "Lectures, courses and films the Internet Archive lists under a Creative Commons or public-domain license. Argus never hosts or caches anything.",
      )}
    >
      <ToggleRow
        label={t("Internet Archive catalog")}
        sub={t("Adds a browser for openly licensed video from archive.org.")}
        value={settings.archiveCatalogEnabled}
        onChange={(archiveCatalogEnabled) => update({ archiveCatalogEnabled })}
      />
      {settings.archiveCatalogEnabled && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-10 w-fit rounded-full bg-ink px-5 text-[13px] font-semibold text-canvas"
        >
          {t("Browse")}
        </button>
      )}
      {open && <Browser onClose={() => setOpen(false)} />}
    </Section>
  );
}
