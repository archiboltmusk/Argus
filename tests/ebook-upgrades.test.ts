import "./_localstorage-stub.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  getBionicFixationLength,
  splitBionicWord,
  formatBionicHtml,
  formatBionicMarkdown,
} from "../src/lib/ebook/bionic-reading.ts";
import {
  loadEBookReaderPrefs,
  saveEBookReaderPrefs,
  type EBookAnnotation,
  type EBookBookmark,
} from "../src/lib/ebook/reader-state.ts";
import {
  makeMarkdownBook,
  exportAnnotationsToMarkdown,
} from "../src/lib/ebook/offline-export.ts";
import type { EBook } from "../src/lib/ebook/api.ts";
import type { EBookChapter, EBookChapterContent } from "../src/lib/ebook/providers.ts";

test("Bionic Reading calculates fixation length accurately", () => {
  assert.equal(getBionicFixationLength(0), 0);
  assert.equal(getBionicFixationLength(1), 1);
  assert.equal(getBionicFixationLength(2), 1);
  assert.equal(getBionicFixationLength(3), 1);
  assert.equal(getBionicFixationLength(4), 2);
  assert.equal(getBionicFixationLength(5), 2);
  assert.equal(getBionicFixationLength(6), 3);
  assert.equal(getBionicFixationLength(7), 3);
  assert.equal(getBionicFixationLength(8), 3);
  assert.equal(getBionicFixationLength(10), 5); // ceil(10 * 0.45) = 5
  assert.equal(getBionicFixationLength(13), 6); // ceil(13 * 0.45) = 6
});

test("Bionic Reading tokenizes punctuation and words", () => {
  const parts = splitBionicWord('"Reading..."');
  assert.equal(parts.prefix, '"');
  assert.equal(parts.fixation, "Rea");
  assert.equal(parts.suffix, "ding");
  assert.equal(parts.tail, '..."');

  const html = formatBionicHtml("Argus guides the reader.");
  assert.ok(html.includes("<b>Ar</b>gus"));
  assert.ok(html.includes("<b>gui</b>des"));
  assert.ok(html.includes("<b>t</b>he"));
  assert.ok(html.includes("<b>rea</b>der."));

  const md = formatBionicMarkdown("Deep focus reading");
  assert.ok(md.includes("**De**ep"));
  assert.ok(md.includes("**fo**cus"));
  assert.ok(md.includes("**rea**ding"));
});

test("Reader State handles E-Ink and Amber backgrounds, and bionic reading preference", () => {
  localStorage.clear();
  const initial = loadEBookReaderPrefs();
  assert.equal(initial.background, "dark");
  assert.equal(initial.bionicReading, false);

  saveEBookReaderPrefs({
    ...initial,
    background: "eink",
    bionicReading: true,
  });

  const updatedEink = loadEBookReaderPrefs();
  assert.equal(updatedEink.background, "eink");
  assert.equal(updatedEink.bionicReading, true);

  saveEBookReaderPrefs({
    ...initial,
    background: "amber",
    bionicReading: true,
  });

  const updatedAmber = loadEBookReaderPrefs();
  assert.equal(updatedAmber.background, "amber");
  assert.equal(updatedAmber.bionicReading, true);
});

test("Offline Export builds Obsidian-compatible markdown notes and callouts", () => {
  const annotations: EBookAnnotation[] = [
    {
      id: "ann-1",
      chapterId: "ch-1",
      chapterLabel: "Chapter 1",
      ranges: [{ line: 5, start: 0, end: 32 }],
      text: "The universe was cold and silent.",
      color: "#ff9f4d",
      density: 20,
      title: "Atmosphere note",
      body: "Important opening worldbuilding theme.",
      tags: ["worldbuilding", "intro"],
      reference: false,
      createdAt: Date.now(),
    },
  ];

  const bookmarks: EBookBookmark[] = [
    {
      id: "bm-1",
      bookId: "book-1",
      chapterId: "ch-1",
      chapterTitle: "Chapter 1: The Beginning",
      line: 12,
      preview: "He stepped out into the twilight.",
      createdAt: Date.now(),
    },
  ];

  const md = exportAnnotationsToMarkdown("Three-Body Problem", annotations, bookmarks);
  assert.ok(md.includes("# Notes & Highlights: Three-Body Problem"));
  assert.ok(md.includes("> [!quote] Chapter 1"));
  assert.ok(md.includes("> The universe was cold and silent."));
  assert.ok(md.includes("> **Note**: Important opening worldbuilding theme."));
  assert.ok(md.includes("#worldbuilding #intro"));
  assert.ok(md.includes("- **Chapter 1: The Beginning** (Line 13):"));
});

test("Offline Export formats full book Markdown with frontmatter and TOC", () => {
  const mockBook: EBook = {
    id: "source:mock-1",
    title: "Project Hail Mary",
    authors: ["Andy Weir"],
    year: 2021,
    source: "source",
    sourceName: "Standard Books",
  };

  const chapters: EBookChapter[] = [
    { id: "c1", title: "Chapter 1" },
    { id: "c2", title: "Chapter 2" },
  ];

  const contents: EBookChapterContent[] = [
    { text: "I'm asleep. Then I'm not.\n\nMy eyes won't open." },
    { text: "Two plus two is four. Okay, my brain works." },
  ];

  const mdBook = makeMarkdownBook(mockBook, chapters, contents);
  assert.ok(mdBook.includes('title: "Project Hail Mary"'));
  assert.ok(mdBook.includes('authors: ["Andy Weir"]'));
  assert.ok(mdBook.includes("## Table of Contents"));
  assert.ok(mdBook.includes("- [Chapter 1](#chapter-1)"));
  assert.ok(mdBook.includes("- [Chapter 2](#chapter-2)"));
  assert.ok(mdBook.includes("## Chapter 1"));
  assert.ok(mdBook.includes("I'm asleep. Then I'm not."));
  assert.ok(mdBook.includes("## Chapter 2"));
  assert.ok(mdBook.includes("Two plus two is four."));
});
