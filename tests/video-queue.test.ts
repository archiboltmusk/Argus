import assert from "node:assert/strict";
import test from "node:test";
import {
  addToVideoQueue,
  clearVideoQueue,
  getVideoQueue,
  isInVideoQueue,
  removeFromVideoQueue,
  toggleVideoQueue,
} from "../src/lib/video-queue";

test("video queue adds, checks membership, toggles, removes, and clears", () => {
  clearVideoQueue();
  assert.equal(getVideoQueue().length, 0);

  const movie1 = {
    id: "tt0111161",
    type: "movie" as const,
    name: "The Shawshank Redemption",
    poster: "https://example.com/poster.jpg",
  };

  const added = addToVideoQueue(movie1, true);
  assert.equal(added, true);
  assert.equal(isInVideoQueue("tt0111161"), true);
  assert.equal(getVideoQueue().length, 1);
  assert.equal(getVideoQueue()[0].name, "The Shawshank Redemption");

  // Duplicate add fails
  const reAdded = addToVideoQueue(movie1, true);
  assert.equal(reAdded, false);
  assert.equal(getVideoQueue().length, 1);

  // Toggle removes
  const toggledOff = toggleVideoQueue(movie1);
  assert.equal(toggledOff, false);
  assert.equal(isInVideoQueue("tt0111161"), false);
  assert.equal(getVideoQueue().length, 0);

  // Toggle adds back
  const toggledOn = toggleVideoQueue(movie1);
  assert.equal(toggledOn, true);
  assert.equal(isInVideoQueue("tt0111161"), true);

  // Remove directly
  const removed = removeFromVideoQueue("tt0111161", true);
  assert.equal(removed, true);
  assert.equal(isInVideoQueue("tt0111161"), false);

  // Clear
  addToVideoQueue(movie1, true);
  addToVideoQueue({ id: "tt0068646", type: "movie", name: "The Godfather" }, true);
  assert.equal(getVideoQueue().length, 2);
  clearVideoQueue();
  assert.equal(getVideoQueue().length, 0);
});
