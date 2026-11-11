import test from "node:test";
import assert from "node:assert/strict";
import { isLNReaderSource, buildLNReaderSource } from "../src/lib/ebook/lnreader-adapter.ts";

test("isLNReaderSource detects LNReader plugins by URL or signature content", () => {
  assert.equal(
    isLNReaderSource("", "https://raw.githubusercontent.com/LNReader/lnreader-plugins/plugins/v3.0.0/.dist/plugins.min.json"),
    true,
    "Should detect by repo URL",
  );
  assert.equal(
    isLNReaderSource("", undefined, "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/.js/src/plugins/arabic/ArNovel[madara].js"),
    true,
    "Should detect by entry URL",
  );
  assert.equal(
    isLNReaderSource('var n = require("@libs/fetch");\nexports.default = g;'),
    true,
    "Should detect by @libs/fetch signature",
  );
  assert.equal(
    isLNReaderSource("function popularNovels() {}"),
    true,
    "Should detect by popularNovels signature",
  );
  assert.equal(
    isLNReaderSource("var plugin = { popular: function() {}, search: function() {} };"),
    false,
    "Should not flag standard Argus plugin",
  );
});

test("buildLNReaderSource synthesizes required prelude, Cheerio, and Argus eBook methods", () => {
  const manifest = {
    id: "arnovel",
    name: "ArNovel",
    version: "2.4.0",
    lang: "ar",
    nsfw: false,
    entry: "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/.js/src/plugins/arabic/ArNovel[madara].js",
  };

  // Mock minimal LNReader plugin
  const mockPluginCode = `
Object.defineProperty(exports, "__esModule", { value: true });
var fetchMod = require("@libs/fetch");
var cheerio = require("cheerio");
var dayjs = require("dayjs");
var storageMod = require("@libs/storage");
var statusMod = require("@libs/novelStatus");

function MockMadaraPlugin() {
  this.id = "arnovel";
  this.name = "ArNovel";
}
MockMadaraPlugin.prototype.popularNovels = function(page, opts) {
  return Promise.resolve([
    { name: "Shadow Slave", path: "/novel/shadow-slave", cover: "https://img.example/cover.jpg" }
  ]);
};
MockMadaraPlugin.prototype.searchNovels = function(query, page) {
  return Promise.resolve([
    { name: "Lord of the Mysteries", path: "/novel/lotm", cover: "https://img.example/lotm.jpg" }
  ]);
};
MockMadaraPlugin.prototype.parseNovel = function(path) {
  return Promise.resolve({
    name: "Shadow Slave",
    path: path,
    summary: "Awesome web novel",
    author: "Guiltythree",
    chapters: [
      { name: "Chapter 1", path: "/chapter/1", chapterNumber: 1, releaseTime: "2024-01-01" }
    ]
  });
};
MockMadaraPlugin.prototype.parseChapter = function(path) {
  return Promise.resolve("<p>Sunny woke up...</p>");
};

exports.default = new MockMadaraPlugin();
`;

  const adaptedSource = buildLNReaderSource(mockPluginCode, manifest);

  assert.ok(adaptedSource.includes("argus.register"), "Must call argus.register");
  assert.ok(adaptedSource.includes("cheerio"), "Must include Cheerio runtime");
  assert.ok(adaptedSource.includes("popularNovels"), "Must bridge popularNovels");
  assert.ok(adaptedSource.includes("parseChapter"), "Must bridge parseChapter");

  // Execute adapted source in simulated sandbox
  let registeredProvider: any = null;
  const mockArgus = {
    register: (p: any) => {
      registeredProvider = p;
    },
    http: async () => ({ status: 200, ok: true, body: "<html></html>", headers: {} }),
    log: () => {},
    parseHtml: () => ({ querySelector: () => null }),
  };

  // Execute using Function exactly as sandbox.ts Worker does (strict mode, shadowed globals, no plugin param)
  const SHADOW = [
    "self", "globalThis", "window", "fetch", "XMLHttpRequest", "WebSocket",
    "EventSource", "importScripts", "indexedDB", "caches", "Worker",
    "SharedWorker", "BroadcastChannel", "MessageChannel", "postMessage",
    "close", "navigator", "location", "document", "Request", "Response"
  ];
  const params = ["argus"].concat(SHADOW);
  const body = '"use strict";\n' + adaptedSource + "\n;return (typeof plugin !== 'undefined') ? plugin : undefined;";
  const factory = new Function(params, body);
  const callArgs: any[] = [mockArgus];
  for (let i = 0; i < SHADOW.length; i++) callArgs.push(undefined);
  const result = factory.apply(undefined, callArgs);

  assert.ok(registeredProvider, "Provider must be registered");
  assert.ok(result, "Function must return adapted plugin");
  assert.equal(registeredProvider.id, "arnovel");
  assert.equal(registeredProvider.name, "ArNovel");

  // Verify all 5 required eBook methods exist
  assert.equal(typeof registeredProvider.popular, "function");
  assert.equal(typeof registeredProvider.search, "function");
  assert.equal(typeof registeredProvider.detail, "function");
  assert.equal(typeof registeredProvider.chapters, "function");
  assert.equal(typeof registeredProvider.content, "function");
});

