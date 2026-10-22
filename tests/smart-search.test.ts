import assert from "node:assert/strict";
import test from "node:test";
import { smartMatch } from "../src/lib/smart-search.ts";

const alien = { name: "Alien", genres: ["Horror", "Sci-Fi"], releaseInfo: "1979", description: "A crew meets a creature." };
const toy = { name: "Toy Story", genres: ["Animation", "Family", "Comedy"], releaseInfo: "1995" };

test("name substring still matches", () => assert.ok(smartMatch(alien, "alie")));
test("mood maps to genres", () => {
  assert.ok(smartMatch(alien, "something scary"));
  assert.ok(!smartMatch(toy, "something scary"));
});
test("decades and genres combine", () => {
  assert.ok(smartMatch(toy, "funny 90s"));
  assert.ok(!smartMatch(alien, "funny 90s"));
  assert.ok(smartMatch(alien, "70s horror"));
});
test("description words match", () => assert.ok(smartMatch(alien, "creature")));
