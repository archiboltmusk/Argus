import { test } from "node:test";
import assert from "node:assert/strict";
import "./_localstorage-stub.ts";

// 1. Frame Interpolation
import {
  getFrameInterpolationConfig,
  updateFrameInterpolationConfig,
  buildInterpolationMpvCommands,
  subscribeFrameInterpolation,
} from "../src/lib/player/frame-interpolation";

// 2. Semantic Vector Search
import {
  generateSemanticVector,
  calculateCosineSimilarity,
  SemanticSearchIndex,
  VECTOR_DIMENSIONS,
} from "../src/lib/algo/semantic-vector-search";

// 3. WebXR Spatial Cinema
import {
  getSpatialCinemaConfig,
  updateSpatialCinemaConfig,
  calculateStereoUVs,
  calculateDepthParallaxShift,
  generateCurvedScreenGeometry,
} from "../src/lib/spatial/webxr-cinema";

// 4. DHT Subtitle Swarm
import {
  generateDhtBeaconInfohash,
  DhtMetadataSwarm,
} from "../src/lib/torrent/dht-metadata-swarm";

// 5. Voice Assistant Copilot
import {
  parseVoiceTranscript,
  getVoiceAssistantConfig,
  updateVoiceAssistantConfig,
  subscribeVoiceIntents,
  dispatchVoiceIntent,
  type VoiceIntent,
} from "../src/lib/voice/voice-assistant-copilot";

// 6. Chameleon Dynamic UI
import {
  calculateLuminance,
  calculateContrastRatio,
  rgbToHex,
  hexToRgb,
  generateChameleonPalette,
  extractDominantColorFromPixels,
  applyChameleonTheme,
} from "../src/lib/theme/chameleon-palette";

// --- 1. NEURAL FRAME INTERPOLATION TESTS ---
test("Frame Interpolation: config defaults and MPV command generation for off & active profiles", () => {
  const initial = getFrameInterpolationConfig();
  assert.equal(initial.profile, "off");

  const offCommands = buildInterpolationMpvCommands({
    profile: "off",
    targetFramerate: "auto",
    motionDeblurStrength: 0.5,
    preventSoapOperaArtifacts: true,
  });
  assert.ok(offCommands.some((c) => c.name === "interpolation" && c.value === "no"));
  assert.ok(offCommands.some((c) => c.name === "video-sync" && c.value === "audio"));

  const rifeCommands = buildInterpolationMpvCommands({
    profile: "rife-smooth",
    targetFramerate: 60,
    motionDeblurStrength: 0.7,
    preventSoapOperaArtifacts: true,
  });
  assert.ok(rifeCommands.some((c) => c.name === "interpolation" && c.value === "yes"));
  assert.ok(rifeCommands.some((c) => c.name === "video-sync" && c.value === "display-resample"));
  assert.ok(rifeCommands.some((c) => c.name === "tscale" && c.value === "spline"));

  let notified = false;
  const unsubscribe = subscribeFrameInterpolation((cfg) => {
    if (cfg.profile === "anime-motion") notified = true;
  });

  updateFrameInterpolationConfig({ profile: "anime-motion" });
  assert.equal(getFrameInterpolationConfig().profile, "anime-motion");
  assert.ok(notified);
  unsubscribe();
});

// --- 2. LOCAL SEMANTIC VECTOR SEARCH TESTS ---
test("Semantic Search: vector dimensions, L2 normalization and vibe matching", () => {
  const v1 = generateSemanticVector("futuristic cyberpunk neon dystopian ai city");
  assert.equal(v1.length, VECTOR_DIMENSIONS);

  // Check L2 norm is approximately 1.0
  let sumSq = 0;
  for (const val of v1) sumSq += val * val;
  assert.ok(Math.abs(Math.sqrt(sumSq) - 1.0) < 1e-4);

  const v2 = generateSemanticVector("neon dystopian blade runner future synthetic");
  const v3 = generateSemanticVector("sweet romantic comedy couple wedding love");

  const simCyber = calculateCosineSimilarity(v1, v2);
  const simRomance = calculateCosineSimilarity(v1, v3);

  // Related vibe should have higher similarity than unrelated romance
  assert.ok(simCyber > simRomance);
  assert.ok(simCyber > 0.5);

  // Test SemanticSearchIndex
  const index = new SemanticSearchIndex();
  index.indexItem({
    id: "tt01",
    title: "Blade Runner 2049",
    overview: "A young blade runner unearths a long-buried secret in a dystopian future.",
    genres: ["Sci-Fi", "Mystery"],
    keywords: ["cyberpunk", "neon", "replicant", "rain"],
  });
  index.indexItem({
    id: "tt02",
    title: "La La Land",
    overview: "A jazz pianist falls for an aspiring actress in Los Angeles.",
    genres: ["Comedy", "Drama", "Romance"],
    keywords: ["love", "music", "couple", "sweet"],
  });

  const results = index.search("dark neon rain noir detective");
  assert.ok(results.length > 0);
  assert.equal(results[0].id, "tt01");
  assert.equal(results[0].title, "Blade Runner 2049");
  assert.ok(results[0].similarity > 0);
});

