import {
  ArrowLeft,
  Bookmark,
  BookmarkPlus,
  ListTree,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useT } from "@/lib/i18n";
import type { BookRecord } from "@/lib/ebook/books-core";
import { removeBookmark } from "@/lib/ebook/books";

export type PanelId = "toc" | "marks" | "search" | "settings";

function IconBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
        active ? "bg-ink text-canvas" : "text-ink-muted hover:bg-raised hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function ReaderShell({
  title,
  subtitle,
  panel,
  onPanel,
  onClose,
  onBookmark,
  hasToc,
  hasSearch,
  hasSettings,
  sidePanel,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  panel: PanelId | null;
  onPanel: (p: PanelId | null) => void;
  onClose: () => void;
  onBookmark: () => void;
  hasToc: boolean;
  hasSearch: boolean;
  hasSettings: boolean;
  sidePanel: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  const toggle = (p: PanelId) => onPanel(panel === p ? null : p);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (panel) onPanel(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [panel, onPanel, onClose]);

  return (
    <div
      role="dialog"
      aria-label={title}
      className="fixed inset-0 z-[300] flex flex-col bg-canvas text-ink"
    >
      <header className="flex items-center gap-2 border-b border-edge-soft px-3 py-2">
        <IconBtn label={t("Back to library")} onClick={onClose}>
          <ArrowLeft size={18} />
        </IconBtn>
        <div className="mx-2 flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[14px] font-semibold">{title}</span>
          {subtitle && <span className="truncate text-[12px] text-ink-muted">{subtitle}</span>}
        </div>
        {hasToc && (
          <IconBtn label={t("Contents")} active={panel === "toc"} onClick={() => toggle("toc")}>
            <ListTree size={17} />
          </IconBtn>
        )}
        {hasSearch && (
          <IconBtn
            label={t("Search in book")}
            active={panel === "search"}
            onClick={() => toggle("search")}
          >
            <Search size={17} />
          </IconBtn>
        )}
        <IconBtn label={t("Add bookmark")} onClick={onBookmark}>
          <BookmarkPlus size={17} />
        </IconBtn>
        <IconBtn label={t("Bookmarks")} active={panel === "marks"} onClick={() => toggle("marks")}>
          <Bookmark size={17} />
        </IconBtn>
        {hasSettings && (
          <IconBtn
            label={t("Reading settings")}
            active={panel === "settings"}
            onClick={() => toggle("settings")}
          >
            <SlidersHorizontal size={17} />
          </IconBtn>
        )}
      </header>
      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">{children}</div>
        {panel && (
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-[360px] flex-col border-l border-edge-soft bg-elevated shadow-2xl">
            <div className="flex items-center justify-end px-2 pt-2">
              <IconBtn label={t("Close")} onClick={() => onPanel(null)}>
                <X size={16} />
              </IconBtn>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">{sidePanel}</div>
          </aside>
        )}
      </div>
      <footer className="border-t border-edge-soft px-4 py-2">{footer}</footer>
    </div>
  );
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="pb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-subtle">
      {children}
    </h2>
  );
}

export function BookmarksPanel({
  book,
  label,
  onOpen,
}: {
  book: BookRecord;
  label: (m: BookRecord["bookmarks"][number]) => string;
  onOpen: (m: BookRecord["bookmarks"][number]) => void;
}) {
  const t = useT();
  return (
    <>
      <PanelTitle>{t("Bookmarks")}</PanelTitle>
      {book.bookmarks.length === 0 && (
        <p className="text-[13px] text-ink-muted">{t("No bookmarks yet.")}</p>
      )}
      <ul className="flex flex-col gap-1">
        {book.bookmarks.map((m) => (
          <li key={m.id} className="group flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOpen(m)}
              className="min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-raised"
            >
              <div className="truncate font-medium">{label(m)}</div>
              <div className="text-[11.5px] text-ink-muted">
                {Math.round(m.progress * 100)}% · {new Date(m.createdAt).toLocaleDateString()}
              </div>
            </button>
            <button
              type="button"
              aria-label={t("Remove bookmark")}
              onClick={() => removeBookmark(book.id, m.id)}
              className="rounded-full p-2 text-ink-subtle hover:bg-raised hover:text-ink"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
