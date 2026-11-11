import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSuperResolutionMpvCommands,
  getSuperResolutionConfig,
  updateSuperResolutionConfig,
} from "../src/lib/player/cinema-super-resolution";
import {
  getActiveScene,
  evaluateXRayRadar,
  type XRayTimeline,
} from "../src/lib/player/xray-radar";
import {
  generateRemotePairing,
  buildQrCodeRemoteUrl,
  dispatchRemoteCommand,
  getActiveRemoteSession,
  type RemoteCommand,
} from "../src/lib/remote/qr-web-remote";
import {
  isEpisodeSpoiler,
  revealSpoiler,
  resetRevealedSpoilers,
  formatSynopsisWithShield,
  updateSpoilerShieldSettings,
} from "../src/lib/spoiler/spoiler-shield";
import {
  calculateEcoPlaybackProfile,
  updateEcoSettings,
  type BatteryState,
} from "../src/lib/player/eco-battery-optimizer";
import {
  calculateLiveBroadcast,
  channelUp,
  channelDown,
  generateDefaultVirtualChannels,
} from "../src/lib/channels/virtual-cable-channels";

test("CinemaSuperResolution: builds accurate MPV GLSL and deband property commands", () => {
  updateSuperResolutionConfig({ profile: "cas-sharpen", sharpness: 0.8, enableDeband: true });
  const casCommands = buildSuperResolutionMpvCommands();

  const debandCmd = casCommands.find((c) => c.name === "deband");
  assert.equal(debandCmd?.value, "yes");

  const sharpenCmd = casCommands.find((c) => c.name === "sharpen");
  assert.ok(sharpenCmd);
  assert.equal(sharpenCmd?.value, "1.20");

  updateSuperResolutionConfig({ profile: "off" });
  const offCommands = buildSuperResolutionMpvCommands();
  const offShader = offCommands.find((c) => c.name === "glsl-shaders");
  assert.equal(offShader?.value, "");
});

test("XRayRadar: finds active scene, actors on screen, and background music", () => {
  const mockTimeline: XRayTimeline = {
    mediaId: "tt1375666",
    title: "Inception",
    allCast: [
      { id: "a1", name: "Leonardo DiCaprio", character: "Cobb" },
      { id: "a2", name: "Joseph Gordon-Levitt", character: "Arthur" },
      { id: "a3", name: "Elliot Page", character: "Ariadne" },
    ],
    scenes: [
      {
        startSec: 100,
        endSec: 300,
        actors: [
          { id: "a1", name: "Leonardo DiCaprio", character: "Cobb" },
          { id: "a2", name: "Joseph Gordon-Levitt", character: "Arthur" },
        ],
        music: {
          id: "m1",
          title: "Time",
          artist: "Hans Zimmer",
          startSec: 100,
          endSec: 300,
        },
        trivia: [{ id: "t1", text: "The rotating hallway scene was built in a real centrifuge.", category: "behind_the_scenes" }],
      },
    ],
  };

  // During active scene (at 150s)
  const active = evaluateXRayRadar(mockTimeline, 150);
  assert.equal(active.hasData, true);
  assert.equal(active.actorsOnScreen.length, 2);
  assert.equal(active.currentTrack?.title, "Time");
  assert.equal(active.activeTrivia.length, 1);

  // Outside specific scene (at 500s) -> fallbacks to allCast
  const fallback = evaluateXRayRadar(mockTimeline, 500);
  assert.equal(fallback.hasData, true);
  assert.equal(fallback.actorsOnScreen.length, 3);
  assert.equal(fallback.currentTrack, null);
});

