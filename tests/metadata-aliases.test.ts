import assert from "node:assert/strict";
import test from "node:test";

test("parsers read each provider shape", async () => {
  const m = await import("../src/lib/metadata-fusion/alias-parsers.ts");
  assert.deepEqual(m.parseTmdbAliases({ titles: [{ title: "Léon" }] }), ["Léon"]);
  assert.deepEqual(m.parseTvmazeAkas([{ name: "A" }, { name: "B" }]), ["A", "B"]);
  assert.deepEqual(
    m.parseAnilistSynonyms({ data: { Media: { title: { romaji: "R", english: null, native: "N" }, synonyms: ["S"] } } }),
    ["R", "", "N", "S"],
  );
});
