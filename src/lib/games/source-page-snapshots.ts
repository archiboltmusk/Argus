import type { SourcePageData } from "./source-page-data";
import { sourceArtworkTitles } from "./source-display";
import { sourceTitleKey } from "./source-title";

// Argus bundles no source-page snapshots.
const snapshots: Record<string, SourcePageData & { title: string }> = {};

export function sourcePageSnapshot(page: string, releaseTitle: string): SourcePageData | undefined {
  const snapshot = snapshots[page];
  return snapshot && sourceArtworkTitles(releaseTitle).some(title => sourceTitleKey(title) === sourceTitleKey(snapshot.title)) ? snapshot : undefined;
}
