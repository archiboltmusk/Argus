/**
 * Multi-Provider Watchlist Aggregator & Consolidator
 *
 * Merges bookmarks and watchlists from Trakt, Simkl, Letterboxd, and local storage
 * directly into your active Nuvio Cloud library so everything is accessible on all OS.
 */

import { addNuvioLibraryItem, isNuvioItemInLibrary } from "@/lib/nuvio/nuvio-library";
import { isNuvioSignedIn, loadNuvioState } from "@/lib/nuvio/nuvio-client";
import { resolveNuvioProfileIndex } from "@/lib/nuvio/nuvio-sync";

export interface ConsolidatedWatchlistItem {
  content_id: string;
  content_type: string;
  title: string;
  poster?: string;
  source: "trakt" | "simkl" | "letterboxd" | "local";
}

/**
 * Consolidates third-party watchlist items into Nuvio Cloud Library.
 */
export async function consolidateWatchlistsToCloud(
  items: ConsolidatedWatchlistItem[],
): Promise<{ added: number; skipped: number }> {
  if (!isNuvioSignedIn() || items.length === 0) {
    return { added: 0, skipped: 0 };
  }

  const state = loadNuvioState();
  const slot = resolveNuvioProfileIndex(state.activeProfileIndex);
  let added = 0;
  let skipped = 0;

  for (const item of items) {
    if (isNuvioItemInLibrary(slot, item.content_id)) {
      skipped++;
      continue;
    }

    addNuvioLibraryItem(slot, {
      content_id: item.content_id,
      content_type: item.content_type,
      name: item.title,
      poster: item.poster,
      added_at: Date.now(),
    });
    added++;
  }

  return { added, skipped };
}
