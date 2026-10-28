import assert from "node:assert/strict";
import test from "node:test";
import { fetchAddonMeta, fetchAddonCatalogPage } from "../src/lib/addons.ts";

test("add-on deadline covers a stalled response body", async () => {
  const original = globalThis.fetch;
  let aborted = false;
  globalThis.fetch = (async (_input, init) => ({
    ok: true,
    json: () => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => { aborted = true; reject(new Error("aborted")); }, { once: true });
    }),
  })) as typeof fetch;
  try {
    assert.equal(await fetchAddonMeta("https://addon.example", "movie", "timeout"), null);
    assert.equal(aborted, true);
  } finally { globalThis.fetch = original; }
});

test("malformed catalog arrays return a recoverable empty result", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"metas":{"invalid":true}}', { status: 200 });
  try { assert.deepEqual(await fetchAddonCatalogPage("https://addon.example", "movie", "bad", 0), []); }
  finally { globalThis.fetch = original; }
});
