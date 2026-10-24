import assert from "node:assert/strict";
import test from "node:test";
import { runArxRecipeInHost } from "../src/lib/recipes/arx-runner.ts";
import type { ArxRecipeManifest } from "../src/lib/recipes/arx-recipe.ts";

test("executes an ARX recipe client-side with sandboxed mock HTTP", async () => {
  const recipe: ArxRecipeManifest = {
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
          name: "Archive Org",
          title: "Public Domain Stream [1080p]",
          url: "https://archive.org/download/sample/movie.mp4",
          quality: "1080p"
        }];
      }
      module.exports = { getStreams };
    `
  };

  const results = await runArxRecipeInHost(recipe, {
    type: "movie",
    id: "tt0137523",
    tmdb: { id: 550, kind: "movie" },
    title: "Fight Club",
    year: 1999,
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].name, "Archive Org");
  assert.equal(results[0].quality, "1080p");
  assert.equal(results[0].url, "https://archive.org/download/sample/movie.mp4");
});
