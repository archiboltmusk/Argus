import assert from "node:assert/strict";
import test from "node:test";
import { parseListUrl, validCoverImage } from "../src/lib/library-groups/urls.ts";

test("mdblist and trakt urls parse to canonical form", () => {
  assert.deepEqual(parseListUrl("https://mdblist.com/lists/linaspurinis/top-watched-movies-of-the-week/"), {
    source: "mdblist", path: "linaspurinis/top-watched-movies-of-the-week", url: "https://mdblist.com/lists/linaspurinis/top-watched-movies-of-the-week",
  });
  assert.equal(parseListUrl("https://www.mdblist.com/lists/1234")?.path, "1234");
  assert.equal(parseListUrl("https://trakt.tv/users/justin/lists/latest-4k-releases")?.source, "trakt");
  assert.equal(parseListUrl("https://trakt.tv/lists/2142753")?.path, "lists/2142753");
});

test("unsafe or foreign urls are rejected", () => {
  for (const bad of [
    "http://mdblist.com/lists/a/b",
    "https://evil.com/lists/a/b",
    "https://user:pw@mdblist.com/lists/a/b",
    "https://mdblist.com:8443/lists/a/b",
    "https://mdblist.com/lists/not-numeric",
    "https://trakt.tv/users/a/watchlist",
    "not a url",
  ]) assert.equal(parseListUrl(bad), null, bad);
});

test("cover images", () => {
  assert.ok(validCoverImage(""));
  assert.ok(validCoverImage("https://example.com/a.png"));
  assert.ok(!validCoverImage("javascript:alert(1)"));
  assert.ok(!validCoverImage("http://example.com/a.png"));
});
