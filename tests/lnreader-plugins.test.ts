import "./_localstorage-stub.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  LNReaderManager,
  POPULAR_LNREADER_PRESETS,
} from "../src/lib/ebook/expansion/lnreader-plugins.ts";

test("LNReaderManager initializes with verified presets and supports 1-click install all", async () => {
  const manager = LNReaderManager.getInstance();
  const presets = POPULAR_LNREADER_PRESETS;

  assert.ok(presets.length >= 6, "Must provide popular light novel presets");
  assert.ok(presets.some((p) => p.id === "royalroad"), "Must include Royal Road");
  assert.ok(presets.some((p) => p.id === "novelupdates"), "Must include NovelUpdates");

  const installedCount = await manager.installAllPresets();
  assert.equal(installedCount, presets.length);

  const installed = manager.getInstalledPlugins();
  assert.equal(installed.length, presets.length);
  assert.ok(installed.every((p) => p.installed));
});

test("LNReaderManager allows adding and removing individual light novel plugins", () => {
  const manager = LNReaderManager.getInstance();
  const custom = {
    id: "wuxiaworld",
    name: "Wuxiaworld",
    site: "https://www.wuxiaworld.com",
    lang: "English",
    version: "1.0.0",
    url: "https://raw.githubusercontent.com/LNReader/lnreader-plugins/plugins/v2.0.0/.dist/en/wuxiaworld.js",
  };

  manager.installPlugin(custom);
  assert.ok(manager.getInstalledPlugins().some((p) => p.id === "wuxiaworld"));

  manager.uninstallPlugin("wuxiaworld");
  assert.ok(!manager.getInstalledPlugins().some((p) => p.id === "wuxiaworld"));
});
