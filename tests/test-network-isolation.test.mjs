import assert from "node:assert/strict";
import test from "node:test";

test("unit-test transport rejects unmocked external requests before sending a payload", async () => {
  await assert.rejects(
    () =>
      fetch("https://fixture.invalid/sync", {
        method: "POST",
        body: "fixture-only",
        headers: { authorization: "fixture-only" },
      }),
    /Unmocked network request/,
  );
});

test("in-memory fixture URLs remain usable without a network request", async () => {
  const response = await fetch("data:text/plain,fixture");
  assert.equal(await response.text(), "fixture");
});
