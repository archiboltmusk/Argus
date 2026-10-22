import assert from "node:assert/strict";
import test from "node:test";
import { docYearMatches, filesToStreams, parseSearch, searchUrl } from "../src/lib/streams/archive-feed.ts";

test("search url quotes the title safely", () => {
  const u = new URL(searchUrl('Night of the "Living" Dead'));
  assert.equal(u.searchParams.get("q"), 'title:("Night of the  Living  Dead") AND mediatype:movies');
});

test("parseSearch tolerates junk", () => {
  assert.deepEqual(parseSearch(null), []);
  assert.deepEqual(parseSearch({ response: { docs: [{ identifier: "a" }, {}] } }), [{ identifier: "a" }]);
});

test("year must be within one", () => {
  assert.ok(docYearMatches({ identifier: "a", year: "1968" }, 1968));
  assert.ok(docYearMatches({ identifier: "a", year: 1969 }, 1968));
  assert.ok(!docYearMatches({ identifier: "a", year: "1990" }, 1968));
  assert.ok(!docYearMatches({ identifier: "a" }, 1968));
});

test("only playable video files, biggest first", () => {
  const s = filesToStreams("nold", "Night", [
    { name: "a.xml", format: "Metadata" },
    { name: "small.mp4", format: "h.264", size: "100" },
    { name: "big/file one.mp4", format: "h.264", size: 900 },
    { name: "x.jpg", format: "JPEG" },
  ]);
  assert.equal(s.length, 2);
  assert.equal(s[0].url, "https://archive.org/download/nold/big/file%20one.mp4");
});
