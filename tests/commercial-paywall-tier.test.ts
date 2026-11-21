import assert from "node:assert/strict";
import test from "node:test";
import { applyTrust } from "../src/lib/streams/trust.ts";
import { isCommercialAddon } from "../src/lib/addons/commercial-detector.ts";
import {
  filterQueryableAddons,
  isAddonSubscribed,
  setAddonSubscribed,
} from "../src/lib/addon-store.ts";
import type { Stream } from "../src/lib/streams/types.ts";
import type { Addon } from "../src/lib/addons.ts";

test("Tier 1: applyTrust rejects commercial paywall/trial/subscription stream advertisements", () => {
  const paywallTitles = [
    "🔒 Subscribe",
    "Subscribe on the Hub",
    "1 Hour Trial",
    "Free 1-hour trial",
    "Payment help",
    "Playback is locked",
    "All-access is $13 lifetime",
    "This add-on is catalog-only",
  ];

  for (const title of paywallTitles) {
    const stream: Stream = {
      title,
      addonId: "roxxy-hub",
      addonName: "Roxxy HUB - JustPorn",
      url: "https://example.com/ad.mp4",
    };
    const { keep, rejected } = applyTrust([stream], { strict: false });
    assert.equal(keep.length, 0, `Stream "${title}" should be rejected`);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason, "commercial-paywall-ad");
  }

  // Normal stream should not be rejected by the paywall filter
  const normalStream: Stream = {
    title: "Big.Buck.Bunny.1080p.mkv",
    addonId: "torrentio",
    addonName: "Torrentio",
    url: "https://example.com/video.mp4",
  };
  const { keep: normalKeep } = applyTrust([normalStream], { strict: false });
  assert.equal(normalKeep.length, 1);
});

test("Tier 2 & 3: isCommercialAddon detects paywalled commercial addons", () => {
  const roxxy = {
    id: "community.roxxyhub",
    name: "Roxxy Hub - Everything",
    description: "All access requires $13 lifetime subscription on RoxxyHub",
  };
  assert.equal(isCommercialAddon(roxxy).isCommercial, true);

  const adultVideoHd = {
    id: "adult-video-hd",
    name: "Adult Video HD",
    description: "Free 1-hour trial or subscribe on the hub",
  };
  assert.equal(isCommercialAddon(adultVideoHd).isCommercial, true);

  const cinemeta = {
    id: "community.cinemeta",
    name: "Cinemeta",
    description: "Official movie & TV catalog for Stremio",
  };
  assert.equal(isCommercialAddon(cinemeta).isCommercial, false);
});

test("Tier 3: filterQueryableAddons skips unsubscribed commercial addons", () => {
  const roxxyUrl = "https://roxxy.invalid/manifest.json";
  const cinemetaUrl = "https://cinemeta.invalid/manifest.json";

  const addons: Addon[] = [
    {
      transportUrl: cinemetaUrl,
      manifest: {
        id: "cinemeta",
        name: "Cinemeta",
        version: "1.0.0",
        resources: ["catalog", "meta"],
        types: ["movie", "series"],
        catalogs: [],
      },
    },
    {
      transportUrl: roxxyUrl,
      manifest: {
        id: "roxxy-hub",
        name: "Roxxy HUB - JustPorn",
        version: "1.0.0",
        description: "All-access is $13 lifetime. Free 1-hour trial",
        resources: ["stream"],
        types: ["movie"],
        catalogs: [],
      },
    },
  ];

  // Initially unsubscribed
  setAddonSubscribed(roxxyUrl, false);
  assert.equal(isAddonSubscribed(roxxyUrl), false);

  const queryableBefore = filterQueryableAddons(addons);
  assert.equal(queryableBefore.length, 1);
  assert.equal(queryableBefore[0].manifest.id, "cinemeta");

  // Mark subscribed
  setAddonSubscribed(roxxyUrl, true);
  assert.equal(isAddonSubscribed(roxxyUrl), true);

  const queryableAfter = filterQueryableAddons(addons);
  assert.equal(queryableAfter.length, 2);

  // Clean up
  setAddonSubscribed(roxxyUrl, false);
});
