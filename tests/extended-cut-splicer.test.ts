import "./_localstorage-stub.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  generateMpvEdlUri,
  calculateExtendedRuntimeSeconds,
  realignSubtitlesForExtendedCut,
  exportExtendedCutRecipeJson,
  importExtendedCutRecipeJson,
  type ExtendedCutRecipe,
} from "../src/lib/player/extended-cut-splicer.ts";
import type { SubCue } from "../src/lib/subtitles/parser.ts";

test("Extended Cut Splicer generates valid MPV edl:// multi-segment timeline", () => {
  const recipe: ExtendedCutRecipe = {
    id: "lotr-rotk-extended",
    movieTitle: "The Lord of the Rings: The Return of the King",
    editionName: "Mouth of Sauron Restored",
    mainMoviePathOrUrl: "/movies/lotr_rotk_theatrical.mkv",
    mainMovieDurationSeconds: 12000, // 200 minutes
    insertions: [
      {
        id: "mouth-of-sauron",
        title: "The Mouth of Sauron Scene",
        insertAtSeconds: 9000, // 150 minutes in
        clipPathOrUrl: "/extras/mouth_of_sauron_scene.mkv",
        durationSeconds: 180, // 3 minutes
        clipStartOffset: 0,
      },
    ],
  };

  const edlUri = generateMpvEdlUri(recipe);
  assert.ok(edlUri.startsWith("edl://"), "URI must begin with edl:// protocol");
  assert.ok(edlUri.includes("mouth_of_sauron_scene.mkv"), "Must include the deleted scene segment");
  assert.ok(edlUri.includes("9000.000"), "Must include the main segment cutoff timecode");

  const totalRuntime = calculateExtendedRuntimeSeconds(recipe);
  assert.equal(totalRuntime, 12180, "Runtime must reflect original plus 180s added footage");
});

test("Extended Cut Subtitle Realignment shifts dialogue after insertion and merges scene cues", () => {
  const theatricalCues: SubCue[] = [
    { start: 100, end: 105, text: "Scene before the cut." },
    { start: 8900, end: 8905, text: "Right before the gates." },
    { start: 9010, end: 9015, text: "Scene after the cut (Aragorn charges)." },
  ];

  const deletedSceneCues: SubCue[] = [
    { start: 10, end: 15, text: "My master, Sauron the Great, bids thee welcome." },
  ];

  const insertions = [
    {
      id: "mouth-of-sauron",
      title: "Mouth of Sauron",
      insertAtSeconds: 9000,
      clipPathOrUrl: "/extras/deleted.mkv",
      durationSeconds: 180,
      subtitleCues: deletedSceneCues,
    },
  ];

  const realigned = realignSubtitlesForExtendedCut(theatricalCues, insertions);

  // Cue before insertion must remain unchanged
  assert.equal(realigned[0].start, 100);
  assert.equal(realigned[1].start, 8900);

  // Injected deleted scene cue must appear at 9000 + 10 = 9010
  const injected = realigned.find((c) => c.text.includes("Sauron the Great"));
  assert.ok(injected, "Injected cue must exist in timeline");
  assert.equal(injected?.start, 9010);

  // Theatrical cue that was originally at 9010 must now be shifted by +180s = 9190
  const shifted = realigned.find((c) => c.text.includes("Aragorn charges"));
  assert.ok(shifted, "Subsequent cue must exist");
  assert.equal(shifted?.start, 9190, "Cue after cut must be shifted by exact duration of deleted scene (9010 + 180 = 9190)");
});

test("Extended Cut Recipe JSON roundtrip export and import", () => {
  const recipe: ExtendedCutRecipe = {
    id: "recipe-1",
    movieTitle: "Blade Runner",
    editionName: "Workprint Hybrid",
    mainMoviePathOrUrl: "https://example.com/movie.mkv",
    mainMovieDurationSeconds: 7000,
    insertions: [
      {
        id: "hospital-scene",
        title: "Holden in Hospital",
        insertAtSeconds: 1500,
        clipPathOrUrl: "https://example.com/holden.mkv",
        durationSeconds: 120,
      },
    ],
  };

  const json = exportExtendedCutRecipeJson(recipe);
  const parsed = importExtendedCutRecipeJson(json);

  assert.equal(parsed.movieTitle, "Blade Runner");
  assert.equal(parsed.insertions.length, 1);
  assert.equal(parsed.insertions[0].durationSeconds, 120);
});
