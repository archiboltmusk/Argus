import { CATALOG_SCHEMA, parseRecipe, type Catalog, type Parsed } from "./schema";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_RECIPES = 5000;

// Invalid recipes are skipped, not fatal, so one bad entry cannot hide a whole feed.
export function parseCatalog(raw: unknown): Parsed<Catalog & { skipped: number }> {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "catalog is not an object" };
  const c = raw as Record<string, unknown>;
  if (c.schema !== CATALOG_SCHEMA) return { ok: false, error: "unsupported catalog version" };
  if (typeof c.name !== "string" || !c.name.trim()) return { ok: false, error: "catalog name required" };
  if (!Array.isArray(c.recipes) || c.recipes.length > MAX_RECIPES) return { ok: false, error: "recipes missing or too many" };
  const recipes = [];
  let skipped = 0;
  for (const r of c.recipes) {
    const p = parseRecipe(r);
    if (p.ok) recipes.push(p.value);
    else skipped++;
  }
  return {
    ok: true,
    value: {
      schema: CATALOG_SCHEMA,
      name: c.name.trim().slice(0, 200),
      ...(typeof c.curator === "string" ? { curator: c.curator.slice(0, 200) } : {}),
      recipes,
      skipped,
    },
  };
}

export function parseCatalogText(text: string): Parsed<Catalog & { skipped: number }> {
  if (text.length > MAX_BYTES) return { ok: false, error: "catalog too large" };
  try {
    return parseCatalog(JSON.parse(text));
  } catch {
    return { ok: false, error: "catalog is not valid JSON" };
  }
}
