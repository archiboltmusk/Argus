export type MangaSummary = {
  id: string;
  title: string;
  altTitle?: string;
  cover?: string;
  year?: number;
  status?: string;
  description?: string;
  contentRating?: string;
  lastChapter?: string;
  author?: string;
};

export type MangaChapter = {
  id: string;
  chapter: string | null;
  title?: string;
  volume?: string | null;
  pages: number;
  language: string;
  group?: string;
  publishAt?: string;
  downloaded?: boolean;
  serverRead?: boolean;
  serverPage?: number;
};

export type MangaTag = { id: string; name: string; group: string };

export const MANGA_PAGE = 48;

export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ja: "Japanese",
  "es-la": "Spanish (LATAM)",
  es: "Spanish",
  "pt-br": "Portuguese (BR)",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  ru: "Russian",
  id: "Indonesian",
  it: "Italian",
  pl: "Polish",
  vi: "Vietnamese",
  tr: "Turkish",
  ar: "Arabic",
  zh: "Chinese (Simp)",
  "zh-hk": "Chinese (Trad)",
  ko: "Korean",
  th: "Thai",
  uk: "Ukrainian",
  hu: "Hungarian",
  nl: "Dutch",
  fil: "Filipino",
};

let displayNames: Intl.DisplayNames | null = null;
function icuLanguageName(code: string): string | null {
  try {
    displayNames ??= new Intl.DisplayNames(["en"], { type: "language" });
    const name = displayNames.of(code.toLowerCase());
    if (name && name.toLowerCase() !== code.toLowerCase()) return name;
  } catch {
    /* malformed code — fall through */
  }
  return null;
}

export function languageName(code: string): string {
  const key = code.toLowerCase();
  return LANGUAGE_NAMES[key] ?? icuLanguageName(code) ?? code.toUpperCase();
}

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  ja: "🇯🇵",
  "es-la": "🇲🇽",
  es: "🇪🇸",
  "pt-br": "🇧🇷",
  pt: "🇵🇹",
  fr: "🇫🇷",
  de: "🇩🇪",
  ru: "🇷🇺",
  id: "🇮🇩",
  it: "🇮🇹",
  pl: "🇵🇱",
  vi: "🇻🇳",
  tr: "🇹🇷",
  ar: "🇸🇦",
  zh: "🇨🇳",
  "zh-hk": "🇭🇰",
  ko: "🇰🇷",
  th: "🇹🇭",
  uk: "🇺🇦",
  hu: "🇭🇺",
  nl: "🇳🇱",
  fil: "🇵🇭",
  ka: "🇬🇪",
  kk: "🇰🇿",
  ro: "🇷🇴",
  cs: "🇨🇿",
  sk: "🇸🇰",
  bg: "🇧🇬",
  sr: "🇷🇸",
  hr: "🇭🇷",
  el: "🇬🇷",
  he: "🇮🇱",
  fa: "🇮🇷",
  hi: "🇮🇳",
  bn: "🇧🇩",
  ta: "🇮🇳",
  ms: "🇲🇾",
  my: "🇲🇲",
  ca: "🇪🇸",
  fi: "🇫🇮",
  sv: "🇸🇪",
  no: "🇳🇴",
  nb: "🇳🇴",
  da: "🇩🇰",
  lt: "🇱🇹",
  et: "🇪🇪",
  sl: "🇸🇮",
  mn: "🇲🇳",
  ne: "🇳🇵",
};

export function languageFlag(code: string): string {
  return LANGUAGE_FLAGS[code.toLowerCase()] ?? "🏳️";
}

export function chapterLanguages(chapters: MangaChapter[]): Array<{ code: string; count: number }> {
  const counts = new Map<string, number>();
  for (const c of chapters) counts.set(c.language, (counts.get(c.language) ?? 0) + 1);
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => (a.code === "en" ? -1 : b.code === "en" ? 1 : b.count - a.count));
}

const ADULT_FILTER_KEY = "argus.manga.hideAdult";
const ADULT_RATING_RE = /\b(18\+|r-?18|nsfw|adult|erotica|pornographic|hentai|explicit|smut|rx)\b/i;
const ADULT_TITLE_RE = /\b(18\+|r-?18|uncensored|hentai|doujinshi\s*18\+)\b|\(18\+\)|\[18\+\]/i;
const ADULT_DESC_RE = /\b(18\+\s*only|r-?18\s*only|for\s+adults\s+only|hentai|pornographic)\b/i;
const ADULT_GENRE_RE =
  /^(18\+|r-?18|adult|hentai|smut|erotica|pornographic|mature\s*\(?18\+\)?|ecchi\s*18\+|yaoi\s*18\+|yuri\s*18\+|\+18|sexual\s*violence)$/i;

export function shouldHideAdultManga(): boolean {
  try {
    const explicit = localStorage.getItem(ADULT_FILTER_KEY);
    if (explicit === "0" || explicit === "false") return false;
    if (explicit === "1" || explicit === "true") return true;
    const raw =
      localStorage.getItem("argus.settings") ?? localStorage.getItem("argus.settings.shared");
    if (raw) {
      const parsed = JSON.parse(raw) as { hideContent?: { adult?: boolean } };
      if (typeof parsed?.hideContent?.adult === "boolean") {
        return parsed.hideContent.adult;
      }
    }
  } catch {
    /* default to hiding adult content */
  }
  return true;
}

export function setHideAdultManga(hide: boolean): void {
  try {
    localStorage.setItem(ADULT_FILTER_KEY, hide ? "1" : "0");
    window.dispatchEvent(new CustomEvent("argus:manga-adult-filter", { detail: { hide } }));
  } catch {
    /* ignore */
  }
}

export function subscribeHideAdultManga(fn: (hide: boolean) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ hide?: boolean }>).detail;
    fn(typeof detail?.hide === "boolean" ? detail.hide : shouldHideAdultManga());
  };
  window.addEventListener("argus:manga-adult-filter", handler);
  return () => window.removeEventListener("argus:manga-adult-filter", handler);
}

export function isAdultManga(
  item:
    | {
        title?: string;
        altTitle?: string;
        description?: string;
        contentRating?: string;
        genres?: string[];
        isNsfw?: boolean;
      }
    | null
    | undefined,
  ignoreToggle = false,
): boolean {
  if (!ignoreToggle && !shouldHideAdultManga()) return false;
  if (!item) return false;
  if (item.isNsfw === true) return true;
  if (item.contentRating && ADULT_RATING_RE.test(item.contentRating)) return true;
  if (item.title && ADULT_TITLE_RE.test(item.title)) return true;
  if (item.altTitle && ADULT_TITLE_RE.test(item.altTitle)) return true;
  if (item.description && ADULT_DESC_RE.test(item.description)) return true;
  if (Array.isArray(item.genres) && item.genres.some((g) => ADULT_GENRE_RE.test(String(g).trim()))) {
    return true;
  }
  return false;
}

export function isAdultTag(
  tag: { id?: string; name?: string } | null | undefined,
  ignoreToggle = false,
): boolean {
  if (!ignoreToggle && !shouldHideAdultManga()) return false;
  if (!tag) return false;
  const name = (tag.name ?? "").trim();
  const id = (tag.id ?? "").trim();
  return ADULT_GENRE_RE.test(name) || ADULT_RATING_RE.test(name) || ADULT_GENRE_RE.test(id);
}

export function filterSafeManga(items: MangaSummary[]): MangaSummary[] {
  if (!shouldHideAdultManga()) return items;
  return items.filter((m) => !isAdultManga(m, true));
}
