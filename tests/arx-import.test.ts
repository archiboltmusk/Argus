import assert from "node:assert/strict";
import test from "node:test";
import { arxRecipeToPluginEntry } from "../src/lib/recipes/arx-import.ts";
import type { ArxRecipeManifest } from "../src/lib/recipes/arx-recipe.ts";

test("converts an ARX recipe into an installed plugin entry format", () => {
  const recipe: ArxRecipeManifest = {
    schema: "arx.recipe/1",
    id: "public-archive",
    name: "Internet Archive Streams",
    version: "1.2.0",
    author: "Decentralized Lab",
    types: ["movie", "series"],
    hosts: ["archive.org"],
    code: `module.exports = { getStreams: async () => [] };`
  };

  const { repo, entry } = arxRecipeToPluginEntry(recipe);
  assert.equal(repo.name, "ARX Decentralized Recipes");
  assert.equal(repo.format, "provider-script");
  assert.equal(entry.id, "public-archive");
  assert.equal(entry.name, "Internet Archive Streams");
  assert.equal(entry.version, "1.2.0");
  assert.deepEqual(entry.types, ["movie", "series"]);
  assert.deepEqual(entry.hosts, ["archive.org"]);
});
