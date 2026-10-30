import "./_localstorage-stub.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  universalBookSearch,
  COMMUNITY_BOOK_REPOS,
} from "../src/lib/ebook/expansion/universal-book-search.ts";

test("Universal Book Meta-Search Engine resolves Indic classics locally", async () => {
  const results = await universalBookSearch("Gitanjali", {
    includeShadowLibraries: false,
    includeAudiobooks: false,
  });

  assert.ok(results.length >= 1, "Must find Gitanjali in Indic vault");
  assert.equal(results[0].author, "Rabindranath Tagore");
  assert.equal(results[0].format, "epub");
  assert.equal(results[0].sourceType, "indic-vault");
});

test("Community Book Repositories contains verified extension sources", () => {
  assert.ok(COMMUNITY_BOOK_REPOS.length >= 3, "Must have community repos");

  const lnreader = COMMUNITY_BOOK_REPOS.find((r) => r.name.includes("LNReader"));
  assert.ok(lnreader, "Must contain LNReader community scrapers repo");
  assert.ok(lnreader?.url.startsWith("https://"), "Repo must have https URL");

  const ireader = COMMUNITY_BOOK_REPOS.find((r) => r.name.includes("IReader"));
  assert.ok(ireader, "Must contain IReader open extensions repo");
});
