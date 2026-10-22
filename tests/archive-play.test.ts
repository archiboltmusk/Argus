// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { archivePlayerSrc, isArchivePath } from "../src/lib/archive-play.ts";

test("archive paths are recognised by extension", () => {
  for (const path of ["a.zip", "A.RAR", "x/y.7z", "c:\\d\\e.tar", "f.tgz", "g.tar.gz"])
    assert.equal(isArchivePath(path), true, path);
  for (const path of ["movie.mkv", "notes.gz", "zip", "a.zip.txt", ""])
    assert.equal(isArchivePath(path), false, path);
});

test("the unpacked video plays from its cache path with the archive as context", () => {
  const src = archivePlayerSrc(
    { path: "/cache/ab/Show.S01E01.mkv", name: "Show.S01E01.mkv", bytes: 5 },
    "/downloads/Show.rar",
  );
  assert.equal(src.url, "/cache/ab/Show.S01E01.mkv");
  assert.equal(src.title, "Show.S01E01");
  assert.equal(src.subtitle, "Archive · Show.rar");
  assert.equal(src.suppressCloudSync, true);
});