// --- 3. WEBXR SPATIAL CINEMA TESTS ---
test("WebXR Spatial Cinema: stereo UV mapping, depth parallax shift and curvature geometry", () => {
  const initial = getSpatialCinemaConfig();
  assert.equal(initial.environment, "imax-curved");

  updateSpatialCinemaConfig({ screenDistanceMeters: 6.5, screenCurvatureDegrees: 60 });
  assert.equal(getSpatialCinemaConfig().screenDistanceMeters, 6.5);
  assert.equal(getSpatialCinemaConfig().screenCurvatureDegrees, 60);

  // Side-by-side stereo UVs
  const sbsUv = calculateStereoUVs("3d-sbs");
  assert.equal(sbsUv.leftEye.uMin, 0.0);
  assert.equal(sbsUv.leftEye.uMax, 0.5);
  assert.equal(sbsUv.rightEye.uMin, 0.5);
  assert.equal(sbsUv.rightEye.uMax, 1.0);

  // Top-Bottom stereo UVs
  const tbUv = calculateStereoUVs("3d-top-bottom");
  assert.equal(tbUv.leftEye.vMin, 0.5);
  assert.equal(tbUv.leftEye.vMax, 1.0);
  assert.equal(tbUv.rightEye.vMin, 0.0);
  assert.equal(tbUv.rightEye.vMax, 0.5);

  // Parallax shift
  const shift = calculateDepthParallaxShift(0.9, 0.6, 64, 5.0);
  assert.ok(shift.leftShiftU < 0);
  assert.ok(shift.rightShiftU > 0);
  assert.equal(Math.abs(shift.leftShiftU), shift.rightShiftU);

  // Curved screen geometry generator
  const geom = generateCurvedScreenGeometry(45, 5.0, 1.0, 8);
  assert.ok(geom.length > 0);
  assert.equal(geom[0].u, 0.0);
  assert.equal(geom[geom.length - 1].u, 1.0);
});

// --- 4. DECENTRALIZED DHT METADATA SWARM TESTS ---
test("DHT Metadata Swarm: infohash beacon generation, announce, query and payload decode", () => {
  const mediaKey = "movie:tmdb:550";
  const lang = "en";
  const hash1 = generateDhtBeaconInfohash(mediaKey, lang);
  const hash2 = generateDhtBeaconInfohash(mediaKey, lang);

  assert.equal(hash1.length, 40);
  assert.equal(hash1, hash2); // Deterministic

  const swarm = new DhtMetadataSwarm();
  const rawSrt = "1\n00:00:01,000 --> 00:00:04,000\nHello from decentralized DHT swarm!";
  const record = swarm.announceSubtitle(mediaKey, lang, rawSrt, "srt");

  assert.equal(record.infohash, hash1);
  assert.equal(record.mediaKey, mediaKey);
  assert.equal(record.language, "en");
  assert.ok(record.sizeBytes > 0);
  assert.equal(record.seeders, 1);

  // Query swarm
  const matches = swarm.querySubtitles(mediaKey, "en");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].infohash, hash1);

  // Decode payload
  const decoded = swarm.decodePayload(matches[0]);
  assert.equal(decoded, rawSrt);

  // Stats
  const stats = swarm.getStats();
  assert.ok(stats.totalIndexedItems >= 1);
  assert.ok(stats.activeAnnouncements >= 1);
});

