import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import React from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import ts from "typescript";

const require = createRequire(import.meta.url);
const exports = {};
vm.runInNewContext(
  ts.transpileModule(
    readFileSync(new URL("../src/components/music/music-artwork.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    },
  ).outputText,
  {
    exports,
    require: (name) =>
      name === "@/assets/music-placeholder.svg"
        ? { default: "/music-placeholder.svg" }
        : require(name),
  },
);
const { MusicArtwork, musicArtworkCandidates } = exports;

test("only valid archive cover URLs get an equivalent bounded retry", () => {
  const id = "cd21d4e9-af51-4e7c-bd9f-a5f31d5cfe1a";
  const raw = `https://archive.org/download/mbid-${id}/mbid-${id}-42_thumb500.jpg`;
  assert.deepEqual(Array.from(musicArtworkCandidates(raw)), [
    raw,
    `https://coverartarchive.org/release/${id}/front-500`,
  ]);
  assert.deepEqual(Array.from(musicArtworkCandidates("https://example.org/private/cover.jpg")), [
    "https://example.org/private/cover.jpg",
  ]);
});

test("failed covers retry once, use local art, and reset immediately for a different song", async () => {
  const dom = new JSDOM("<div id='app'></div>", { url: "http://localhost/" });
  const old = {
    window: globalThis.window,
    document: globalThis.document,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const root = createRoot(document.getElementById("app"));
  const raw =
    "https://archive.org/download/mbid-cd21d4e9-af51-4e7c-bd9f-a5f31d5cfe1a/mbid-cd21d4e9-af51-4e7c-bd9f-a5f31d5cfe1a-42_thumb500.jpg";
  const image = () => document.querySelector("img");
  try {
    await React.act(() =>
      root.render(React.createElement(MusicArtwork, { src: raw, alt: "Album cover" })),
    );
    await React.act(() => image().dispatchEvent(new dom.window.Event("error")));
    assert.equal(
      image().getAttribute("src"),
      "https://coverartarchive.org/release/cd21d4e9-af51-4e7c-bd9f-a5f31d5cfe1a/front-500",
    );
    await React.act(() => image().dispatchEvent(new dom.window.Event("error")));
    assert.equal(image().getAttribute("src"), "/music-placeholder.svg");
    assert.equal(image().alt, "Album cover");
    await React.act(() => image().dispatchEvent(new dom.window.Event("error")));
    assert.equal(
      image().getAttribute("src"),
      "/music-placeholder.svg",
      "placeholder failure cannot loop network requests",
    );
    await React.act(() =>
      root.render(React.createElement(MusicArtwork, { src: "https://example.org/next.jpg" })),
    );
    assert.equal(image().getAttribute("src"), "https://example.org/next.jpg");
    await React.act(() => root.render(React.createElement(MusicArtwork, {})));
    assert.equal(image().getAttribute("src"), "/music-placeholder.svg");
  } finally {
    await React.act(() => root.unmount());
    dom.window.close();
    Object.assign(globalThis, old);
  }
});
