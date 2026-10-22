import { unzip } from "@/lib/unzip";
import { isImageName, naturalCompare } from "./reader-logic";

export type LoadedCbz = { pages: string[]; revoke: () => void };

function mimeFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "avif") return "image/avif";
  return "image/bmp";
}

/** Reads a CBZ/ZIP into blob URLs ordered by natural file name. */
export async function loadCbz(bytes: Uint8Array): Promise<LoadedCbz> {
  const copy = bytes.slice().buffer as ArrayBuffer;
  const files = await unzip(copy);
  const names = [...files.keys()].filter(isImageName).sort(naturalCompare);
  if (names.length === 0) throw new Error("No images found in this archive");
  const urls = names.map((n) =>
    URL.createObjectURL(new Blob([files.get(n) as Uint8Array<ArrayBuffer>], { type: mimeFor(n) })),
  );
  return { pages: urls, revoke: () => urls.forEach((u) => URL.revokeObjectURL(u)) };
}

/** Small JPEG data URL of the first page, safe to keep in localStorage. */
export async function makeCover(pageUrl: string, width = 240): Promise<string | undefined> {
  try {
    const blob = await (await fetch(pageUrl)).blob();
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, width / bmp.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return undefined;
  }
}

export function titleFromPath(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? path;
  return base.replace(/\.(cbz|zip)$/i, "").replace(/[_]+/g, " ").trim() || base;
}
