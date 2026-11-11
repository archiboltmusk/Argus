import { test } from "node:test";
import assert from "node:assert/strict";
import "./_localstorage-stub.ts";

// 1. Audio Stem De-Mixer
import {
  setDeMixerPreset,
  setStemGain,
  buildDeMixerMpvCommands,
  getAudioDeMixerConfig,
} from "../src/lib/audio/neural-audio-demixer";

// 2. Scene Recap & Anti-Spoiler Engine
import {
  SceneRecapManager,
  type NarrativeMilestone,
} from "../src/lib/ai/scene-recap-engine";

// 3. Neural Subtitle Translator
import {
  extractAndPreserveTags,
  reinsertTags,
  translateSubtitleText,
  translateSubtitleCues,
} from "../src/lib/subtitles/neural-subtitle-translator";

// 4. P2P Virtual Cinema & Voice Chat
import { P2PVirtualCinemaCoordinator } from "../src/lib/together/p2p-virtual-cinema";

// 5. LAN Local Peer Cache (BEP 14)
import { LanPeerCacheCoordinator } from "../src/lib/torrent/lan-peer-cache";

// --- 1. AUDIO STEM DE-MIXER TESTS ---
test("Stem De-Mixer: presets, custom gains, and MPV equalizer filter generation", () => {
  // Test Stadium Crowd preset
  const stadium = setDeMixerPreset("stadium-crowd");
  assert.equal(stadium.enabled, true);
  assert.equal(stadium.gains.vocalGainDb, -18.0); // Mutes commentators
  assert.equal(stadium.gains.effectsGainDb, 3.0); // Boosts crowd

  const stadiumCmds = buildDeMixerMpvCommands(stadium);
  const afFilter = stadiumCmds.find((c) => c.name === "af")?.value ?? "";
  assert.ok(afFilter.includes("g=-18.0"));
  assert.ok(afFilter.includes("g=3.0"));

  // Clear Dialogue preset
  const dialogue = setDeMixerPreset("clear-dialogue");
  assert.equal(dialogue.gains.vocalGainDb, 8.0);

  // Custom gain adjustment
  setStemGain("vocalGainDb", 12.0);
  assert.equal(getAudioDeMixerConfig().gains.vocalGainDb, 12.0);
});

// --- 2. SCENE RECAP & ANTI-SPOILER TESTS ---
test("Scene Recap: strict timestamp-bound anti-spoiler guarantee and episodic recap", () => {
  const manager = new SceneRecapManager();
  const milestones: NarrativeMilestone[] = [
    {
      id: "m1",
      timestampSec: 120,
      headline: "The Briefcase",
      summary: "Vincent and Jules retrieve the glowing briefcase from Brett.",
      characters: ["Vincent", "Jules", "Brett"],
      isCrucialPlotPoint: true,
    },
    {
      id: "m2",
      timestampSec: 600,
      headline: "The Diner",
      summary: "Pumpkin and Honey Bunny plan to hold up the coffee shop.",
      characters: ["Pumpkin", "Honey Bunny"],
      isCrucialPlotPoint: true,
    },
    {
      id: "m3",
      timestampSec: 1800,
      headline: "Mia Overdoses",
      summary: "Mia mistakes heroin for cocaine at Vincent's house.",
      characters: ["Vincent", "Mia"],
      isCrucialPlotPoint: true,
    },
  ];

  manager.registerMilestones("movie:pulp-fiction", milestones);

  // Catch Me Up at 300s (5 mins in)
  const recapAt300 = manager.generateCatchMeUp("movie:pulp-fiction", 300);
  assert.equal(recapAt300.milestones.length, 1);
  assert.equal(recapAt300.milestones[0].headline, "The Briefcase");
  assert.ok(recapAt300.knownCharacters.includes("Vincent"));
  assert.ok(recapAt300.knownCharacters.includes("Jules"));
  // Must NOT contain Mia or Pumpkin (they appear at 600s and 1800s!)
  assert.equal(recapAt300.knownCharacters.includes("Mia"), false);
  assert.equal(recapAt300.knownCharacters.includes("Pumpkin"), false);

  // Catch Me Up at 700s
  const recapAt700 = manager.generateCatchMeUp("movie:pulp-fiction", 700);
  assert.equal(recapAt700.milestones.length, 2);
  assert.ok(recapAt700.knownCharacters.includes("Pumpkin"));
  assert.equal(recapAt700.knownCharacters.includes("Mia"), false); // Still spoiler-protected!

  // Episodic Recap
  manager.registerEpisodicRecaps("show:breaking-bad", [
    {
      seriesId: "show:breaking-bad",
      seasonNumber: 1,
      episodeNumber: 1,
      storySoFarBullets: ["Walt receives cancer diagnosis", "Walt partners with Jesse"],
      keyCharacterStatus: { Walt: "Teacher", Jesse: "Cook" },
    },
  ]);

  const recapS1E2 = manager.getStorySoFar("show:breaking-bad", 1, 2);
  assert.ok(recapS1E2);
  assert.equal(recapS1E2.storySoFarBullets.length, 2);
});