test("QrWebRemote: generates secure session, builds QR URL and validates commands", () => {
  const session = generateRemotePairing("192.168.1.50", 11470);
  assert.ok(session.sessionId);
  assert.ok(session.token);

  const qrUrl = buildQrCodeRemoteUrl(session);
  assert.ok(qrUrl.includes("http://192.168.1.50:11470/remote"));
  assert.ok(qrUrl.includes(`session=${session.sessionId}`));

  // Valid command dispatch
  const validCmd: RemoteCommand = {
    type: "PLAY_PAUSE",
    sessionId: session.sessionId,
    timestamp: Date.now(),
  };
  const validRes = dispatchRemoteCommand(validCmd);
  assert.equal(validRes.accepted, true);

  // Invalid session rejection
  const invalidCmd: RemoteCommand = {
    type: "PLAY_PAUSE",
    sessionId: "fake_session_id",
    timestamp: Date.now(),
  };
  const invalidRes = dispatchRemoteCommand(invalidCmd);
  assert.equal(invalidRes.accepted, false);
});

test("SpoilerShield: blurs unwatched future episodes and redacts synopsis", () => {
  resetRevealedSpoilers();
  updateSpoilerShieldSettings({ enabled: true, redactSynopses: true });

  // User has watched S1 E2:
  // S1 E1 -> Watched (safe)
  assert.equal(isEpisodeSpoiler({ seriesId: "showA", season: 1, episode: 1, highestWatchedSeason: 1, highestWatchedEpisode: 2 }), false);
  // S1 E2 -> Watched (safe)
  assert.equal(isEpisodeSpoiler({ seriesId: "showA", season: 1, episode: 2, highestWatchedSeason: 1, highestWatchedEpisode: 2 }), false);
  // S1 E3 -> Up next (safe to browse)
  assert.equal(isEpisodeSpoiler({ seriesId: "showA", season: 1, episode: 3, highestWatchedSeason: 1, highestWatchedEpisode: 2 }), false);
  // S1 E4 -> Future episode (SPOILER!)
  assert.equal(isEpisodeSpoiler({ seriesId: "showA", season: 1, episode: 4, highestWatchedSeason: 1, highestWatchedEpisode: 2 }), true);

  // Synopsis redaction
  const redacted = formatSynopsisWithShield("Major character dies in this battle.", true);
  assert.equal(redacted.isRedacted, true);
  assert.equal(redacted.text.includes("hidden to prevent spoilers"), true);

  // Reveal override
  revealSpoiler("showA", 1, 4);
  assert.equal(isEpisodeSpoiler({ seriesId: "showA", season: 1, episode: 4, highestWatchedSeason: 1, highestWatchedEpisode: 2 }), false);
});

test("EcoBatteryOptimizer: calculates power-saving profile on battery vs AC", () => {
  updateEcoSettings({ autoEcoOnBattery: true, lowBatteryThresholdPercent: 20 });

  const batteryState: BatteryState = {
    isCharging: false,
    levelPercent: 45,
    isSupported: true,
  };

  const onBattery = calculateEcoPlaybackProfile(batteryState);
  assert.equal(onBattery.isEcoActive, true);
  assert.equal(onBattery.hwdec, "auto-safe");
  assert.equal(onBattery.disableHeavyPostProcessing, true);

  const acState: BatteryState = {
    isCharging: true,
    levelPercent: 90,
    isSupported: true,
  };

  const onAc = calculateEcoPlaybackProfile(acState);
  assert.equal(onAc.isEcoActive, false);
  assert.equal(onAc.hwdec, "auto");
  assert.equal(onAc.disableHeavyPostProcessing, false);
});

test("VirtualCableChannels: calculates live airing program via wall-clock modulo and channel surfing", () => {
  const channels = generateDefaultVirtualChannels();
  assert.ok(channels.length >= 3);

  // Wall-clock calculation at 1,000,000s
  const live = calculateLiveBroadcast(channels[0], 1_000_000 * 1000);
  assert.ok(live);
  assert.ok(live.currentProgram);
  assert.ok(live.nextProgram);
  assert.ok(live.timeRemainingSec > 0);

  // Channel surfing
  const nextCh = channelUp(channels, 101);
  assert.equal(nextCh.number, 102);

  const prevCh = channelDown(channels, 102);
  assert.equal(prevCh.number, 101);

  // Loop around (Ch+ from last channel goes to first)
  const loopedCh = channelUp(channels, 103);
  assert.equal(loopedCh.number, 101);
});
