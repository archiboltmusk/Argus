import { downloadMusic, musicDownloadFor } from "./downloads";
import type { MusicTrack } from "./types";

export type BatchDownloadProgress = {
  total: number;
  completed: number;
  inProgress: number;
  percent: number;
};

/**
 * Downloads an entire album or playlist sequentially to preserve bandwidth and storage.
 */
export async function downloadTrackCollectionBatch(
  tracks: MusicTrack[],
  onProgress?: (progress: BatchDownloadProgress) => void,
): Promise<{ started: number; skipped: number }> {
  let started = 0;
  let skipped = 0;

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const prior = musicDownloadFor(track);

    if (prior?.status === "done" || prior?.status === "downloading") {
      skipped++;
      continue;
    }

    try {
      await downloadMusic(track);
      started++;
    } catch {
      // Continue to next track in collection even if one fails
    }

    if (onProgress) {
      onProgress({
        total: tracks.length,
        completed: skipped + started,
        inProgress: 1,
        percent: Math.round(((i + 1) / tracks.length) * 100),
      });
    }
  }

  return { started, skipped };
}

/**
 * Checks whether all tracks in a collection (album or playlist) are already saved offline.
 */
export function isTrackCollectionDownloaded(tracks: MusicTrack[]): boolean {
  if (tracks.length === 0) return false;
  return tracks.every((track) => {
    const d = musicDownloadFor(track);
    return d?.status === "done";
  });
}
