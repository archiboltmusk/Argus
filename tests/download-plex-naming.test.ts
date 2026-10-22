import assert from "node:assert/strict";
import test from "node:test";
import { buildPlexLayout } from "../src/lib/download/filename";

const meta = { id: "tt1", name: "Dark: Winter?", releaseInfo: "2017–2020" } as never;

test("movies go in a Title (Year) folder", () => {
  const out = buildPlexLayout({ id: "tt2", name: "Heat", releaseInfo: "1995" } as never, undefined, "https://x/y.mp4");
  assert.deepEqual(out, { folders: ["Heat (1995)"], filename: "Heat (1995).mp4" });
});

test("episodes get season folders and an SxxEyy name with a clean title", () => {
  const out = buildPlexLayout(
    meta,
    { season: 1, episode: 2, name: "Lies / Truth" } as never,
    "https://x/y.mkv?token=1",
  );
  assert.deepEqual(out, {
    folders: ["Dark Winter (2017)", "Season 01"],
    filename: "Dark Winter - S01E02 - Lies  Truth.mkv",
  });
});

test("prefers the canonical IMDb numbering when the stream uses another", () => {
  const out = buildPlexLayout(meta, { season: 1, episode: 30, imdbSeason: 2, imdbEpisode: 4 } as never, "https://x/y.mkv");
  assert.equal(out.folders[1], "Season 02");
  assert.equal(out.filename, "Dark Winter - S02E04.mkv");
});
