import assert from "node:assert/strict";
import test from "node:test";
import { tuneRadio, setTasteExcluded, excludedFromTaste } from "../src/lib/music/listening-controls";
const track = (id: string) => ({ id, title: id, artist: "Fixture", connectorId: "fixture" }) as any;
test("radio focus is stable and never removes tracks", () => {
  const tracks = [track("a"), track("b"), track("c")];
  assert.deepEqual(tuneRadio(tracks, [tracks[1]], "familiar").map(t => t.id), ["b", "a", "c"]);
  assert.deepEqual(tuneRadio(tracks, [tracks[1]], "discover").map(t => t.id), ["a", "c", "b"]);
  assert.deepEqual(tuneRadio(tracks, [], "balanced"), tracks);
});
test("taste exclusion is reversible and does not mutate the track", () => {
  const value = track("excluded");
  setTasteExcluded(value, true);
  assert.equal(excludedFromTaste(value), true);
  setTasteExcluded(value, false);
  assert.equal(excludedFromTaste(value), false);
  assert.equal(value.title, "excluded");
});
