import assert from "node:assert/strict";
import test from "node:test";
import { parseArxRecipe, isArxRecipe } from "../src/lib/recipes/arx-recipe.ts";

test("identifies a valid ARX serverless recipe", () => {
  const recipe = {
    schema: "arx.recipe/1",
    id: "sample-archive",
    name: "Public Archive Scraper",
    version: "1.0.0",
    author: "Decentralized Community",
    types: ["movie", "series"],
    hosts: ["archive.org"],
    code: `
      async function getStreams(tmdbId, mediaType, season, episode) {
        return [{
          name: "Archive",
          title: "Public Domain Stream [1080p]",
          url: "https://archive.org/download/sample/movie.mp4",
          quality: "1080p"
        }];
      }
      module.exports = { getStreams };
    `
  };

  assert.equal(isArxRecipe(recipe), true);
  const parsed = parseArxRecipe(recipe);
  assert.equal(parsed.id, "sample-archive");
  assert.equal(parsed.name, "Public Archive Scraper");
  assert.equal(parsed.hosts[0], "archive.org");
  assert.equal(parsed.types.includes("movie"), true);
});

test("rejects invalid ARX recipes", () => {
  assert.equal(isArxRecipe({}), false);
  assert.equal(isArxRecipe({ schema: "unknown" }), false);
  assert.throws(() => parseArxRecipe({ schema: "arx.recipe/1" }), /missing-fields/);
});
