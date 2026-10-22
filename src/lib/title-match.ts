const PUNCT = /[^\p{L}\p{N}\s]/gu;

export function foldTitle(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(PUNCT, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return la > lb ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
}

// Collapses spellings that differ only by transliteration noise
// (Kurosawa/Kurosava, Tchaikovsky/Chaikovsky): vowels, doubled letters and
// look-alike consonants are folded away.
export function phoneticKey(token: string): string {
  const t = token
    .replace(/ph/g, "f")
    .replace(/ck|q/g, "k")
    .replace(/[cz]/g, "s")
    .replace(/[wv]/g, "v")
    .replace(/y/g, "i")
    .replace(/(.)\1+/g, "$1");
  return t[0] + t.slice(1).replace(/[aeiouh]/g, "");
}

export function tokensEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 6 || b.length < 6 || a[0] !== b[0]) return false;
  if (/\d/.test(a) || /\d/.test(b)) return false;
  // "Alien" and "Aliens" are different films; never fuzz a plural.
  if (a + "s" === b || b + "s" === a) return false;
  return editDistanceAtMostOne(a, b) || phoneticKey(a) === phoneticKey(b);
}

export function titleTokens(title: string): string[] {
  return foldTitle(title)
    .split(" ")
    .filter((w) => w.length > 0);
}

// Share of `expected` tokens that have an equivalent token in `candidate`.
export function fuzzyCoverage(expected: string, candidate: string): number {
  const e = titleTokens(expected);
  const c = titleTokens(candidate);
  if (e.length === 0 || c.length === 0) return 0;
  let hit = 0;
  for (const t of e) if (c.some((x) => tokensEquivalent(t, x))) hit++;
  return hit / e.length;
}

export function uniqueTitles(list: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const t = raw?.trim();
    if (!t) continue;
    const k = foldTitle(t);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}
