import "./_localstorage-stub.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { UniversalStreamResolver } from "../src/lib/ebook/expansion/universal-stream-resolver.ts";
import type { UniversalBookResult } from "../src/lib/ebook/expansion/universal-book-search.ts";

test("UniversalStreamResolver creates readable session from book metadata", async () => {
  const resolver = UniversalStreamResolver.getInstance();

  const chetanBhagatBook: UniversalBookResult = {
    id: "chetan-bhagat-2-states",
    title: "2 States: The Story of My Marriage",
    author: "Chetan Bhagat",
    year: 2009,
    format: "epub",
    sourceName: "Anna's Archive & LibGen",
    sourceType: "shadow-library",
    description: "Love marriages around the world are simple: boy loves girl. In India, boy loves girl, boy's family has to love girl's family...",
    downloadUrl: "https://example.com/books/2states.epub",
  };

  const session = await resolver.resolveBook(chetanBhagatBook);
  assert.equal(session.id, "chetan-bhagat-2-states");
  assert.equal(session.title, "2 States: The Story of My Marriage");
  assert.equal(session.author, "Chetan Bhagat");
  assert.ok(session.chapters.length >= 1);

  const content = await session.getChapterContent("chapter-1");
  assert.ok(content.text.length > 0);
  assert.ok(content.text.includes("Chetan Bhagat"));
});
