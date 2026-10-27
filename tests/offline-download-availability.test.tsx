import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import * as React from "react";
import { createRoot } from "react-dom/client";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

async function fixture(check: (id: string) => Promise<unknown>, initiallyOnline = false) {
  const dom = new JSDOM("<div id='root'></div>", { url: "https://fixture.invalid" });
  const descriptors = new Map(["window", "document", "navigator", "IS_REACT_ACT_ENVIRONMENT"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let online = initiallyOnline;
  Object.defineProperty(dom.window.navigator, "onLine", { get: () => online });
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  let items = [{ id: "saved", path: "/saved.mkv", status: "done" }];
  let profile = "first";
  const routes: string[] = [];
  const setView = (view: string) => routes.push(view);
  const dependencies: Record<string, unknown> = {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "lucide-react": { WifiOff: () => null },
    "@/lib/download/downloads-store": { useDownloads: () => items, completedDownloadById: check },
    "@/lib/i18n": { useT: () => (key: string) => key },
    "@/lib/view": { useView: () => ({ view: "home", setView }) },
    "@/lib/profiles": { useProfiles: () => ({ activeProfile: { id: profile } }) },
  };
  const output = ts.transpileModule(readFileSync(new URL("../src/chrome/offline-banner.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports: Record<string, React.ComponentType> = {};
  new Function("require", "exports", output)((key: string) => {
    assert.ok(key in dependencies, `Unexpected dependency ${key}`);
    return dependencies[key];
  }, exports);
  const root = createRoot(dom.window.document.getElementById("root")!);
  const render = async () => { await React.act(async () => root.render(React.createElement(exports.OfflineBanner))); };
  await render();
  return {
    dom, routes, render,
    text: () => dom.window.document.body.textContent,
    setItems: async (next: typeof items) => { items = next; await render(); },
    setProfile: async (next: string) => { profile = next; await render(); },
    setOnline: async (next: boolean) => { online = next; await React.act(async () => dom.window.dispatchEvent(new dom.window.Event(next ? "online" : "offline"))); },
    close: async () => {
      await React.act(async () => root.unmount());
      dom.window.close();
      for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

test("offline banner never promises access to missing files or unavailable native verification", async () => {
  const f = await fixture(async () => { throw new Error("missing file"); });
  try {
    assert.equal(f.text(), "You're offline");
    assert.deepEqual(f.routes, []);
    assert.equal(f.dom.window.document.querySelector("button"), null);
  } finally { await f.close(); }
});

test("offline banner checks candidates until a real file is available and routes once", async () => {
  const checked: string[] = [];
  const f = await fixture(async (id) => {
    checked.push(id);
    if (id === "saved") throw new Error("missing");
    return {};
  });
  try {
    await f.setItems([
      { id: "saved", path: "/saved.mkv", status: "done" },
      { id: "valid", path: "/valid.mkv", status: "done" },
      { id: "unused", path: "/unused.mkv", status: "done" },
    ]);
    assert.ok(f.text()?.includes("Saved downloads are available"));
    assert.deepEqual(checked, ["saved", "saved", "valid"]);
    assert.deepEqual(f.routes, ["downloads"]);
    await f.render();
    assert.equal(checked.length, 3, "unrelated renders do not repeat native probes");
    assert.equal(f.routes.length, 1);
  } finally { await f.close(); }
});

test("stale verification cannot restore availability after a profile or store change", async () => {
  const pending: Array<() => void> = [];
  const f = await fixture(() => new Promise((resolve) => pending.push(() => resolve({}))));
  try {
    await f.setProfile("second");
    await React.act(async () => pending[0]());
    assert.equal(f.text(), "You're offline");
    assert.deepEqual(f.routes, []);
    await f.setItems([]);
    await React.act(async () => pending[1]());
    assert.equal(f.text(), "You're offline");
    assert.deepEqual(f.routes, []);
  } finally { await f.close(); }
});

test("online startup does not probe files or navigate when connectivity later drops", async () => {
  let checks = 0;
  const f = await fixture(async () => { checks++; return {}; }, true);
  try {
    assert.equal(checks, 0);
    assert.equal(f.text(), "");
    await f.setOnline(false);
    assert.equal(checks, 1);
    assert.ok(f.text()?.includes("Saved downloads are available"));
    assert.deepEqual(f.routes, []);
  } finally { await f.close(); }
});

test("pending verification is ignored after unmount", async () => {
  let resolve: (() => void) | undefined;
  const f = await fixture(() => new Promise((done) => { resolve = () => done({}); }));
  await f.close();
  await React.act(async () => resolve?.());
  assert.deepEqual(f.routes, []);
});
