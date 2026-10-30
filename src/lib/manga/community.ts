import { safeFetch } from "@/lib/safe-fetch";
import { ARGUS_API_BASE } from "@/lib/config/endpoints";

export type CommunitySource = {
  id: string;
  name: string;
  kind: "builtin" | "suwayomi";
  provider?: string;
  baseUrl?: string;
  iconUrl?: string;
  note?: string;
  lang?: string;
  order?: number;
};

const ENDPOINT = `${ARGUS_API_BASE}/api/manga-sources`;
const CACHE_KEY = "argus.manga.catalog.v1";

const SEED: CommunitySource[] = [
  {
    id: "mangadex",
    name: "MangaDex",
    kind: "builtin",
    provider: "mangadex",
    baseUrl: "https://mangadex.org",
    iconUrl: "https://mangadex.org/favicon.ico",
    note: "Built-in community manga reader (18+ hidden)",
    lang: "en",
    order: 1,
  },
  {
    id: "comick",
    name: "ComicK",
    kind: "builtin",
    provider: "comick",
    baseUrl: "https://comick.io",
    iconUrl: "https://comick.io/favicon.ico",
    note: "Built-in Western comics, DC, Marvel & manga reader",
    lang: "en",
    order: 2,
  },
  {
    id: "archive_comics",
    name: "Archive Comic Vault",
    kind: "builtin",
    provider: "archive_comics",
    baseUrl: "https://archive.org/details/comic_books",
    iconUrl: "https://archive.org/favicon.ico",
    note: "Amar Chitra Katha, Raj Comics, Tinkle & Golden Age classics",
    lang: "all",
    order: 3,
  },
];

function withSeed(list: CommunitySource[]): CommunitySource[] {
  if (SEED.length === 0) return list;
  const ids = new Set(list.map((c) => c.id));
  return [...list, ...SEED.filter((s) => !ids.has(s.id))];
}

let memo: CommunitySource[] | null = null;
const listeners = new Set<() => void>();

function readCache(): CommunitySource[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function communityCatalog(): CommunitySource[] {
  if (!memo) memo = readCache();
  return withSeed(memo);
}

export function subscribeCommunity(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export async function refreshCommunityCatalog(): Promise<CommunitySource[]> {
  try {
    const res = await safeFetch(`${ENDPOINT}/list`);
    if (!res.ok) return communityCatalog();
    const data = await res.json();
    if (Array.isArray(data)) {
      memo = data as CommunitySource[];
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {
        /* noop */
      }
      for (const l of listeners) l();
    }
    return memo ?? [];
  } catch {
    return communityCatalog();
  }
}

export async function suggestSource(input: {
  name: string;
  url: string;
  note?: string;
  icon?: string;
}): Promise<boolean> {
  try {
    const res = await safeFetch(`${ENDPOINT}/suggest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.ok;
  } catch {
    return false;
  }
}
