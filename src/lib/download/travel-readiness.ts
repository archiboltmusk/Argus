export type TravelItem = { id: string; path: string; status: string; kind?: string };
export type TravelCheck = {
  id: string;
  file: "present" | "missing" | "unknown";
  subtitles: "sidecar" | "not-checked" | "not-found" | "not-applicable";
};
/** A completed database row is not evidence the file still exists on disk. */
export async function checkTravelItem(
  item: TravelItem,
  exists: (path: string) => Promise<boolean>,
): Promise<TravelCheck> {
  try {
    if (item.status !== "done" || !item.path || !(await exists(item.path)))
      return { id: item.id, file: "missing", subtitles: "not-checked" };
    if (item.kind === "ebook") return { id: item.id, file: "present", subtitles: "not-applicable" };
    const base = item.path.replace(/\.[^./\\]+$/, "");
    for (const ext of ["srt", "vtt", "ass", "ssa"]) {
      if (await exists(`${base}.${ext}`))
        return { id: item.id, file: "present", subtitles: "sidecar" };
    }
    return { id: item.id, file: "present", subtitles: "not-found" };
  } catch {
    return { id: item.id, file: "unknown", subtitles: "not-checked" };
  }
}
