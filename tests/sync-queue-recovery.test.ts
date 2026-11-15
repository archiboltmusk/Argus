import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

function harness(values = new Map<string, string>()) {
  const source = readFileSync(
    new URL("../src/lib/stremio-write-queue.ts", import.meta.url),
    "utf8",
  ).replace(/^import[^;]+;/, "");
  let offline = true,
    storageFailed = false;
  const remote = new Map<string, any>();
  const writes: Array<{ account: string; item: any }> = [];
  const dependencies = {
    libraryGetOneStrict: async (account: string, id: string) => {
      if (offline) throw new Error("fixture offline");
      return remote.get(`${account}:${id}`) ?? null;
    },
    libraryPut: async (account: string, item: any) => {
      if (offline) throw new Error("fixture offline");
      writes.push({ account, item });
      remote.set(`${account}:${item._id}`, item);
    },
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (storageFailed) throw new Error("fixture storage full");
        values.set(key, value);
      },
    },
  };
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: any = {};
  new Function("exports", ...Object.keys(dependencies), js)(
    exports,
    ...Object.values(dependencies),
  );
  return {
    api: exports,
    values,
    remote,
    writes,
    online: () => {
      offline = false;
    },
    failStorage: () => {
      storageFailed = true;
    },
  };
}
const item = (time: number, position = 100) => ({
  _id: "tt123",
  name: "Fixture",
  _mtime: time,
  state: { timeOffset: position },
});

test("offline progress survives module restart and reconnect writes to the original account", async () => {
  const first = harness();
  assert.equal(await first.api.cloudLibraryPut("account-a", item(5000)), false);
  const restarted = harness(first.values);
  restarted.online();
  await restarted.api.flushWriteQueue();
  assert.equal(restarted.writes.length, 1);
  assert.equal(restarted.writes[0].account, "account-a");
  assert.equal(restarted.writes[0].item.state.timeOffset, 100);
});

test("a newer remote edit wins over stale offline progress", async () => {
  const h = harness();
  await h.api.cloudLibraryPut("account-a", item(5000));
  h.remote.set("account-a:tt123", item(9000, 900));
  h.online();
  await h.api.flushWriteQueue();
  assert.equal(h.writes.length, 0);
  assert.equal(h.remote.get("account-a:tt123").state.timeOffset, 900);
});

test("same title in two accounts keeps separate pending writes", async () => {
  const h = harness();
  await h.api.cloudLibraryPut("account-a", item(5000, 100));
  await h.api.cloudLibraryPut("account-b", item(6000, 200));
  h.online();
  await h.api.flushWriteQueue();
  assert.equal(h.writes.length, 2);
  assert.equal(h.remote.get("account-a:tt123").state.timeOffset, 100);
  assert.equal(h.remote.get("account-b:tt123").state.timeOffset, 200);
});

test("acknowledged changes fail visibly if neither network nor storage can save them", async () => {
  const h = harness();
  h.failStorage();
  await assert.rejects(
    () => h.api.cloudLibraryPut("account-a", item(5000), { acknowledged: true }),
    /storage full/,
  );
  assert.equal(h.values.size, 0);
});
