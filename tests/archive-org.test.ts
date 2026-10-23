import assert from "node:assert/strict";
import test from "node:test";
import { archiveQuery, parseFiles, parseSearch } from "../src/lib/archive-org.ts";

test("query is always limited to open licenses and sanitises user words", () => {
  const q = archiveQuery('anatomy "x" (y)');
  assert.match(q, /licenseurl:\*creativecommons\*/);
  assert.doesNotMatch(q, /["()]\w*"/);
  assert.equal(archiveQuery("").includes("title:"), false);
});

test("parses search docs and drops unsafe identifiers", () => {
  const items = parseSearch({ response: { docs: [{ identifier: "ok-1", title: ["T"], year: 2001 }, { identifier: "../x" }] } });
  assert.deepEqual(items, [{ identifier: "ok-1", title: "T", year: "2001", creator: undefined }]);
});

test("orders files naturally and skips non-video", () => {
  const files = parseFiles("id", {
    files: [
      { name: "L10.mp4", format: "h.264" },
      { name: "L2.mp4", format: "h.264" },
      { name: "cover.jpg", format: "JPEG" },
      { name: "__ia_thumb.jpg", format: "Item Tile" },
    ],
  });
  assert.deepEqual(files.map((f) => f.name), ["L2.mp4", "L10.mp4"]);
  assert.equal(files[0].url, "https://archive.org/download/id/L2.mp4");
});
