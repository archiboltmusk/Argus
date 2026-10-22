import { invoke } from "@tauri-apps/api/core";
import { stripPlayableVideoExtension } from "@/lib/media-file";
import type { PlayerSrc } from "@/lib/view";

export const ARCHIVE_EXTENSIONS = ["zip", "rar", "7z", "tar", "tgz", "gz"];

const ARCHIVE_RE = /\.(?:zip|rar|7z|tar|tgz|tar\.gz)$/i;

export function isArchivePath(path: string): boolean {
  return ARCHIVE_RE.test(path.trim());
}

export type ExtractedVideo = { path: string; name: string; bytes: number };

/** Unpacks the main video of a local archive into the cache and returns where it landed. */
export function extractArchiveVideo(path: string): Promise<ExtractedVideo> {
  return invoke<ExtractedVideo>("archive_extract_video", { path });
}

export function archivePlayerSrc(video: ExtractedVideo, archivePath: string): PlayerSrc {
  const title = stripPlayableVideoExtension(video.name);
  return {
    meta: { id: `archive:${video.path}`, type: "movie", name: title },
    url: video.path,
    title,
    subtitle: `Archive · ${archivePath.split(/[\\/]/).pop() ?? ""}`,
    notWebReady: true,
    resume: true,
    suppressCloudSync: true,
  };
}

/** The dialog extensions: `.tar.gz` ends in `gz`, and the backend checks the full name. */
export async function pickArchive(title: string): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const chosen = await open({
    title,
    multiple: false,
    directory: false,
    filters: [{ name: title, extensions: ARCHIVE_EXTENSIONS }],
  });
  return typeof chosen === "string" && isArchivePath(chosen) ? chosen : null;
}
