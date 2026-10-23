import assert from "node:assert/strict";
import test from "node:test";
import { parseArchiveId, recipeFromArchive } from "../src/lib/recipes/archive-import.ts";
import { parseCatalogText } from "../src/lib/recipes/catalog.ts";
import { endpointLooksPlayable, pickSource, resetDownSources } from "../src/lib/recipes/fallback.ts";
import { isSafeHttpsUrl, parseRecipe, serializeRecipe } from "../src/lib/recipes/schema.ts";

const base = {
  schema: "argus.recipe/1",
  id: "recipe:c:x",
  kind: "film",
  title: "Rare Print",
  license: { spdx_or_ia: "publicdomain", evidence_url: "https://archive.org/details/x" },
  parts: [
    {
      title: "Main",
      sources: [
        { type: "archive_org", id: "x", priority: 2 },
        { type: "http", url: "https://example.org/a.mp4", priority: 1 },
      ],
    },
  ],
};

test("recipe parses, sorts sources by priority, and round-trips", () => {
  const r = parseRecipe(base);
  assert.ok(r.ok);
  assert.equal(r.value.parts[0].sources[0].type, "http");
  const again = parseRecipe(JSON.parse(serializeRecipe(r.value)));
  assert.ok(again.ok);
  assert.deepEqual(again.value, r.value);
});

test("recipe without license or with unsafe scheme is rejected", () => {
  assert.ok(!parseRecipe({ ...base, license: undefined }).ok);
  const bad = structuredClone(base);
  bad.parts[0].sources = [{ type: "http", url: "javascript:alert(1)", priority: 1 } as never];
  assert.ok(!parseRecipe(bad).ok);
  assert.ok(!parseRecipe({ ...base, schema: "argus.recipe/2" }).ok);
});

test("private and non-https urls are refused", () => {
  for (const u of ["http://a.org/x", "https://localhost/x", "https://192.168.1.2/x", "https://10.0.0.1/x", "https://[::1]/x", "file:///etc/passwd"]) {
    assert.ok(!isSafeHttpsUrl(u), u);
  }
  assert.ok(isSafeHttpsUrl("https://archive.org/x"));
});

test("catalog skips bad recipes", () => {
  const c = parseCatalogText(JSON.stringify({ schema: "argus.catalog/1", name: "Dr Roy", recipes: [base, { nope: 1 }] }));
  assert.ok(c.ok);
  assert.equal(c.value.recipes.length, 1);
  assert.equal(c.value.skipped, 1);
  assert.ok(!parseCatalogText("{").ok);
});

test("archive import accepts open licenses only", () => {
  assert.equal(parseArchiveId("https://archive.org/details/rare_film_1965?x=1"), "rare_film_1965");
  const files = [{ name: "a.mp4", size: "10" }];
  const open = recipeFromArchive(
    "rare",
    { metadata: { title: "T", date: "1965-01-01", mediatype: "movies", licenseurl: "https://creativecommons.org/publicdomain/mark/1.0/" }, files },
    new Date(0),
  );
  assert.ok(open.ok);
  assert.equal(open.value.year, 1965);
  assert.ok(parseRecipe(JSON.parse(serializeRecipe(open.value))).ok);
  assert.ok(!recipeFromArchive("rare", { metadata: { title: "T" }, files }).ok);
  assert.ok(!recipeFromArchive("rare", { metadata: { title: "T", licenseurl: "https://example.com/all-rights" }, files }).ok);
});

test("fallback rolls over after a failure or timeout", async () => {
  resetDownSources();
  const r = parseRecipe(base);
  assert.ok(r.ok);
  const sources = r.value.parts[0].sources;
  const res = await pickSource(sources, async (s) => s.type === "archive_org", 50);
  assert.equal(res.source?.type, "archive_org");
  assert.equal(res.failed.length, 1);
  resetDownSources();
  const slow = await pickSource(sources, (s) => (s.type === "http" ? new Promise<boolean>(() => {}) : Promise.resolve(true)), 30);
  assert.equal(slow.source?.type, "archive_org");
  resetDownSources();
  const none = await pickSource(sources, async () => false, 30);
  assert.equal(none.source, undefined);
  assert.equal(none.failed.length, 2);
});

test("endpoint check wants range support and media type", () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });
  assert.ok(endpointLooksPlayable(206, h({ "content-type": "video/mp4" })));
  assert.ok(endpointLooksPlayable(200, h({ "content-type": "application/pdf", "accept-ranges": "bytes" })));
  assert.ok(!endpointLooksPlayable(200, h({ "content-type": "video/mp4" })));
  assert.ok(!endpointLooksPlayable(206, h({ "content-type": "text/html" })));
});
