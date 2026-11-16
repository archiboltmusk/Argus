import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

function harness() {
  let source = readFileSync(
    new URL("../src/lib/cloud-sync/unified-cloud-sync.ts", import.meta.url),
    "utf8",
  );
  source = source.replace(/^import[\s\S]*?from\s+["'][^"']+["'];/gm, "");
  const values = new Map<string, string>();
  const events = new EventTarget();
  let account = "a",
    profile = "one",
    calls = 0,
    rejectLibrary = false;
  let libraryRead: () => Promise<unknown[]> = async () => [];
  const dependencies = {
    isIncognito: () => false,
    useSyncExternalStore() {},
    isNuvioSignedIn: () => false,
    loadNuvioState: () => ({ activeProfileIndex: 1, session: null }),
    fetchNuvioProfiles: async () => [],
    signOutNuvio: async () => {},
    pullAddonsFromNuvio: async () => [],
    pullWatchProgressFromNuvio: async () => [],
    resolveNuvioProfileIndex: () => 1,
    pullNuvioLibrarySnapshot: async () => {},
    readActiveStremioAuthKey: () => account,
    cwProfileScope: () => ({ profileId: profile, sharedId: profile }),
    library: async () => {
      calls++;
      if (rejectLibrary) throw new Error("offline");
      return libraryRead();
    },
    invalidateLibraryCache() {},
    flushWriteQueue: async () => {},
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
    window: { dispatchEvent: events.dispatchEvent.bind(events) },
    CustomEvent,
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
    events,
    calls: () => calls,
    account: (value: string) => {
      account = value;
    },
    profile: (value: string) => {
      profile = value;
    },
    offline: (value: boolean) => {
      rejectLibrary = value;
    },
    read: (value: () => Promise<unknown[]>) => {
      libraryRead = value;
    },
  };
}

test("React snapshot reference stays stable until state changes", () => {
  const h = harness();
  assert.equal(h.api.getCloudSyncSnapshot(), h.api.getCloudSyncSnapshot());
});
test("concurrent sync is deduplicated and performs a Stremio library request", async () => {
  const h = harness();
  let finish: (value: unknown[]) => void = () => {};
  h.read(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const first = h.api.syncAllCloudData();
  assert.equal(first, h.api.syncAllCloudData());
  await Promise.resolve();
  finish([{}, {}]);
  assert.deepEqual(await first, { ok: true, count: 2 });
  assert.equal(h.calls(), 1);
  assert.ok(h.api.getCloudSyncSnapshot().lastSyncedAt);
});
test("offline sync cannot claim success and reconnect retries normally", async () => {
  const h = harness();
  h.offline(true);
  assert.equal((await h.api.syncAllCloudData()).ok, false);
  assert.equal(h.api.getCloudSyncSnapshot().lastSyncedAt, null);
  h.offline(false);
  assert.equal((await h.api.syncAllCloudData()).ok, true);
});
test("departed account cannot publish success or leak its timestamp into a new profile", async () => {
  const h = harness();
  let finish: (value: unknown[]) => void = () => {};
  h.read(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const first = h.api.syncAllCloudData();
  await Promise.resolve();
  h.account("b");
  h.profile("two");
  assert.equal(h.api.getCloudSyncSnapshot().lastSyncedAt, null);
  finish([{}]);
  assert.equal((await first).ok, false);
  assert.equal(h.api.getCloudSyncSnapshot().lastSyncedAt, null);
  assert.equal(h.values.size, 0);
});

test("stored sync timestamps belong to an account as well as a profile", async () => {
  const h = harness();
  h.values.set("argus.auth.one", JSON.stringify({ user: { _id: "user-a" } }));
  assert.equal((await h.api.syncAllCloudData()).ok, true);
  assert.ok(h.api.getCloudSyncSnapshot().lastSyncedAt);
  h.account("b");
  h.values.set("argus.auth.one", JSON.stringify({ user: { _id: "user-b" } }));
  assert.equal(h.api.getCloudSyncSnapshot().lastSyncedAt, null);
});
