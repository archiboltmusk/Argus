import { anilistRequest } from "@/lib/anilist/client";
import { searchMangaEverywhere, type MangaSummary } from "@/lib/manga/api";
import { filterSafeManga, isAdultManga } from "@/lib/manga/model";
import { activeMangaSourceId } from "@/lib/manga/sources";
import { mangadexProvider } from "@/lib/manga/sources/mangadex";
import { suwayomiSourcesRevision } from "@/lib/manga/sources/suwayomi/source-events";
import { setItemWithRecovery } from "@/lib/storage-recovery";

export type MangaCollection = {
  id: string;
  name: string;
  subtitle?: string;
  badge: string;
  award?: boolean;
  titles: string[];
};

export const MANGA_COLLECTIONS: MangaCollection[] = [
  {
    id: "popular",
    name: "Most Popular",
    subtitle: "What everyone is reading",
    badge: "Most Popular",
    titles: [
      "One Piece",
      "Jujutsu Kaisen",
      "My Dress-Up Darling",
      "Bleach",
      "Black Clover",
      "The Apothecary Diaries",
      "Naruto",
      "My Hero Academia",
      "Kaiju No. 8",
      "Chainsaw Man",
      "Spy x Family",
      "Blue Lock",
      "Sakamoto Days",
      "One Punch Man",
      "Solo Leveling",
      "Dandadan",
      "Oshi no Ko",
      "Hell's Paradise",
      "Wind Breaker",
      "Kagurabachi",
    ],
  },
  {
    id: "acclaimed",
    name: "Critically Acclaimed",
    subtitle: "Beloved by readers and critics",
    badge: "Critically Acclaimed",
    titles: [
      "Vinland Saga",
      "Berserk",
      "Monster",
      "20th Century Boys",
      "Pluto",
      "Vagabond",
      "Slam Dunk",
      "Fullmetal Alchemist",
      "Frieren: Beyond Journey's End",
      "Chainsaw Man",
      "Goodnight Punpun",
      "A Silent Voice",
      "Blade of the Immortal",
      "Nausicaa of the Valley of the Wind",
      "Fire Punch",
      "Dorohedoro",
      "Made in Abyss",
      "Witch Hat Atelier",
      "Delicious in Dungeon",
      "A Bride's Story",
      "Golden Kamuy",
      "March Comes in Like a Lion",
      "Ashita no Joe",
      "The Rose of Versailles",
      "Kingdom",
      "Fist of the North Star",
      "Akira",
      "Death Note",
      "Phoenix",
      "Mushishi",
      "Solanin",
      "Planetes",
      "Real",
      "Homunculus",
      "GTO: Great Teacher Onizuka",
      "Chihayafuru",
      "The Climber",
      "Uzumaki",
      "Ping Pong",
      "Sunny",
      "Nana",
      "Beastars",
      "Look Back",
      "Medalist",
      "Hirayasumi",
    ],
  },
  {
    id: "anime-expo",
    name: "Featured at Anime Expo",
    subtitle: "Spotlighted at the show",
    badge: "Anime Expo",
    titles: [
      "Jujutsu Kaisen",
      "Haikyu!!",
      "Attack on Titan",
      "The Apothecary Diaries",
      "Bungo Stray Dogs",
      "My Dress-Up Darling",
      "My Hero Academia",
      "Black Clover",
      "The Seven Deadly Sins",
      "Fire Force",
      "Tokyo Revengers",
      "Lycoris Recoil",
    ],
  },
  {
    id: "eisner",
    name: "Eisner Award Winners",
    subtitle: "The comics industry's highest honor",
    badge: "Eisner Winner",
    award: true,
    titles: [
      "Old Boy",
      "Tekkonkinkreet",
      "Dororo",
      "A Drifting Life",
      "20th Century Boys",
      "Onward Towards Our Noble Deaths",
      "The Mysterious Underground Men",
      "Showa: A History of Japan",
      "My Brother's Husband",
      "Tokyo Tarareba Girls",
      "Cats of the Louvre",
      "Witch Hat Atelier",
      "Remina",
      "Lovesickness",
      "Shuna's Journey",
      "My Picture Diary",
      "Tokyo These Days",
    ],
  },
  {
    id: "harvey",
    name: "Harvey Award Winners",
    subtitle: "Best Manga honorees",
    badge: "Harvey Winner",
    award: true,
    titles: [
      "Attack on Titan",
      "My Lesbian Experience with Loneliness",
      "My Hero Academia",
      "Witch Hat Atelier",
      "Chainsaw Man",
      "Delicious in Dungeon",
    ],
  },
  {
    id: "seiun",
    name: "Seiun Award Winners",
    subtitle: "Japan's top science-fiction comic honor",
    badge: "Seiun Winner",
    award: true,
    titles: [
      "To Terra...",
      "Domu: A Child's Dream",
      "Appleseed",
      "Urusei Yatsura",
      "Mermaid Saga",
      "Nausicaa of the Valley of the Wind",
      "Parasyte",
      "Ushio and Tora",
      "Cardcaptor Sakura",
      "Planetes",
      "From Far Away",
      "Yokohama Kaidashi Kikou",
      "20th Century Boys",
      "Trigun Maximum",
      "Pluto",
      "Fullmetal Alchemist",
      "Mobile Suit Gundam: The Origin",
      "The World of Narue",
      "Moyashimon",
      "Knights of Sidonia",
      "KochiKame",
      "And Yet the Town Moves",
      "Girls' Last Tour",
      "Hozuki's Coolheadedness",
      "Zettai Karen Children",
      "Orb: On the Movements of the Earth",
      "Delicious in Dungeon",
      "Land of the Lustrous",
    ],
  },
];

