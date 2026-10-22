import assert from "node:assert/strict";
import test from "node:test";
import { foldTitle, fuzzyCoverage, tokensEquivalent, uniqueTitles } from "../src/lib/title-match.ts";

test("fold strips accents and punctuation", () => {
  assert.equal(foldTitle("Amélie: Le Fabuleux & Co."), "amelie le fabuleux and co");
});

test("single-edit and transliteration variants match", () => {
  assert.ok(tokensEquivalent("kurosawa", "kurosava"));
  assert.ok(tokensEquivalent("tarkovsky", "tarkovski"));
  assert.ok(tokensEquivalent("shawshank", "shawshenk"));
  assert.ok(!tokensEquivalent("alien", "aliens"));
  assert.ok(!tokensEquivalent("batman", "catman"));
});

test("coverage counts equivalent tokens", () => {
  assert.equal(fuzzyCoverage("Seven Samurai", "Shichinin no Samurai"), 0.5);
  assert.equal(fuzzyCoverage("Sátántangó", "Satantango 1994"), 1);
});

test("uniqueTitles dedupes by folded form", () => {
  assert.deepEqual(uniqueTitles(["Léon", "leon", " ", "The Professional"]), ["Léon", "The Professional"]);
});
