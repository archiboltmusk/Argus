import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

function loadFunction(file: string, name: string, dependencies: Record<string, unknown>) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const node = ast.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === name,
  )!;
  const js = ts.transpileModule(node.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: any = {};
  new Function("exports", ...Object.keys(dependencies), js)(
    exports,
    ...Object.values(dependencies),
  );
  return exports[name];
}
const offline = async () => {
  throw new Error("fixture offline");
};
const base = {
  isNuvioSignedIn: () => true,
  getNuvioAccountId: () => "fixture-account",
  nuvioFetch: offline,
};

test("strict Nuvio watch refresh rejects cached fallback; ordinary tray reads retain cache", async () => {
  const cached = [{ content_id: "fixture" }];
  const pull = loadFunction("src/lib/nuvio/nuvio-sync.ts", "pullWatchProgressFromNuvio", {
    ...base,
    resolveNuvioProfileIndex: () => 1,
    readCachedWatchProgress: () => cached,
  });
  assert.equal(await pull(1), cached);
  await assert.rejects(() => pull(1, { strict: true }), /could not be refreshed/);
});

test("strict Nuvio library refresh rejects cached fallback", async () => {
  const cached = [{ content_id: "fixture" }];
  const pull = loadFunction("src/lib/nuvio/nuvio-library.ts", "pullNuvioLibrarySnapshot", {
    ...base,
    readCachedNuvioLibrary: () => cached,
  });
  assert.equal(await pull(1), cached);
  await assert.rejects(() => pull(1, { strict: true }), /fixture offline/);
});

test("strict Nuvio addon refresh rejects HTTP failure instead of reporting an empty account", async () => {
  const pull = loadFunction("src/lib/nuvio/nuvio-sync.ts", "pullAddonsFromNuvio", {
    ...base,
    nuvioFetch: async () => ({ ok: false }),
    resolveNuvioProfileIndex: () => 1,
    loadNuvioState: () => ({ profiles: [] }),
  });
  assert.deepEqual(await pull("1"), []);
  await assert.rejects(() => pull("1", { strict: true }), /could not be refreshed/);
});

test("a delayed Nuvio profile response cannot overwrite a new account", async () => {
  let account = "old",
    saved = false;
  let finish: (value: unknown) => void = () => {};
  const pull = loadFunction("src/lib/nuvio/nuvio-auth.ts", "fetchNuvioProfiles", {
    loadNuvioState: () => ({ session: { user: { id: account } } }),
    saveNuvioState: () => {
      saved = true;
    },
    nuvioFetch: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  const request = pull({ strict: true });
  account = "new";
  finish({ ok: true, json: async () => [{ profile_index: 1 }] });
  await assert.rejects(() => request, /account changed/);
  assert.equal(saved, false);
});
