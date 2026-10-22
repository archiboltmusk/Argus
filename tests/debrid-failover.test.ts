import assert from "node:assert/strict";
import test from "node:test";
import { shouldFailover, withFailover } from "../src/lib/debrid/failover";
import type { DebridResult, DebridStore } from "../src/lib/debrid/types";

function store(name: string, playable: DebridResult<{ url: string }>, calls: string[]): DebridStore {
  return {
    slug: "rd",
    name,
    account: async () => ({ ok: false, code: "error", status: 0 }),
    cacheCheck: async () => ({ ok: true, data: {} }),
    playableUrl: async () => {
      calls.push(name);
      return playable;
    },
    listLibrary: async () => ({ ok: true, data: [] }),
  };
}

test("fails over only for account-level errors", () => {
  assert.equal(shouldFailover({ ok: false, code: "traffic-limit", status: 0 }), true);
  assert.equal(shouldFailover({ ok: false, code: "error", status: 503 }), true);
  assert.equal(shouldFailover({ ok: false, code: "not-cached", status: 0 }), false);
  assert.equal(shouldFailover({ ok: true, data: 1 }), false);
});

test("moves to the next account after a quota error", async () => {
  const calls: string[] = [];
  const wrapped = withFailover(
    store("main", { ok: false, code: "traffic-limit", status: 0 }, calls),
    [store("backup", { ok: true, data: { url: "https://x/y" } }, calls)],
  );
  const result = await wrapped.playableUrl("magnet:?xt=urn:btih:a", undefined, new AbortController().signal);
  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["main", "backup"]);
});

test("does not try backups when the main account succeeds or reports a plain miss", async () => {
  const calls: string[] = [];
  const miss = withFailover(
    store("main", { ok: false, code: "not-cached", status: 0 }, calls),
    [store("backup", { ok: true, data: { url: "u" } }, calls)],
  );
  const result = await miss.playableUrl("m", undefined, new AbortController().signal);
  assert.equal(result.ok, false);
  assert.deepEqual(calls, ["main"]);
});

test("returns the last failure when every account fails", async () => {
  const calls: string[] = [];
  const wrapped = withFailover(
    store("a", { ok: false, code: "rate-limited", status: 429 }, calls),
    [store("b", { ok: false, code: "unauthorized", status: 401 }, calls)],
  );
  const result = await wrapped.playableUrl("m", undefined, new AbortController().signal);
  assert.deepEqual(result, { ok: false, code: "unauthorized", status: 401 });
  assert.deepEqual(calls, ["a", "b"]);
});