function normalize(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(manga|the)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const TITLE_INDEX: Array<{ key: string; collection: MangaCollection }> = MANGA_COLLECTIONS.flatMap(
  (collection) => collection.titles.map((title) => ({ key: normalize(title), collection })),
);

export function collectionsForTitle(title?: string): MangaCollection[] {
  if (!title) return [];
  const key = normalize(title);
  if (!key) return [];
  const out: MangaCollection[] = [];
  const seen = new Set<string>();
  for (const entry of TITLE_INDEX) {
    if (seen.has(entry.collection.id)) continue;
    if (entry.key === key || entry.key.includes(key) || key.includes(entry.key)) {
      seen.add(entry.collection.id);
      out.push(entry.collection);
    }
  }
  return out;
}

const resolveCache = new Map<string, MangaSummary[]>();

const COLLECTION_CACHE_KEY = "argus.manga.collections.v2";
const COLLECTION_TTL = 24 * 60 * 60 * 1000;
const COLLECTION_CACHE_CAP = 12;

type CollectionCacheEntry = { at: number; revision: number; items: MangaSummary[] };

function readCollectionDisk(cacheKey: string, revision: number): MangaSummary[] | null {
  try {
    const raw = localStorage.getItem(COLLECTION_CACHE_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw) as Record<string, CollectionCacheEntry>;
    const entry = store[cacheKey];
    if (!entry || entry.revision !== revision || Date.now() - entry.at > COLLECTION_TTL)
      return null;
    return filterSafeManga(entry.items);
  } catch {
    return null;
  }
}

function writeCollectionDisk(cacheKey: string, revision: number, items: MangaSummary[]): void {
  try {
    const raw = localStorage.getItem(COLLECTION_CACHE_KEY);
    const store = raw ? (JSON.parse(raw) as Record<string, CollectionCacheEntry>) : {};
    store[cacheKey] = { at: Date.now(), revision, items };
    const keys = Object.keys(store);
    if (keys.length > COLLECTION_CACHE_CAP) {
      const stale = keys.sort((a, b) => (store[a]?.at ?? 0) - (store[b]?.at ?? 0));
      for (const k of stale.slice(0, keys.length - COLLECTION_CACHE_CAP)) delete store[k];
    }
    setItemWithRecovery(COLLECTION_CACHE_KEY, JSON.stringify(store));
  } catch {
    return;
  }
}

type AnilistMediaNode = {
  id: number;
  isAdult?: boolean | null;
  title?: { english?: string | null; romaji?: string | null } | null;
  coverImage?: { extraLarge?: string | null; large?: string | null } | null;
  startDate?: { year?: number | null } | null;
  status?: string | null;
  description?: string | null;
  chapters?: number | null;
  genres?: string[] | null;
};

type BatchPageResp = Record<string, { media?: AnilistMediaNode[] | null } | null>;

function cleanHtml(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchAnilistCollectionBatch(titles: string[]): Promise<Map<string, MangaSummary>> {
  const out = new Map<string, MangaSummary>();
  if (!titles.length) return out;
  const varDefs = titles.map((_, i) => `$s${i}: String`).join(", ");
  const fields = titles
    .map(
      (_, i) => `
    p${i}: Page(perPage: 1) {
      media(search: $s${i}, type: MANGA, isAdult: false) {
        id
        isAdult
        title { english romaji }
        coverImage { extraLarge large }
        startDate { year }
        status
        description(asHtml: false)
        chapters
        genres
      }
    }`,
    )
    .join("\n");
  const query = `query (${varDefs}) {\n${fields}\n}`;
  const vars: Record<string, string> = {};
  titles.forEach((t, i) => {
    vars[`s${i}`] = t;
  });

  try {
    const data = await anilistRequest<BatchPageResp>(query, vars, undefined, true);
    if (!data) return out;
    titles.forEach((rawTitle, i) => {
      const node = data[`p${i}`]?.media?.[0];
      if (!node || node.isAdult) return;
      const cover = node.coverImage?.extraLarge ?? node.coverImage?.large ?? undefined;
      if (!cover) return;
      const eng = node.title?.english?.trim();
      const rom = node.title?.romaji?.trim();
      const displayTitle = eng || rom || rawTitle;
      const altTitle = eng && rom && eng.toLowerCase() !== rom.toLowerCase() ? rom : undefined;
      const genres = (node.genres ?? []).filter((g): g is string => typeof g === "string");
      if (isAdultManga({ title: displayTitle, altTitle, genres, isNsfw: Boolean(node.isAdult) })) {
        return;
      }
      out.set(rawTitle, {
        id: `title:${encodeURIComponent(rawTitle)}`,
        title: rawTitle,
        altTitle: altTitle ?? (displayTitle !== rawTitle ? displayTitle : undefined),
        cover,
        year: node.startDate?.year ?? undefined,
        status: node.status ? node.status.toLowerCase() : undefined,
        description: cleanHtml(node.description),
        lastChapter: node.chapters != null ? String(node.chapters) : undefined,
      });
    });
  } catch {
    /* fall through to provider search */
  }
  return out;
}

async function resolveTitleFromProviders(title: string): Promise<MangaSummary | null> {
  const key = normalize(title);
  const pick = (hits: MangaSummary[]) =>
    hits.find((h) => normalize(h.title) === key) ??
    hits.find((h) => normalize(h.title).includes(key) || key.includes(normalize(h.title))) ??
    hits[0] ??
    null;

  const everywhere = await searchMangaEverywhere(title).catch(() => []);
  const hit1 = pick(everywhere);
  if (hit1?.cover) return hit1;

  const mdHits = await mangadexProvider.search(title, 0).catch(() => []);
  const hit2 = pick(mdHits);
  if (hit2?.cover) {
    return { ...hit2, id: `mangadex::${hit2.id}` };
  }
  return hit1 ?? (hit2 ? { ...hit2, id: `mangadex::${hit2.id}` } : null);
}

export async function streamCollection(
  collection: MangaCollection,
  onChunk: (items: MangaSummary[]) => void,
): Promise<void> {
  const revision = suwayomiSourcesRevision();
  const cacheKey = `${activeMangaSourceId()}::${collection.id}`;
  const cached = resolveCache.get(cacheKey);
  if (cached && cached.length > 0) {
    onChunk(filterSafeManga(cached));
    return;
  }
  const disk = readCollectionDisk(cacheKey, revision);
  if (disk && disk.length > 0) {
    resolveCache.set(cacheKey, disk);
    onChunk(disk);
    return;
  }

  const out: MangaSummary[] = [];
  const seen = new Set<string>();
  const CHUNK_SIZE = 10;

  for (let i = 0; i < collection.titles.length; i += CHUNK_SIZE) {
    const slice = collection.titles.slice(i, i + CHUNK_SIZE);
    const anilistMap = await fetchAnilistCollectionBatch(slice);
    const chunkItems: MangaSummary[] = [];
    const missing: string[] = [];

    for (const title of slice) {
      const hit = anilistMap.get(title);
      if (hit && hit.cover) {
        const normKey = normalize(hit.title);
        if (!seen.has(normKey)) {
          seen.add(normKey);
          out.push(hit);
          chunkItems.push(hit);
        }
      } else {
        missing.push(title);
      }
    }

    if (chunkItems.length > 0) {
      onChunk(chunkItems);
    }

    if (missing.length > 0) {
      const fallbackChunk: MangaSummary[] = [];
      for (const title of missing) {
        const resolved = await resolveTitleFromProviders(title);
        if (resolved && resolved.cover) {
          const normKey = normalize(resolved.title);
          if (!seen.has(normKey) && !seen.has(resolved.id)) {
            seen.add(normKey);
            seen.add(resolved.id);
            out.push(resolved);
            fallbackChunk.push(resolved);
          }
        }
      }
      if (fallbackChunk.length > 0) {
        onChunk(fallbackChunk);
      }
    }
  }

  if (out.length > 0) {
    resolveCache.set(cacheKey, out);
    writeCollectionDisk(cacheKey, revision, out);
  }
}
