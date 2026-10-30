import "./_localstorage-stub.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  registerSwarmPeer,
  publishMediaToSwarm,
  resolveFastestSwarmStream,
  listSwarmPeers,
  type LanSwarmPeer,
} from "../src/lib/network/lan-swarm-mesh.ts";
import {
  generateNeuralMpvProperties,
  computeWallToneCalibration,
} from "../src/lib/player/neural-metal-upscaler.ts";
import {
  convertWhisperSegmentsToCues,
  getDialogueFilterParameters,
} from "../src/lib/subtitles/neural-whisper-copilot.ts";
import {
  assemblePlayableCut,
  POPULAR_EXTENDED_CUT_PRESETS,
} from "../src/lib/player/extended-cut-assembler.ts";

test("Argus Nexus LAN Swarm resolves local peer stream at zero internet data", () => {
  const peerMac: LanSwarmPeer = {
    id: "macbook-air-purulia",
    name: "Anupam's MacBook Air",
    deviceType: "mac",
    ipAddress: "192.168.1.105",
    port: 11470,
    availableMediaIds: ["movie-feluda-4k", "anime-chainsaw-120"],
    isOnline: true,
    bandwidthMbps: 950,
  };

  registerSwarmPeer(peerMac);
  const peers = listSwarmPeers();
  assert.ok(peers.some((p) => p.id === "macbook-air-purulia"), "Peer must be registered");

  // When requesting movie-feluda-4k from a projector or TV on the same Wi-Fi:
  const localStream = resolveFastestSwarmStream("movie-feluda-4k");
  assert.equal(
    localStream,
    "http://192.168.1.105:11470/stream/movie-feluda-4k",
    "Must resolve directly to local Mac IP at 950 Mbps without hitting WAN",
  );
});

test("Neural 4K Metal Upscaler & Wall-Tone Calibrator computes optical corrections", () => {
  const props = generateNeuralMpvProperties({
    mode: "projector-wall-boost",
    contrastLift: 10,
    sharpness: 0.7,
  });

  assert.equal(props.contrast, "10");
  assert.equal(props.deband, "yes");
  assert.equal(props["sharpen"], "0.7");

  // Tint compensation for warm cream wall (#FFFBF0)
  const gains = computeWallToneCalibration("#FFFBF0");
  assert.ok(gains.blueGain >= 1.0, "Must lift blue channel to neutralize warm wall tint");
});

test("Autonomous Whisper Subtitle Copilot converts segments and strips ads", () => {
  const segments = [
    {
      id: 1,
      seek: 0,
      start: 5.0,
      end: 8.5,
      text: "Jaya9 : Top 1 Cricket Platform in Bangladesh\nHello, welcome to Nairobi.",
      confidence: 0.95,
    },
    {
      id: 2,
      seek: 8.5,
      start: 9.0,
      end: 12.0,
      text: "It is an honour to meet you, Mr. Roychoudhury.",
      confidence: 0.98,
    },
  ];

  const cues = convertWhisperSegmentsToCues(segments);
  assert.equal(cues.length, 2);
  assert.ok(!cues[0].text.includes("Jaya9"), "Ad filter must strip betting watermark from Whisper cue");
  assert.equal(cues[0].text, "Hello, welcome to Nairobi.");

  // Dialogue filter parameters
  const audioFilter = getDialogueFilterParameters({ fanNoiseReduction: true, dialogueBoostDb: 6 });
  assert.ok(audioFilter.afString.includes("highpass=f=120"), "Must filter low projector fan rumble");
  assert.ok(audioFilter.afString.includes("equalizer=f=3000"), "Must boost vocal clarity range");
});

test("1-Click Community Extended Cut auto-assembler generates playable package", () => {
  assert.ok(POPULAR_EXTENDED_CUT_PRESETS.length >= 4, "Must contain community presets");

  const recipe = {
    id: "aliens-se",
    movieTitle: "Aliens",
    editionName: "Special Edition",
    mainMoviePathOrUrl: "/movies/aliens.mkv",
    mainMovieDurationSeconds: 8200,
    insertions: [
      {
        id: "hadleys-hope",
        title: "Hadley's Hope Colony",
        insertAtSeconds: 650,
        clipPathOrUrl: "/extras/colony.mkv",
        durationSeconds: 300,
        subtitleCues: [{ start: 5, end: 10, text: "Mom, look at the crawler!" }],
      },
    ],
  };

  const assembled = assemblePlayableCut(recipe, [
    { start: 100, end: 105, text: "Ripley sleeping in hypersleep." },
    { start: 700, end: 705, text: "Subsequent theatrical dialogue." },
  ]);

  assert.ok(assembled.playableEdlUri.startsWith("edl://"));
  assert.equal(assembled.totalRuntimeSeconds, 8500);

  // Subtitle after the 300s insertion (originally 700) should now be shifted to 1000
  const shifted = assembled.realignedSubtitles.find((c) => c.text.includes("Subsequent theatrical dialogue"));
  assert.equal(shifted?.start, 1000);
});
