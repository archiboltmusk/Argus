import assert from "node:assert/strict";
import test from "node:test";
import { platformSupport } from "../scripts/platform-support.mjs";
import {
  applyEpisodeMappingOverrides,
  readEpisodeMappingOverrides,
  saveEpisodeMappingOverride,
  removeEpisodeMappingOverride,
} from "../src/lib/episode-mapping-overrides";
import {
  beginPlaybackTrace,
  markPlaybackTrace,
  finishPlaybackTrace,
  readPlaybackTraceReports,
  clearPlaybackTraceReports,
  recordPlaybackDecision,
} from "../src/lib/perf/playback-trace";
import {
  focusedNavigation,
  customizeNavigation,
  visibleNavigation,
} from "../src/chrome/navigation-policy";

const values = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
});
function profile(id: string) {
  values.set(
    "argus.profiles.v1",
    JSON.stringify({ activeId: id, profiles: [{ id: "one", isPrimary: true }, { id: "two" }] }),
  );
}

test("episode corrections isolate profiles, preserve tracker identity, and support specials", () => {
  profile("one");
  const correction = { kitsuId: 100, episode: 0, imdbId: "tt123", season: 0, providerEpisode: 2 };
  saveEpisodeMappingOverride(correction);
  const episodes = [
    { id: "fixture", number: 0, streamId: "kitsu:100:0", imdbSeason: 1, imdbEpisode: 1 },
  ];
  applyEpisodeMappingOverrides(episodes, 100);
  assert.equal(episodes[0].imdbSeason, 0);
  assert.equal(episodes[0].imdbEpisode, 2);
  assert.equal(episodes[0].streamId, "kitsu:100:0");
  profile("two");
  assert.equal(readEpisodeMappingOverrides().length, 0);
  profile("one");
  assert.deepEqual(readEpisodeMappingOverrides(), [correction]);
  assert.throws(() => saveEpisodeMappingOverride({ ...correction, episode: -1 }));
  removeEpisodeMappingOverride(100, 0);
  assert.equal(readEpisodeMappingOverrides().length, 0);
});

test("playback reports are bounded, detached from caller mutation, and contain no URLs", () => {
  clearPlaybackTraceReports();
  for (let i = 0; i < 25; i++) {
    const id = beginPlaybackTrace("direct");
    recordPlaybackDecision(id, {
      mode: "automatic",
      score: 150,
      candidates: 12,
      rejected: 3,
      reasons: [
        { signal: "cached", delta: 60 },
        { signal: "https://private.example/token", delta: 1 },
      ],
    });
    markPlaybackTrace(id, "first-frame");
    finishPlaybackTrace(id);
  }
  const reports = readPlaybackTraceReports();
  assert.equal(reports.length, 20);
  assert.ok(reports.every((report) => report.milestones["first-frame"]! >= 0));
  reports[0].milestones["first-frame"] = -10;
  assert.ok(readPlaybackTraceReports()[0].milestones["first-frame"]! >= 0);
  assert.equal(JSON.stringify(reports).includes("http"), false);
  assert.deepEqual(readPlaybackTraceReports()[0].decision?.reasons, [
    { signal: "cached", delta: 60 },
  ]);
  clearPlaybackTraceReports();
  assert.equal(readPlaybackTraceReports().length, 0);
});

test("focused navigation preserves access policy and can restore all sections", () => {
  const items = ["home", "discover", "library", "settings", "games"].map((id) => ({
    id,
    view: id,
    label: id,
    parentalKey: id,
  }));
  const focused = customizeNavigation(items, focusedNavigation());
  assert.deepEqual(
    focused.map((item) => item.id),
    ["home", "discover", "library", "settings"],
  );
  const visible = visibleNavigation(focused, {
    kid: false,
    showPlaylistsTab: true,
    hideContent: {},
    locked: true,
    hiddenTabs: { discover: true },
  });
  assert.equal(
    visible.some((item) => item.id === "discover"),
    false,
  );
  assert.equal(customizeNavigation(items, { order: [], hidden: [], renamed: {} }).length, 5);
});

test("support claims require exact stable-release assets and matching device evidence", () => {
  const release = {
    tag_name: "v1.2.3",
    assets: [
      {
        name: "Argus-aarch64.dmg",
        browser_download_url:
          "https://github.com/archiboltmusk/Argus/releases/download/v1.2.3/Argus-aarch64.dmg",
      },
    ],
  };
  assert.equal(platformSupport(release)[0].status, "build-only");
  assert.equal(platformSupport(release)[1].status, "experimental");
  const evidence = [
    {
      tag: "v1.2.3",
      asset: "Argus-aarch64.dmg",
      result: "passed",
      device: "M1 Mac",
      report: "https://github.com/archiboltmusk/Argus/issues/1",
    },
  ];
  assert.equal(platformSupport(release, evidence)[0].status, "device-tested");
  assert.equal(
    platformSupport(release, [{ ...evidence[0], tag: "v1.2.2" }])[0].status,
    "build-only",
  );
  assert.throws(() => platformSupport({ ...release, prerelease: true }));
  assert.equal(
    platformSupport({
      ...release,
      assets: [{ ...release.assets[0], browser_download_url: "https://untrusted.example/app" }],
    })[0].status,
    "experimental",
  );
});
