import { safeFetch as fetch } from "@/lib/safe-fetch";
import { fuzzyCoverage } from "@/lib/title-match";
import { docYearMatches, filesToStreams, parseSearch, searchUrl, type ArchiveFile } from "./archive-feed";
import type { LibraryQuery } from "./library";
import type { Stream } from "./types";

// Built-in, opt-in source for public-domain films hosted on archive.org.
// Movies only, and only when the title and year line up with the request.
export async function fetchArchiveStreams(q: LibraryQuery, signal: AbortSignal): Promise<Stream[]> {
  if (q.type !== "movie" || !q.title) return [];
  try {
    const search = async (loose: boolean) => {
      const res = await fetch(searchUrl(q.title, loose), { signal });
      if (!res.ok) return [];
      return parseSearch(await res.json()).filter(
        (d) => docYearMatches(d, q.year) && fuzzyCoverage(q.title, d.title ?? "") >= 0.99,
      );
    };
    let docs = await search(false);
    if (!docs.length) docs = await search(true);
    const out: Stream[] = [];
    for (const doc of docs.slice(0, 2)) {
      const meta = await fetch(`https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`, { signal });
      if (!meta.ok) continue;
      const files = ((await meta.json()) as { files?: ArchiveFile[] }).files ?? [];
      out.push(...filesToStreams(doc.identifier, doc.title ?? q.title, files));
    }
    return out;
  } catch {
    return [];
  }
}
