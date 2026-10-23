export const RECIPE_SCHEMA = "argus.recipe/1";
export const CATALOG_SCHEMA = "argus.catalog/1";

export const RECIPE_KINDS = ["film", "series", "course", "book", "audio"] as const;
export type RecipeKind = (typeof RECIPE_KINDS)[number];

export type RecipeSource =
  | { type: "http"; url: string; sha256?: string; priority: number }
  | { type: "archive_org"; id: string; file?: string; sha256?: string; priority: number }
  | { type: "ipfs"; cid: string; gatewayHint?: string; priority: number };

export type RecipePart = { title: string; sources: RecipeSource[] };

export type Recipe = {
  schema: typeof RECIPE_SCHEMA;
  id: string;
  kind: RecipeKind;
  title: string;
  year?: number;
  language?: string;
  creators: { role: string; name: string }[];
  synopsis?: string;
  poster?: string;
  license: { id: string; evidenceUrl: string };
  parts: RecipePart[];
  curator?: { name: string; contact?: string };
  updated?: string;
};

export type Catalog = { schema: typeof CATALOG_SCHEMA; name: string; curator?: string; recipes: Recipe[] };

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const MAX_PARTS = 500;
const MAX_SOURCES = 12;
const SHA256 = /^[0-9a-f]{64}$/i;
const CID = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,})$/;
const IA_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 2000): string | undefined =>
  typeof v === "string" && v.trim() && v.length <= max ? v.trim() : undefined;

// Only https endpoints; private/loopback hosts are rejected so a feed cannot probe the LAN.
export function isSafeHttpsUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h.includes(":")) return false;
  const m = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(h);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)) return false;
    if (a === 192 && b === 168) return false;
  }
  return true;
}

function parseSource(v: unknown, index: number): Parsed<RecipeSource> {
  if (!isObj(v)) return fail("source is not an object");
  const priority = typeof v.priority === "number" && Number.isFinite(v.priority) ? v.priority : index + 1;
  const sha256 = str(v.sha256);
  if (sha256 && !SHA256.test(sha256)) return fail("sha256 must be 64 hex characters");
  if (v.type === "http") {
    const url = str(v.url, 4000);
    if (!url || !isSafeHttpsUrl(url)) return fail("http source needs a public https url");
    return { ok: true, value: { type: "http", url, priority, ...(sha256 ? { sha256 } : {}) } };
  }
  if (v.type === "archive_org") {
    const id = str(v.id, 100);
    if (!id || !IA_ID.test(id)) return fail("invalid archive.org identifier");
    const file = str(v.file, 500);
    return { ok: true, value: { type: "archive_org", id, priority, ...(file ? { file } : {}), ...(sha256 ? { sha256 } : {}) } };
  }
  if (v.type === "ipfs") {
    const cid = str(v.cid, 120);
    if (!cid || !CID.test(cid)) return fail("invalid ipfs cid");
    const hint = str(v.gateway_hint, 4000);
    if (hint && !isSafeHttpsUrl(hint)) return fail("gateway_hint must be a public https url");
    return { ok: true, value: { type: "ipfs", cid, priority, ...(hint ? { gatewayHint: hint } : {}) } };
  }
  return fail(`unsupported source type: ${String(v.type)}`);
}

export function parseRecipe(raw: unknown): Parsed<Recipe> {
  if (!isObj(raw)) return fail("recipe is not an object");
  const schema = str(raw.schema, 40);
  if (!schema || !/^argus\.recipe\/\d+$/.test(schema)) return fail("missing schema");
  if (schema !== RECIPE_SCHEMA) return fail(`unsupported recipe version ${schema}; update Argus`);
  const id = str(raw.id, 200);
  const title = str(raw.title, 500);
  if (!id || !title) return fail("id and title are required");
  const kind = RECIPE_KINDS.find((k) => k === raw.kind);
  if (!kind) return fail("unknown kind");
  const lic = isObj(raw.license) ? raw.license : undefined;
  const licId = str(lic?.spdx_or_ia ?? lic?.id, 200);
  const evidence = str(lic?.evidence_url, 4000);
  if (!licId || !evidence || !isSafeHttpsUrl(evidence)) return fail("license id and https evidence_url are required");
  if (!Array.isArray(raw.parts) || raw.parts.length === 0 || raw.parts.length > MAX_PARTS) return fail("parts missing or too many");
  const parts: RecipePart[] = [];
  for (const p of raw.parts) {
    if (!isObj(p) || !Array.isArray(p.sources) || p.sources.length === 0 || p.sources.length > MAX_SOURCES) {
      return fail("every part needs 1-12 sources");
    }
    const sources: RecipeSource[] = [];
    for (const [i, s] of p.sources.entries()) {
      const r = parseSource(s, i);
      if (!r.ok) return fail(r.error);
      sources.push(r.value);
    }
    parts.push({ title: str(p.title, 500) ?? title, sources: sources.sort((a, b) => a.priority - b.priority) });
  }
  const year = typeof raw.year === "number" && Number.isInteger(raw.year) ? raw.year : undefined;
  const poster = str(raw.poster, 4000);
  const creators = Array.isArray(raw.creators)
    ? raw.creators.flatMap((c) => {
        const name = isObj(c) ? str(c.name, 200) : undefined;
        return name ? [{ role: str((c as Record<string, unknown>).role, 60) ?? "creator", name }] : [];
      })
    : [];
  const cur = isObj(raw.curator) ? str(raw.curator.name, 200) : undefined;
  return {
    ok: true,
    value: {
      schema: RECIPE_SCHEMA,
      id,
      kind,
      title,
      ...(year ? { year } : {}),
      ...(str(raw.language, 20) ? { language: str(raw.language, 20) } : {}),
      creators,
      ...(str(raw.synopsis, 5000) ? { synopsis: str(raw.synopsis, 5000) } : {}),
      ...(poster && isSafeHttpsUrl(poster) ? { poster } : {}),
      license: { id: licId, evidenceUrl: evidence },
      parts,
      ...(cur ? { curator: { name: cur } } : {}),
      ...(str(raw.updated, 40) ? { updated: str(raw.updated, 40) } : {}),
    },
  };
}

export function serializeRecipe(r: Recipe): string {
  const out = {
    schema: r.schema,
    id: r.id,
    kind: r.kind,
    title: r.title,
    year: r.year,
    language: r.language,
    creators: r.creators,
    synopsis: r.synopsis,
    poster: r.poster,
    license: { spdx_or_ia: r.license.id, evidence_url: r.license.evidenceUrl },
    parts: r.parts.map((p) => ({
      title: p.title,
      sources: p.sources.map((s) =>
        s.type === "ipfs" ? { type: s.type, cid: s.cid, gateway_hint: s.gatewayHint, priority: s.priority } : s,
      ),
    })),
    curator: r.curator,
    updated: r.updated,
  };
  return JSON.stringify(out, null, 2);
}
