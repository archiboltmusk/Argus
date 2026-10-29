/**
 * Common Bengali & Hindi colloquial phonetic transliterations to official English and native script titles.
 * Resolves regional Romanized search queries (e.g. "Sonar Kella", "Bhooter Bhabishyat") without requiring native script.
 */
export const PHONETIC_MAP: Record<string, { canonical: string; native: string; keywords: string[] }> = {
  "sonar kella": {
    canonical: "Sonar Kella",
    native: "সোনার কেল্লা",
    keywords: ["sonar", "kella", "golden fortress", "shonar kella", "feluda"],
  },
  "shonar kella": {
    canonical: "Sonar Kella",
    native: "সোনার কেল্লা",
    keywords: ["sonar", "kella", "golden fortress", "feluda"],
  },
  "joy baba felunath": {
    canonical: "Joy Baba Felunath",
    native: "জয় বাবা ফেলুনাথ",
    keywords: ["jai baba felunath", "elephant god", "feluda varanasi"],
  },
  "bhooter bhabishyat": {
    canonical: "Bhooter Bhabishyat",
    native: "ভূতের ভবিষ্যৎ",
    keywords: ["bhuter bhabishyat", "future of past", "ghosts", "bhooter bhabisyat"],
  },
  "pather panchali": {
    canonical: "Pather Panchali",
    native: "পথের পাঁচালী",
    keywords: ["song of the little road", "apu trilogy", "bibhutibhushan", "ray"],
  },
  "baishe srabon": {
    canonical: "Baishe Srabon",
    native: "বাইশে শ্রাবণ",
    keywords: ["22 shey srabon", "baishey srabon", "srijit mukherji", "prosenjit"],
  },
  "golondaaj": {
    canonical: "Golondaaj",
    native: "গোলন্দাজ",
    keywords: ["golondaj", "nagendra prasad", "dev", "indian football"],
  },
  "meghe dhaka tara": {
    canonical: "Meghe Dhaka Tara",
    native: "মেঘে ঢাকা তারা",
    keywords: ["cloud capped star", "ritwik ghatak", "neeta"],
  },
  "shajarur kanta": {
    canonical: "Shajarur Kanta",
    native: "শজারুর কাঁটা",
    keywords: ["sajarur kanta", "byomkesh porcupine", "sharadindu"],
  },
  "chander pahar": {
    canonical: "Chander Pahar",
    native: "চাঁদের পাহাড়",
    keywords: ["mountain of the moon", "shankar africa", "dev bibhutibhushan"],
  },
};

/**
 * Expands a colloquial search query with regional phonetic and native script variations.
 */
export function expandPhoneticSearch(query: string): string[] {
  const norm = query.toLowerCase().trim();
  const direct = PHONETIC_MAP[norm];
  if (direct) {
    return [direct.canonical, direct.native, ...direct.keywords];
  }

  // Token matching
  const results = new Set<string>();
  for (const [key, entry] of Object.entries(PHONETIC_MAP)) {
    if (norm.includes(key) || key.includes(norm)) {
      results.add(entry.canonical);
      results.add(entry.native);
      entry.keywords.forEach((k) => results.add(k));
    }
  }

  return Array.from(results);
}
