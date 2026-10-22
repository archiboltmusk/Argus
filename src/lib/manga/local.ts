import { loadCbz, makeCover, titleFromPath } from "./cbz";
import { addToLibrary, entryKey } from "./store";
import { LOCAL_SOURCE_ID } from "./types";

export const canOpenLocalFiles =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function readLocalCbz(path: string) {
  const { readFile } = await import("@tauri-apps/plugin-fs");
  return loadCbz(await readFile(path));
}

/** Asks for a CBZ, adds it to the library with a cover, and returns its library key. */
export async function importLocalCbz(): Promise<{ path: string; title: string } | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const picked = await open({
    multiple: false,
    filters: [{ name: "Comic archive", extensions: ["cbz", "zip"] }],
  });
  if (typeof picked !== "string") return null;
  const title = titleFromPath(picked);
  const loaded = await readLocalCbz(picked);
  try {
    const cover = await makeCover(loaded.pages[0]);
    addToLibrary({ sourceId: LOCAL_SOURCE_ID, seriesId: picked, title, cover });
  } finally {
    loaded.revoke();
  }
  return { path: picked, title };
}

export const localKey = (path: string) => entryKey(LOCAL_SOURCE_ID, path);
