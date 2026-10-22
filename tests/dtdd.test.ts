import assert from "node:assert/strict";
import test from "node:test";
import { parseDtddStats, pickDtddItem } from "../src/lib/dtdd";

test("matches by IMDb id before anything else", () => {
  const id = pickDtddItem(
    [
      { id: 1, name: "Heat", releaseYear: "1995", imdbId: "tt0113277" },
      { id: 2, name: "Heat", releaseYear: "1986", imdbId: "tt0091306" },
    ],
    { imdbId: "tt0091306", title: "Heat", year: 1995 },
  );
  assert.equal(id, 2);
});

test("falls back to a single exact name and year match, otherwise refuses", () => {
  const items = [
    { id: 1, name: "Heat", releaseYear: "1995" },
    { id: 2, name: "Heat", releaseYear: "1986" },
  ];
  assert.equal(pickDtddItem(items, { title: "heat", year: 1986 }), 2);
  assert.equal(pickDtddItem(items, { title: "Heat", year: null }), null);
  assert.equal(pickDtddItem([...items, { id: 3, name: "Heat", releaseYear: "1986" }], { title: "Heat", year: 1986 }), null);
});

test("keeps only topics most voters confirm", () => {
  const out = parseDtddStats([
    { yesSum: 2, noSum: 0, topic: { name: "a dog dies" } },
    { yesSum: 40, noSum: 3, topic: { name: "there are jump scares" } },
    { yesSum: 12, noSum: 20, topic: { name: "someone vomits" } },
    { yesSum: 9, noSum: 1, topic: { name: "a character dies", isSpoiler: true } },
  ]);
  assert.deepEqual(out.map((w) => w.name), ["there are jump scares", "a character dies"]);
  assert.equal(out[1].spoiler, true);
});
