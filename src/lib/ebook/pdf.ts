import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let loader: Promise<PdfJs> | null = null;

/** pdf.js is large, so it is only fetched the first time a PDF is opened. */
export function loadPdfjs(): Promise<PdfJs> {
  loader ??= (async () => {
    const [lib, worker] = await Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
    ]);
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  })();
  return loader;
}

export async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const lib = await loadPdfjs();
  return lib.getDocument({ data: bytes, isEvalSupported: false }).promise;
}

export type PdfOutlineEntry = { label: string; page: number; depth: number };

type RawOutline = { title: string; dest: string | unknown[] | null; items?: RawOutline[] };

export async function pdfOutline(doc: PDFDocumentProxy): Promise<PdfOutlineEntry[]> {
  const raw = (await doc.getOutline()) as RawOutline[] | null;
  if (!raw) return [];
  const out: PdfOutlineEntry[] = [];
  const visit = async (items: RawOutline[], depth: number) => {
    for (const item of items) {
      try {
        const dest =
          typeof item.dest === "string" ? await doc.getDestination(item.dest) : item.dest;
        const ref = dest?.[0];
        if (ref && typeof ref === "object") {
          out.push({ label: item.title || "…", page: await doc.getPageIndex(ref as never), depth });
        }
      } catch {}
      if (item.items?.length) await visit(item.items, depth + 1);
    }
  };
  await visit(raw, 0);
  return out;
}
