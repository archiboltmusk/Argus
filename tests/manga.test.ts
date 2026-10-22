import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeBaseUrl,
  parsePages,
  parseSearch,
  parseSeriesDetail,
  sortChapters,
} from "../src/lib/manga/protocol.ts";
import {
  buildSpreads,
  clickZone,
  displayOrder,
  isImageName,
  naturalCompare,
  resumeTarget,
  unreadCount,
} from "../src/lib/manga/reader-logic.ts";

const BASE = "https://src.example/api";

test("base url must be http(s) and loses trailing slash", () => {
  assert.equal(normalizeBaseUrl(" https://a.example/x/ "), "https://a.example/x");
  assert.equal(normalizeBaseUrl("ftp://a.example"), null);
  assert.equal(normalizeBaseUrl("not a url"), null);
});

test("search drops entries without id or title and resolves covers", () => {
  const page = parseSearch(BASE, {
    results: [{ id: 1, title: "A", cover: "/c.jpg" }, { id: "x" }, null],
    hasMore: true,
  });
  assert.equal(page.results.length, 1);
  assert.equal(page.results[0].id, "1");
  assert.equal(page.results[0].cover, "https://src.example/c.jpg");
  assert.equal(page.hasMore, true);
});

test("series detail sorts chapters and removes duplicates", () => {
  const d = parseSeriesDetail(BASE, {
    id: "s",
    title: "S",
    chapters: [
      { id: "c10", number: "10" },
      { id: "c2", number: 2 },
      { id: "c2", number: 2 },
      { id: "extra" },
      { id: "c1.5", number: "1.5" },
    ],
  });
  assert.deepEqual(d?.chapters.map((c) => c.id), ["c1.5", "c2", "c10", "extra"]);
  assert.equal(d?.chapters[0].title, "Chapter 1.5");
});

test("sortChapters keeps unnumbered chapters in source order", () => {
  const out = sortChapters([
    { id: "b", number: null, title: "b" },
    { id: "a", number: null, title: "a" },
    { id: "n", number: 1, title: "n" },
  ]);
  assert.deepEqual(out.map((c) => c.id), ["n", "b", "a"]);
});

test("pages accept strings or objects and reject non-http schemes", () => {
  const pages = parsePages(BASE, { pages: ["a.jpg", { url: "https://cdn/b.png" }, "javascript:x", 5] });
  assert.deepEqual(pages, ["https://src.example/api/a.jpg", "https://cdn/b.png", "https://src.example/api/5"]);
});

test("spreads keep the cover and wide pages alone", () => {
  assert.deepEqual(buildSpreads(6, new Set(), true), [[0], [1, 2], [3, 4], [5]]);
  assert.deepEqual(buildSpreads(6, new Set([2]), true), [[0], [1], [2], [3, 4], [5]]);
  assert.deepEqual(buildSpreads(3, new Set(), false), [[0], [1], [2]]);
});

test("rtl mirrors display order and click zones", () => {
  assert.deepEqual(displayOrder([4, 5], "rtl"), [5, 4]);
  assert.equal(clickZone(10, 300, "ltr"), "back");
  assert.equal(clickZone(10, 300, "rtl"), "forward");
  assert.equal(clickZone(150, 300, "ltr"), "menu");
  assert.equal(clickZone(290, 300, "ltr"), "forward");
});

test("resume picks the unfinished chapter or the next one", () => {
  const chapters = ["a", "b", "c"].map((id, i) => ({ id, number: i + 1, title: id }));
  const mid = { last: { chapterId: "b", chapterLabel: "b", page: 3, total: 10, updatedAt: 0 }, read: ["a"] };
  assert.deepEqual(resumeTarget(chapters, mid), { chapter: chapters[1], page: 3 });
  const done = { last: { chapterId: "b", chapterLabel: "b", page: 9, total: 10, updatedAt: 0 }, read: ["a", "b"] };
  assert.deepEqual(resumeTarget(chapters, done), { chapter: chapters[2], page: 0 });
  assert.deepEqual(resumeTarget(chapters, undefined), { chapter: chapters[0], page: 0 });
  assert.equal(unreadCount(chapters, done), 1);
});

test("archive entries are filtered and naturally ordered", () => {
  assert.equal(isImageName("__MACOSX/1.jpg"), false);
  assert.equal(isImageName("ch/.hidden.png"), false);
  assert.equal(isImageName("ch/10.PNG"), true);
  assert.equal(isImageName("ComicInfo.xml"), false);
  assert.deepEqual(["10.jpg", "2.jpg", "1.jpg"].sort(naturalCompare), ["1.jpg", "2.jpg", "10.jpg"]);
});