// --- 5. HANDS-FREE VOICE ASSISTANT COPILOT TESTS ---
test("Voice Assistant Copilot: parsing voice intents for seek, subs, rewind, and audio", () => {
  updateVoiceAssistantConfig({ wakeWordEnabled: false });

  // 1. "What did they say?"
  const intent1 = parseVoiceTranscript("Wait what did they say?");
  assert.equal(intent1.type, "WHAT_DID_THEY_SAY");
  assert.equal(intent1.payload.rewindSeconds, 15);
  assert.equal(intent1.payload.subtitlesDurationSec, 20);

  // 2. Play / Pause
  const intent2 = parseVoiceTranscript("pause video");
  assert.equal(intent2.type, "PLAY_PAUSE");
  assert.equal(intent2.payload.action, "pause");

  const intent3 = parseVoiceTranscript("resume");
  assert.equal(intent3.type, "PLAY_PAUSE");
  assert.equal(intent3.payload.action, "play");

  // 3. Skip intro & Next episode
  const intent4 = parseVoiceTranscript("skip intro please");
  assert.equal(intent4.type, "SKIP_INTRO");

  const intent5 = parseVoiceTranscript("play next episode");
  assert.equal(intent5.type, "NEXT_EPISODE");

  // 4. Scrub / Seek
  const intent6 = parseVoiceTranscript("rewind 30 seconds");
  assert.equal(intent6.type, "SEEK");
  assert.equal(intent6.payload.offsetSeconds, -30);

  const intent7 = parseVoiceTranscript("fast forward 45 seconds");
  assert.equal(intent7.type, "SEEK");
  assert.equal(intent7.payload.offsetSeconds, 45);

  // 5. Volume control
  const intent8 = parseVoiceTranscript("set volume to 75%");
  assert.equal(intent8.type, "SET_VOLUME");
  assert.equal(intent8.payload.volumePercent, 75);

  const intent9 = parseVoiceTranscript("mute audio");
  assert.equal(intent9.type, "SET_VOLUME");
  assert.equal(intent9.payload.action, "mute");

  // 6. Subtitles & Audio
  const intent10 = parseVoiceTranscript("turn on spanish subtitles");
  assert.equal(intent10.type, "SWITCH_SUBTITLES");
  assert.equal(intent10.payload.language, "spanish");
  assert.equal(intent10.payload.enabled, true);

  const intent11 = parseVoiceTranscript("switch audio to japanese");
  assert.equal(intent11.type, "SWITCH_AUDIO");
  assert.equal(intent11.payload.language, "japanese");

  // Dispatch and event subscription
  let received: VoiceIntent | null = null;
  const unsub = subscribeVoiceIntents((i) => {
    received = i;
  });
  dispatchVoiceIntent(intent1);
  assert.equal(received?.type, "WHAT_DID_THEY_SAY");
  unsub();
});

// --- 6. CHAMELEON DYNAMIC UI PALETTE TESTS ---
test("Chameleon Palette: luminance, contrast ratio, dominant extraction and CSS variable injection", () => {
  const pureWhite = { r: 255, g: 255, b: 255 };
  const pureBlack = { r: 0, g: 0, b: 0 };
  const deepIndigo = { r: 99, g: 102, b: 241 };

  assert.equal(calculateLuminance(pureWhite), 1.0);
  assert.equal(calculateLuminance(pureBlack), 0.0);
  assert.equal(calculateContrastRatio(pureWhite, pureBlack), 21);

  assert.equal(rgbToHex(pureWhite), "#ffffff");
  assert.equal(rgbToHex(pureBlack), "#000000");
  assert.deepEqual(hexToRgb("#ffffff"), pureWhite);

  const palette = generateChameleonPalette(deepIndigo);
  assert.ok(palette.primaryHex.startsWith("#"));
  assert.ok(palette.accentHex.startsWith("#"));
  assert.ok(palette.glassSurfaceRgba.startsWith("rgba("));
  assert.ok(palette.contrastRatio >= 4.5);
  assert.equal(palette.isAccessibleAaa, true);

  // Pixel extraction
  const samplePixels = new Uint8ClampedArray([
    // Pixel 1 (Indigo)
    99, 102, 241, 255,
    // Pixel 2 (Indigo)
    100, 100, 240, 255,
    // Pixel 3 (Indigo)
    98, 104, 242, 255,
    // Pixel 4 (Indigo)
    99, 101, 241, 255,
    // Pixel 5 (Indigo)
    99, 102, 241, 255,
  ]);
  const dominant = extractDominantColorFromPixels(samplePixels);
  assert.ok(dominant.b > dominant.r && dominant.b > dominant.g);

  // Apply to mock element style
  const mockStyles: Record<string, string> = {};
  const mockElement = {
    style: {
      setProperty: (prop: string, val: string) => {
        mockStyles[prop] = val;
      },
    },
  } as unknown as HTMLElement;

  applyChameleonTheme(palette, mockElement);
  assert.equal(mockStyles["--chameleon-primary"], palette.primaryHex);
  assert.equal(mockStyles["--chameleon-accent"], palette.accentHex);
  assert.equal(mockStyles["--chameleon-glow"], palette.glowHex);
  assert.equal(mockStyles["--chameleon-glass"], palette.glassSurfaceRgba);
});