test("buildLNReaderSource adapts real-world ArNovel LNReader plugin script in strict sandbox", async () => {
  const manifest = {
    id: "arnovel",
    name: "ArNovel",
    version: "2.4.0",
    lang: "ar",
    nsfw: false,
    entry: "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/.js/src/plugins/arabic/ArNovel[madara].js",
  };

  const res = await fetch(manifest.entry);
  if (!res.ok) {
    // Skip if offline
    return;
  }
  const realSource = await res.text();

  assert.ok(isLNReaderSource(realSource, undefined, manifest.entry));
  const adapted = buildLNReaderSource(realSource, manifest);

  let registeredProvider: any = null;
  const mockArgus = {
    register: (p: any) => {
      registeredProvider = p;
    },
    http: async () => ({ status: 200, ok: true, body: "<html><body><div class='entry-content'>Chapter text</div></body></html>", headers: {} }),
    log: () => {},
    parseHtml: () => ({ querySelector: () => null }),
  };

  const SHADOW = [
    "self", "globalThis", "window", "fetch", "XMLHttpRequest", "WebSocket",
    "EventSource", "importScripts", "indexedDB", "caches", "Worker",
    "SharedWorker", "BroadcastChannel", "MessageChannel", "postMessage",
    "close", "navigator", "location", "document", "Request", "Response"
  ];
  const params = ["argus"].concat(SHADOW);
  const body = '"use strict";\n' + adapted + "\n;return (typeof plugin !== 'undefined') ? plugin : undefined;";
  const factory = new Function(params, body);
  const callArgs: any[] = [mockArgus];
  for (let i = 0; i < SHADOW.length; i++) callArgs.push(undefined);
  const result = factory.apply(undefined, callArgs);

  assert.ok(registeredProvider, "ArNovel must register cleanly without throwing CommonJS errors");
  assert.equal(registeredProvider.id, "arnovel");
  assert.equal(registeredProvider.name, "ArNovel");
  assert.equal(typeof registeredProvider.popular, "function");
  assert.equal(typeof registeredProvider.search, "function");
  assert.equal(typeof registeredProvider.detail, "function");
  assert.equal(typeof registeredProvider.chapters, "function");
  assert.equal(typeof registeredProvider.content, "function");
});

test("buildLNReaderSource supports plugins requiring @libs/filterInputs and @libs/isAbsoluteUrl (e.g. Azora Manga)", async () => {
  const manifest = {
    id: "azorafly",
    name: "Azora Manga",
    version: "1.0.0",
    lang: "ar",
    nsfw: false,
    entry: "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/.js/src/plugins/arabic/azorafly.js",
  };

  const res = await fetch(manifest.entry);
  if (!res.ok) return;
  const realSource = await res.text();

  assert.ok(isLNReaderSource(realSource, undefined, manifest.entry));
  const adapted = buildLNReaderSource(realSource, manifest);

  let registeredProvider: any = null;
  const mockArgus = {
    register: (p: any) => {
      registeredProvider = p;
    },
    http: async () => ({ status: 200, ok: true, body: "<html></html>", headers: {} }),
    log: () => {},
    parseHtml: () => ({ querySelector: () => null }),
  };

  const SHADOW = [
    "self", "globalThis", "window", "fetch", "XMLHttpRequest", "WebSocket",
    "EventSource", "importScripts", "indexedDB", "caches", "Worker",
    "SharedWorker", "BroadcastChannel", "MessageChannel", "postMessage",
    "close", "navigator", "location", "document", "Request", "Response"
  ];
  const params = ["argus"].concat(SHADOW);
  const body = '"use strict";\n' + adapted + "\n;return (typeof plugin !== 'undefined') ? plugin : undefined;";
  const factory = new Function(params, body);
  const callArgs: any[] = [mockArgus];
  for (let i = 0; i < SHADOW.length; i++) callArgs.push(undefined);
  const result = factory.apply(undefined, callArgs);

  assert.ok(registeredProvider, "Azora Manga must register cleanly");
  assert.equal(registeredProvider.id, "azorafly");
  assert.equal(registeredProvider.name, "Azora Manga");
  assert.equal(typeof registeredProvider.popular, "function");
  assert.equal(typeof registeredProvider.search, "function");
  assert.equal(typeof registeredProvider.detail, "function");
  assert.equal(typeof registeredProvider.chapters, "function");
  assert.equal(typeof registeredProvider.content, "function");
});
