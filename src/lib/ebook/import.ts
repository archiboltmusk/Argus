import { addBook, setCover, updateBook } from "./books";
import { BOOK_EXTENSIONS, formatFromPath, titleFromPath, type BookRecord } from "./books-core";
import { openEpub } from "./epub";
import { mimeForPath } from "./epub-render";
import { openPdf } from "./pdf";

const COVER_WIDTH = 260;

async function toCoverDataUrl(
  source: CanvasImageSource,
  w: number,
  h: number,
): Promise<string | null> {
  if (!w || !h) return null;
  const canvas = document.createElement("canvas");
  canvas.width = COVER_WIDTH;
  canvas.height = Math.round((COVER_WIDTH * h) / w);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

async function epubCover(coverPath: string, read: (p: string) => Promise<Uint8Array | null>) {
  const data = await read(coverPath);
  if (!data) return null;
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: mimeForPath(coverPath) }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return await toCoverDataUrl(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Reads title, author and cover from the file and files it in the library. */
export async function importBook(path: string): Promise<BookRecord | null> {
  const format = formatFromPath(path);
  if (!format) return null;
  const { readFile } = await import("@tauri-apps/plugin-fs");
  const bytes = await readFile(path);
  const existing = addBook({ path });
  if (!existing) return null;
  if (existing.hasCover || existing.openedAt > 0) return existing;
  try {
    if (format === "epub") {
      const book = await openEpub(bytes);
      updateBook(existing.id, { title: book.meta.title, author: book.meta.author });
      if (book.coverPath) {
        const cover = await epubCover(book.coverPath, (p) => book.zip.read(p));
        if (cover) setCover(existing.id, cover);
      }
    } else {
      const doc = await openPdf(bytes);
      try {
        const info = (await doc.getMetadata()).info as { Title?: string; Author?: string };
        updateBook(existing.id, {
          title: info.Title?.trim() || titleFromPath(path),
          author: info.Author?.trim() ?? "",
          pages: doc.numPages,
        });
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: COVER_WIDTH / base.width });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          setCover(existing.id, canvas.toDataURL("image/jpeg", 0.8));
        }
      } finally {
        void doc.destroy();
      }
    }
  } catch {
    // The book is still added; it just keeps the filename as its title and no cover.
  }
  return existing;
}

export async function pickBookFiles(): Promise<string[]> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const picked = await open({
    multiple: true,
    filters: [{ name: "Books", extensions: [...BOOK_EXTENSIONS] }],
  });
  return Array.isArray(picked) ? picked : typeof picked === "string" ? [picked] : [];
}

const MAX_DEPTH = 5;
const MAX_FILES = 2000;

export async function scanBookFolder(folder: string): Promise<string[]> {
  const { readDir } = await import("@tauri-apps/plugin-fs");
  const found: string[] = [];
  const sep = folder.includes("\\") && !folder.includes("/") ? "\\" : "/";
  const walk = async (dir: string, depth: number) => {
    if (depth > MAX_DEPTH || found.length >= MAX_FILES) return;
    let entries;
    try {
      entries = await readDir(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = `${dir.replace(/[\\/]$/, "")}${sep}${entry.name}`;
      if (entry.isDirectory) await walk(full, depth + 1);
      else if (formatFromPath(entry.name) && found.length < MAX_FILES) found.push(full);
    }
  };
  await walk(folder, 0);
  return found;
}

export async function pickBookFolder(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const folder = await open({ directory: true, multiple: false });
  return typeof folder === "string" ? folder : null;
}
