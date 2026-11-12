import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);
const source = ts.transpileModule(
  readFileSync(new URL("../src/views/settings/whats-new-section.tsx", import.meta.url), "utf8"),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  },
).outputText;
function render(status) {
  const exports = {};
  const mocks = {
    "lucide-react": new Proxy({}, { get: () => () => null }),
    "@/lib/i18n": { useT: () => (text, values) => text.replace("{ver}", values?.ver ?? "") },
    "@/lib/updater/versions": { currentVersion: "3.17.1" },
    "@/lib/updater/use-update": { useUpdate: () => ({ status }) },
    "@/lib/updater/recent-upgrades": {
      RECENT_UPGRADES: [{ version: "v9.9.9", title: "Future release", highlights: [] }],
    },
    "./shared": { Section: ({ children }) => React.createElement("section", null, children) },
  };
  vm.runInNewContext(source, { exports, require: (name) => mocks[name] ?? nativeRequire(name) });
  return renderToStaticMarkup(React.createElement(exports.WhatsNewSection));
}
for (const status of ["idle", "checking", "error", "available", "uptodate"]) {
  test(`changelog reports actual build and verified update status: ${status}`, () => {
    const html = render(status);
    assert.ok(html.includes("Current Build: 3.17.1"));
    assert.ok(!html.includes("Current Build: v9.9.9"));
    assert.equal(html.includes("Up to date"), status === "uptodate");
  });
}
