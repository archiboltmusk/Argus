import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseArxRecipe } from "../src/lib/recipes/arx-recipe.ts";
import { runArxRecipeInHost } from "../src/lib/recipes/arx-runner.ts";

test("sample ARX recipe parses and executes flawlessly", async () => {
  const raw = readFileSync("src/data/sample-arx-recipe.json", "utf8");
  const recipe = parseArxRecipe(JSON.parse(raw));

  assert.equal(recipe.id, "open-archive");
  assert.equal(recipe.types.includes("movie"), true);

  const streams = await runArxRecipeInHost(recipe, {
    type: "movie",
    id: "tt0063350",
    title: "Night of the Living Dead",
    year: 1968,
  });

  assert.equal(streams.length, 1);
  assert.equal(streams[0].name, "Internet Archive");
  assert.equal(streams[0].quality, "1080p");
  assert.equal(streams[0].url.includes("archive.org"), true);
});
