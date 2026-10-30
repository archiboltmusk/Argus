import "./_localstorage-stub.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { UltronCoreAgent } from "../src/lib/ai/ultron-core-agent.ts";
import { AutonomousScraperHealer } from "../src/lib/network/autonomous-scraper-healer.ts";
import { PredictivePacer } from "../src/lib/cache/predictive-pacer.ts";
import { AmbientRoomSync } from "../src/lib/player/ambient-room-sync.ts";
import { ProximityHandoff } from "../src/lib/device/proximity-handoff.ts";
import { NeuralAudioNovel } from "../src/lib/ebook/expansion/neural-audio-novel.ts";
import { NeuralSubtitleSnapper } from "../src/lib/subtitles/neural-subtitle-snapper.ts";

test("UltronCoreAgent decomposes complex chained commands into executable sub-actions", () => {
  const agent = UltronCoreAgent.getInstance();
  const plan = agent.parseAndPlan(
    "Find scene where Feluda visits the circuit house in Sonar Kella, upscale with Metal 4K, and cast to living room",
  );

  assert.equal(plan.understoodIntent, "scene_seek");
  assert.equal(plan.status, "completed");
  assert.ok(plan.subActions.length >= 3, "Must have seek, upscale, and cast sub-actions");

  const seekAction = plan.subActions.find((a) => a.type === "player_seek");
  assert.ok(seekAction, "Must have player_seek action");
  assert.equal(seekAction?.parameters.targetSeconds, 2540);

  const upscaleAction = plan.subActions.find((a) => a.type === "shader_profile");
  assert.ok(upscaleAction, "Must have shader_profile action");
  assert.equal(upscaleAction?.parameters.profile, "metal-neural-4k");

  const castAction = plan.subActions.find((a) => a.type === "cast_stream");
  assert.ok(castAction, "Must have cast_stream action");
  assert.equal(castAction?.parameters.targetDevice, "living room");
});

test("UltronCoreAgent fingerprints scene context and extracts cinematic lore", () => {
  const agent = UltronCoreAgent.getInstance();
  const lore = agent.fingerprintScene(2600, "Sonar Kella (1974)");

  assert.equal(lore.identifiedSceneName, "Jaisalmer Circuit House confrontation");
  assert.ok(lore.detectedCharacters.includes("Prodosh C. Mitter (Feluda)"));
  assert.ok(lore.triviaNotes.some((t) => t.includes("Satyajit Ray")));
});

test("AutonomousScraperHealer recovers from Cloudflare and rotates mirrors with gossip payload", () => {
  const healer = AutonomousScraperHealer.getInstance();

  // Simulate Cloudflare block
  const healed = healer.recordIncident({
    sourceId: "annas-archive",
    url: "https://annas-archive.org",
    httpStatus: 403,
    failureReason: "cloudflare_block",
    timestamp: Date.now(),
  });

  assert.ok(healed.customHeaders["User-Agent"].includes("Safari"), "Must rotate User-Agent on 403");

  // Export gossip for LAN nodes
  const gossipJson = healer.exportGossipPayload();
  assert.ok(gossipJson.includes("annas-archive"));

  const imported = healer.importGossipPayload(gossipJson);
  assert.equal(typeof imported, "number");
});

test("PredictivePacer triggers psychic prefetching when user reaches final sequence", () => {
  const pacer = PredictivePacer.getInstance();
  const mediaId = "stranger-things-s05e01";

  // Watch 85% of a 3000-second episode at standard 1x velocity
  pacer.trackProgress(mediaId, "video", 2600, 3000);

  const decision = pacer.evaluatePrefetch(mediaId, "stranger-things-s05e02");
  assert.equal(decision.shouldPrefetchNext, true, "Must prefetch next episode when 400s remain");
  assert.equal(decision.recommendedTargetId, "stranger-things-s05e02");
});

test("AmbientRoomSync processes edge color matrix and honors dark-room blackout", () => {
  const ambient = AmbientRoomSync.getInstance();
  ambient.setProfile("dark-room-blackout");

  // Pure black frame
  const blackMatrix = ambient.processFrameEdges(
    { r: 0, g: 0, b: 0 },
    { r: 0, g: 0, b: 0 },
    { r: 0, g: 0, b: 0 },
    { r: 0, g: 0, b: 0 },
  );

  assert.equal(blackMatrix.isPureBlack, true);
  const packet = ambient.generateHyperionPacket(blackMatrix);
  assert.equal(packet.payloadHex, "000000", "Lights must extinguish to 000000 in blackout mode");
});

test("ProximityHandoff detects fresh nearby beacon and generates resume prompt", () => {
  const handoff = ProximityHandoff.getInstance();

  handoff.registerBeacon({
    deviceId: "living-room-tv",
    deviceName: "Sony Bravia OLED",
    deviceType: "tv",
    activeMediaId: "pather-panchali-remastered",
    mediaTitle: "Pather Panchali (Criterion 4K)",
    positionSeconds: 3645,
    durationSeconds: 7200,
    rssiDb: -55, // Strong proximity
    timestamp: Date.now(),
  });

  const opportunity = handoff.evaluateHandoffOpportunity(-70);
  assert.ok(opportunity !== null, "Must find handoff opportunity");
  assert.equal(opportunity?.sourceDevice, "Sony Bravia OLED");
  assert.equal(opportunity?.resumeSeconds, 3645);
  assert.equal(opportunity?.formattedTime, "60:45");
});

test("NeuralAudioNovel distinguishes prose from dialogue and assigns distinct voice roles", () => {
  const novel = NeuralAudioNovel.getInstance();
  const text = `The sun set behind the desert fortress of Jaisalmer.\n\n"Have you noticed anything suspicious, Topshe?" asked Prodosh Mitter.\n\n"Nothing yet, Feluda," replied the boy.`;

  const script = novel.generateScriptFromText(text, "Sonar Kella", 1);
  assert.ok(script.segments.length >= 3, "Must produce multiple segments");

  const narratorSegment = script.segments.find((s) => s.speakerRole === "narrator");
  assert.ok(narratorSegment, "Must include narrator segment");

  const topsheSegment = script.segments.find((s) => s.speakerRole === "companion");
  assert.ok(topsheSegment, "Must include companion dialogue");
  assert.equal(topsheSegment?.speakerName, "Topshe");
});

test("NeuralSubtitleSnapper filters scam/betting watermarks and snaps offset to Whisper speech", () => {
  const snapper = NeuralSubtitleSnapper.getInstance();

  const rawCues = [
    { id: 1, startSec: 2.0, endSec: 5.0, text: "Jaya9 Top Betting Site - Register Now" },
    { id: 2, startSec: 10.0, endSec: 14.0, text: "Welcome to Jaisalmer, gentlemen." },
  ];

  const speechAnchors = [
    { timestampSec: 11.2, textSnippet: "Welcome to Jaisalmer" },
  ];

  const snapped = snapper.snapSubtitles(rawCues, speechAnchors);
  assert.equal(snapped.removedSpamCount, 1, "Must filter betting watermark");
  assert.equal(snapped.alignedCues.length, 1);
  assert.equal(snapped.computedOffsetSec, 1.2, "Must compute 1.2s offset between 10.0 and 11.2");
  assert.equal(snapped.alignedCues[0].startSec, 11.2, "Snapped cue must match speech anchor");
});
