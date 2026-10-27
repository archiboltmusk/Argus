import { malRequest } from "./client";

export type MalMangaStatus =
  | "reading"
  | "completed"
  | "on_hold"
  | "dropped"
  | "plan_to_read";

export type MalMangaEntry = {
  status: MalMangaStatus;
  score: number;
  numChaptersRead: number;
  updatedAt: string;
  manga: {
    id: number;
    title: string;
    mainPicture: string | null;
    numChapters: number | null;
    mean: number | null;
    mediaType?: string;
  };
};

export type MalMangaGroup = {
  status: MalMangaStatus;
  entries: MalMangaEntry[];
};

const CACHE_KEY = "argus.mal.mangalist.v1";
let memValue: MalMangaGroup[] | null = null;

type RawMangaNode = {
  id: number;
  title: string;
  main_picture: { medium: string; large: string } | null;
  alternative_titles: { synonyms: string[]; en: string; ja: string } | null;
  num_chapters: number | null;
  mean: number | null;
  media_type: string | null;
  my_list_status?: {
    status: string;
    score: number;
    num_chapters_read: number;
    updated_at: string;
  };
};

type ListResponse = { data: Array<{ node: RawMangaNode }>; paging: { next?: string } | null };

function parseNode(n: RawMangaNode): MalMangaEntry | null {
  if (!n.my_list_status) return null;
  const title = n.alternative_titles?.en?.trim() || n.title;
  return {
    status: n.my_list_status.status as MalMangaStatus,
    score: n.my_list_status.score,
    numChaptersRead: n.my_list_status.num_chapters_read,
    updatedAt: n.my_list_status.updated_at,
    manga: {
      id: n.id,
      title,
      mainPicture: n.main_picture?.large ?? n.main_picture?.medium ?? null,
      numChapters: n.num_chapters,
      mean: n.mean,
      mediaType: n.media_type ?? undefined,
    },
  };
}

export function readCachedMalMangaList(): MalMangaGroup[] | null {
  if (memValue) return memValue;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MalMangaGroup[];
    if (!Array.isArray(parsed)) return null;
    memValue = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(groups: MalMangaGroup[]): void {
  memValue = groups;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(groups));
  } catch {
    /* ignore */
  }
}

export async function fetchMalMangaList(): Promise<MalMangaGroup[]> {
  const all: MalMangaEntry[] = [];
  let cursor: string | null =
    "/users/@me/mangalist?fields=my_list_status,num_chapters,mean,main_picture,alternative_titles,media_type&nsfw=false&limit=500";
  while (cursor) {
    const data: ListResponse = await malRequest(cursor);
    for (const entry of data.data ?? []) {
      const parsed = parseNode(entry.node);
      if (parsed) all.push(parsed);
    }
    cursor = data.paging?.next ?? null;
  }

  const byStatus = new Map<MalMangaStatus, MalMangaEntry[]>();
  const seen = new Set<number>();
  for (const entry of all) {
    if (seen.has(entry.manga.id)) continue;
    seen.add(entry.manga.id);
    const bucket = byStatus.get(entry.status) ?? [];
    bucket.push(entry);
    byStatus.set(entry.status, bucket);
  }

  const order: MalMangaStatus[] = [
    "reading",
    "plan_to_read",
    "completed",
    "on_hold",
    "dropped",
  ];
  const groups = order
    .filter((s) => byStatus.has(s))
    .map((status) => ({ status, entries: byStatus.get(status)! }));
  writeCache(groups);
  return groups;
}