// --- 3. NEURAL SUBTITLE TRANSLATOR TESTS ---
test("Subtitle Translator: tag preservation, phrase translation, and cue array processing", async () => {
  const taggedText = "<i>{\\an8}ありがとう</i>";
  const { cleanText, tags } = extractAndPreserveTags(taggedText);
  assert.equal(cleanText, "§TAG§§TAG§ありがとう§TAG§");
  assert.equal(tags.length, 3);

  const restored = reinsertTags("§TAG§§TAG§Thank you§TAG§", tags);
  assert.equal(restored, "<i>{\\an8}Thank you</i>");

  // Single line translation
  const translatedJa = await translateSubtitleText("ありがとう", "ja", "en");
  assert.equal(translatedJa, "Thank you");

  const translatedFr = await translateSubtitleText("bonjour", "fr", "en");
  assert.equal(translatedFr, "hello");

  // Batch cues
  const cues = [
    { id: "1", startMs: 1000, endMs: 2500, text: "hola" },
    { id: "2", startMs: 2600, endMs: 4000, text: "gracias" },
  ];

  const translatedCues = await translateSubtitleCues(cues, "es", "en");
  assert.equal(translatedCues.length, 2);
  assert.equal(translatedCues[0].text, "hello");
  assert.equal(translatedCues[1].text, "thank you");
  assert.equal(translatedCues[0].startMs, 1000);
  assert.equal(translatedCues[0].endMs, 2500);
});

// --- 4. P2P VIRTUAL CINEMA & VOICE TESTS ---
test("Virtual Cinema: room creation, participant voice activity, and dynamic movie audio ducking", () => {
  const coordinator = new P2PVirtualCinemaCoordinator("peer-host");
  const room = coordinator.createRoom("room-123", "movie:matrix", "The Matrix", "https://stream.example/m.mkv");

  assert.equal(room.roomId, "room-123");
  assert.equal(room.participants.length, 1);
  assert.equal(coordinator.getDuckingVolumeMultiplier(), 1.0); // 100% volume initial

  // Add peer
  coordinator.addParticipant({
    peerId: "peer-friend",
    displayName: "Alice",
    isSpeaking: false,
    micMuted: false,
    audioLevel: 0,
  });

  assert.equal(coordinator.getRoom()?.participants.length, 2);

  // Friend speaks -> Movie audio ducks smoothly to 35%
  let observedDucking = 1.0;
  coordinator.subscribeDucking((mult) => {
    observedDucking = mult;
  });

  coordinator.updatePeerVoiceActivity("peer-friend", true, 0.8);
  assert.equal(coordinator.getDuckingVolumeMultiplier(), 0.35);
  assert.equal(observedDucking, 0.35);

  // Friend stops speaking -> Movie audio returns to 100%
  coordinator.updatePeerVoiceActivity("peer-friend", false, 0.0);
  assert.equal(coordinator.getDuckingVolumeMultiplier(), 1.0);

  // Broadcast sync action
  const syncPacket = coordinator.broadcastSyncAction("SYNC_PLAY", 450);
  assert.equal(syncPacket.type, "SYNC_PLAY");
  assert.equal(syncPacket.positionSec, 450);
  assert.equal(coordinator.getRoom()?.isPlaying, true);
});

// --- 5. LAN LOCAL PEER CACHE TESTS ---
test("LAN Peer Cache: local chunk registration, BEP 14 peer discovery, and zero-bandwidth streaming", () => {
  const coordinator = new LanPeerCacheCoordinator("local-device");
  const infohash = "abcdef0123456789abcdef0123456789abcdef01";

  // Register local chunk
  coordinator.registerLocalChunk(infohash, 0);
  assert.equal(coordinator.hasLocalChunk(infohash, 0), true);
  assert.equal(coordinator.hasLocalChunk(infohash, 1), false);

  // Discover neighbor LAN peer
  coordinator.handlePeerAnnouncement({
    peerId: "neighbor-pc",
    lanIp: "192.168.1.120",
    port: 6881,
    infohash,
    availableChunkCount: 150,
    lastAnnouncedTs: Date.now(),
  });

  const discoveredPeers = coordinator.findLanPeersForStream(infohash);
  assert.equal(discoveredPeers.length, 1);
  assert.equal(discoveredPeers[0].lanIp, "192.168.1.120");

  // Fetch chunk over LAN (2MB)
  const result = coordinator.fetchChunkFromLanPeer(discoveredPeers[0], 5, 2 * 1024 * 1024);
  assert.equal(result.success, true);
  assert.equal(result.source, "lan-mesh");

  const stats = coordinator.getStats();
  assert.equal(stats.externalBandwidthSavedBytes, 2 * 1024 * 1024);
  assert.equal(stats.lanPeersDiscovered, 1);
});
