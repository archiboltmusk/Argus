import assert from "node:assert/strict";
import test from "node:test";
import { formatTimestamp, timestampNote } from "../src/lib/study-note.ts";

test("formats timestamps", () => {
  assert.equal(formatTimestamp(863.9), "00:14:23");
  assert.equal(formatTimestamp(3725), "01:02:05");
  assert.equal(formatTimestamp(-4), "00:00:00");
});

test("builds a markdown note, with or without a link", () => {
  assert.equal(timestampNote("Fracture [Mechanics]", 863, "argus://x"), "[00:14:23 - Fracture Mechanics](argus://x)");
  assert.equal(timestampNote("Lecture", 5), "00:00:05 - Lecture");
});

import { localDeepLink, parseLocalDeepLink } from "../src/lib/local-library/deep-link.ts";

test("local deep links round-trip with time and speed", () => {
  assert.equal(localDeepLink("local-ab1", 863.7, 1.75), "argus://open?id=local%3Alocal-ab1&t=863&speed=1.75");
  assert.deepEqual(parseLocalDeepLink("argus://open?id=local%3Alocal-ab1&t=863&speed=1.75"), {
    id: "local-ab1",
    t: 863,
    speed: 1.75,
  });
  assert.deepEqual(parseLocalDeepLink(localDeepLink("x")), { id: "x", t: undefined, speed: undefined });
  assert.equal(parseLocalDeepLink("argus://open?id=ia%3Afoo"), null);
  assert.equal(parseLocalDeepLink("argus://detail/movie/tt1"), null);
});
