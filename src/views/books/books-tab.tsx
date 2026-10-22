import { BookOpen, FilePlus2, FolderPlus, Loader2, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { readCover, removeBook, useBooks } from "@/lib/ebook/books";
import {
  filterBooks,
  shelfOf,
  sortBooks,
  type BookRecord,
  type LibrarySort,
  type ReadingShelf,
} from "@/lib/ebook/books-core";
import { importBook, pickBookFiles, pickBookFolder, scanBookFolder } from "@/lib/ebook/import";
import { Segmented } from "@/views/settings/shared";
import { EpubReader } from "./epub-reader";
import { PdfReader } from "./pdf-reader";

function BookCard({ book, onOpen }: { book: BookRecord; onOpen: () => void }) {
  const t = useT();
  const cover = useMemo(
    () => (book.hasCover ? readCover(book.id) : null),
    [book.id, book.hasCover],
  );
  const pct = Math.round(book.progress * 100);
  return (
    <div className="group relative flex flex-col gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-elevated ring-1 ring-edge-soft transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
            <BookOpen size={26} className="text-ink-subtle" />
            <span className="line-clamp-4 text-[12.5px] font-semibold leading-tight">
              {book.title}
            </span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          {book.format}
        </span>
        {pct > 0 && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <span className="block h-full bg-white/90" style={{ width: `${pct}%` }} />
          </span>
        )}
      </button>
      <button
        type="button"
        aria-label={t("Remove from library")}
        title={t("Remove from library")}
        onClick={() => removeBook(book.id)}
        className="absolute right-1.5 top-1.5 hidden h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black group-hover:flex group-focus-within:flex"
      >
        <X size={14} />
      </button>
      <div className="min-w-0 px-0.5">
        <div className="truncate text-[13px] font-semibold">{book.title}</div>
        <div className="truncate text-[12px] text-ink-muted">
          {book.author || t("Unknown author")}
          {pct > 0 && ` · ${pct}%`}
        </div>
      </div>
    </div>
  );
}

export function BooksTab() {
  const t = useT();
  const books = useBooks();
  const [shelf, setShelf] = useState<ReadingShelf>("all");
  const [sort, setSort] = useState<LibrarySort>("recent");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(
    () => sortBooks(filterBooks(books, shelf, query), sort),
    [books, shelf, query, sort],
  );
  const opened = books.find((b) => b.id === openId) ?? null;

  async function importPaths(paths: string[]) {
    if (paths.length === 0) {
      setMessage(t("No EPUB or PDF files found."));
      return;
    }
    let failed = 0;
    setBusy({ done: 0, total: paths.length });
    for (let i = 0; i < paths.length; i++) {
      try {
        await importBook(paths[i]);
      } catch {
        failed++;
      }
      setBusy({ done: i + 1, total: paths.length });
    }
    setBusy(null);
    setMessage(failed > 0 ? t("{n} files could not be read.", { n: failed }) : null);
  }

  async function run(pick: () => Promise<string[]>) {
    setMessage(null);
    try {
      await importPaths(await pick());
    } catch {
      setBusy(null);
      setMessage(t("Adding books needs the desktop app."));
    }
  }

  const addFiles = () => run(pickBookFiles);
  const addFolder = () =>
    run(async () => {
      const folder = await pickBookFolder();
      return folder ? scanBookFolder(folder) : [];
    });

  const counts = useMemo(() => {
    const c = { all: books.length, reading: 0, unread: 0, finished: 0 };
    for (const b of books) c[shelfOf(b)]++;
    return c;
  }, [books]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addFiles}
          disabled={!!busy}
          className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-canvas disabled:opacity-60"
        >
          <FilePlus2 size={15} />
          {t("Add books")}
        </button>
        <button
          type="button"
          onClick={addFolder}
          disabled={!!busy}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-ink-muted ring-1 ring-edge-soft hover:text-ink disabled:opacity-60"
        >
          <FolderPlus size={15} />
          {t("Add folder")}
        </button>
        {busy && (
          <span className="flex items-center gap-2 text-[12.5px] text-ink-muted">
            <Loader2 size={14} className="animate-spin" />
            {busy.done}/{busy.total}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-full px-3 py-1.5 ring-1 ring-edge-soft">
            <Search size={14} className="text-ink-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search books")}
              className="w-40 bg-transparent text-[13px] outline-none placeholder:text-ink-subtle"
            />
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as LibrarySort)}
            aria-label={t("Sort books")}
            className="rounded-full bg-transparent px-3 py-2 text-[13px] ring-1 ring-edge-soft outline-none"
          >
            <option value="recent">{t("Recently read")}</option>
            <option value="added">{t("Recently added")}</option>
            <option value="title">{t("Title")}</option>
            <option value="author">{t("Author")}</option>
          </select>
        </div>
      </div>

      {books.length > 0 && (
        <Segmented
          value={shelf}
          options={[
            { value: "all", label: `${t("All")} ${counts.all}` },
            { value: "reading", label: `${t("Reading")} ${counts.reading}` },
            { value: "unread", label: `${t("Unread")} ${counts.unread}` },
            { value: "finished", label: `${t("Finished")} ${counts.finished}` },
          ]}
          onChange={setShelf}
        />
      )}

      {message && <p className="text-[13px] text-ink-muted">{message}</p>}

      {books.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-edge-soft px-6 py-16 text-center">
          <BookOpen size={30} className="text-ink-subtle" />
          <p className="text-[15px] font-semibold">{t("Your bookshelf is empty.")}</p>
          <p className="max-w-md text-[13px] text-ink-muted">
            {t(
              "Add EPUB or PDF files from your computer. Argus reads them in place, keeps your spot, and ships no books of its own.",
            )}
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-[13px] text-ink-muted">{t("No books match.")}</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-5 gap-y-7">
          {visible.map((b) => (
            <BookCard key={b.id} book={b} onOpen={() => setOpenId(b.id)} />
          ))}
        </div>
      )}

      {opened &&
        (opened.format === "epub" ? (
          <EpubReader key={opened.id} record={opened} onClose={() => setOpenId(null)} />
        ) : (
          <PdfReader key={opened.id} record={opened} onClose={() => setOpenId(null)} />
        ))}
    </div>
  );
}
