import { safeFetch } from "@/lib/safe-fetch";

export type WordEntry = {
  word: string;
  phonetic: string | null;
  meanings: Array<{ partOfSpeech: string; definition: string }>;
};

export const WORD_HOVER_LANGUAGES: ReadonlyArray<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "nl", label: "Dutch" },
  { code: "tr", label: "Turkish" },
];

const MAX_MEANINGS = 3;

/** Trims punctuation and quotes around a subtitle token; lowercases it. */
export function cleanWord(raw: string): string {
  return raw
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .replace(/['’]s$/i, "")
    .toLowerCase();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDictionaryApi(word: string, json: unknown): WordEntry | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const first = json[0] as {
    phonetic?: string;
    phonetics?: Array<{ text?: string }>;
    meanings?: Array<{ partOfSpeech?: string; definitions?: Array<{ definition?: string }> }>;
  };
  const meanings: WordEntry["meanings"] = [];
  for (const m of first.meanings ?? []) {
    const definition = m.definitions?.[0]?.definition?.trim();
    if (definition) meanings.push({ partOfSpeech: m.partOfSpeech ?? "", definition });
    if (meanings.length >= MAX_MEANINGS) break;
  }
  if (meanings.length === 0) return null;
  const phonetic = first.phonetic || first.phonetics?.find((p) => p.text)?.text || null;
  return { word, phonetic, meanings };
}

export function parseWiktionary(word: string, lang: string, json: unknown): WordEntry | null {
  const sections = (json as Record<string, unknown> | null)?.[lang];
  if (!Array.isArray(sections)) return null;
  const meanings: WordEntry["meanings"] = [];
  for (const sec of sections as Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string }>;
  }>) {
    const definition = stripHtml(sec.definitions?.[0]?.definition ?? "");
    if (definition) meanings.push({ partOfSpeech: sec.partOfSpeech ?? "", definition });
    if (meanings.length >= MAX_MEANINGS) break;
  }
  return meanings.length > 0 ? { word, phonetic: null, meanings } : null;
}

const cache = new Map<string, Promise<WordEntry | null>>();

export function lookupWord(rawWord: string, lang: string): Promise<WordEntry | null> {
  const word = cleanWord(rawWord);
  if (!word || word.length > 40) return Promise.resolve(null);
  const key = `${lang}:${word}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = (async () => {
    if (lang === "en") {
      const res = await safeFetch(
        `https://api.dictionaryapi.dev/v2/entries/en/${encodeURIComponent(word)}`,
        { signal: AbortSignal.timeout(5000) },
      ).catch(() => null);
      if (res?.ok) {
        const parsed = parseDictionaryApi(word, await res.json().catch(() => null));
        if (parsed) return parsed;
      }
    }
    const res = await safeFetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    return parseWiktionary(word, lang, await res.json().catch(() => null));
  })().catch(() => null);
  cache.set(key, p);
  return p;
}
