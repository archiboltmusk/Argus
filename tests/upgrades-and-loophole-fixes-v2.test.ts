import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isAnimeContent,
  resolveDubSubDecision,
  saveTrackOverride,
  clearTrackOverride,
} from "../src/lib/player/dub-sub-matrix";
import {
  isNightShieldEnabled,
  setNightShieldEnabled,
  toggleNightShield,
  buildNightShieldFilterString,
} from "../src/lib/player/cinema-night-shield";
import {
  redactDebridUrl,
  redactObject,
  REDACTED_TOKEN_PLACEHOLDER,
} from "../src/lib/debrid/token-vault";
import { preburstStreamHeader } from "../src/lib/streams/stream-header-preburst";
import {
  calculateSmoothedFrame,
  buildWledPayload,
  getAmbilightConfig,
  updateAmbilightConfig,
  type AmbilightFrame,
} from "../src/lib/ambilight/lan-ambilight";
import {
  checkStorageSafety,
  checkNetworkPermitted,
  prioritizeSeasonQueue,
  autoCleanupWatchedEpisode,
  getSeasonPackSettings,
  updateSeasonPackSettings,
} from "../src/lib/download/season-pack-downloader";
import type { Meta } from "../src/lib/cinemeta";
import type { PlayEpisode } from "../src/lib/view";

test("DubSubMatrix: correctly identifies anime content", () => {
  const animeMeta: Meta = {
    id: "kitsu:1234",
    type: "series",
    name: "Demon Slayer",
    genres: ["Animation", "Action", "Anime"],
  };
  assert.equal(isAnimeContent(animeMeta), true);

  const regularMovie: Meta = {
    id: "tt1234567",
    type: "movie",
    name: "The Godfather",
    genres: ["Crime", "Drama"],
  };
  assert.equal(isAnimeContent(regularMovie), false);
});

test("DubSubMatrix: resolves Anime with Japanese audio + user sub", () => {
  const animeMeta: Meta = {
    id: "kitsu:5555",
    type: "series",
    name: "Attack on Titan",
    genres: ["Anime"],
  };

  const audioTracks = [
    { id: 1, lang: "eng", title: "English 5.1" },
    { id: 2, lang: "jpn", title: "Japanese Original" },
  ];
  const subTracks = [
    { id: 101, lang: "eng", title: "English Full" },
    { id: 102, lang: "spa", title: "Spanish" },
  ];

  const decision = resolveDubSubDecision({
    meta: animeMeta,
    audioTracks,
    subtitleTracks: subTracks,
    systemLang: "en",
  });

  assert.equal(decision.category, "anime");
  assert.equal(decision.preferredAudioTrackId, 2);
  assert.equal(decision.subtitlesEnabled, true);
  assert.equal(decision.preferredSubtitleTrackId, 101);
});

test("DubSubMatrix: resolves Native English film with Subtitles OFF by default", () => {
  const englishMovie: Meta = {
    id: "tt9999999",
    type: "movie",
    name: "Oppenheimer",
    language: "en",
    genres: ["Biography", "Drama", "History"],
  };

  const audioTracks = [{ id: 1, lang: "eng", title: "English DTS-HD MA" }];
  const subTracks = [{ id: 10, lang: "eng", title: "English SDH" }];

  const decision = resolveDubSubDecision({
    meta: englishMovie,
    audioTracks,
    subtitleTracks: subTracks,
    systemLang: "en",
  });

  assert.equal(decision.category, "native");
  assert.equal(decision.subtitlesEnabled, false);
});

test("DubSubMatrix: saves and respects manual sticky track overrides", () => {
  const meta: Meta = {
    id: "tt8888888",
    type: "movie",
    name: "Custom Film",
    language: "en",
  };

  saveTrackOverride("tt8888888", 99, 999);

  const decision = resolveDubSubDecision({
    meta,
    audioTracks: [{ id: 1, lang: "eng" }, { id: 99, lang: "fra" }],
    subtitleTracks: [{ id: 10, lang: "eng" }, { id: 999, lang: "fra" }],
    systemLang: "en",
  });

  assert.equal(decision.preferredAudioTrackId, 99);
  assert.equal(decision.preferredSubtitleTrackId, 999);
  assert.equal(decision.subtitlesEnabled, true);

  clearTrackOverride("tt8888888");
});

test("CinemaNightShield: toggles and generates correct DSP lavfi filters", () => {
  setNightShieldEnabled(false);
  assert.equal(isNightShieldEnabled(), false);

  const inactiveFilter = buildNightShieldFilterString();
  assert.equal(inactiveFilter.includes("dynaudnorm=f=400"), false);
  assert.equal(inactiveFilter.includes("highpass=f=45"), false);

  toggleNightShield();
  assert.equal(isNightShieldEnabled(), true);

  const activeFilter = buildNightShieldFilterString(["volume=1.0"]);
  assert.equal(activeFilter.includes("highpass=f=45"), true);
  assert.equal(activeFilter.includes("equalizer=f=2200"), true);
  assert.equal(activeFilter.includes("dynaudnorm=f=400"), true);
  assert.equal(activeFilter.includes("volume=1.0"), true);

  // Reset
  setNightShieldEnabled(false);
});

test("TokenVault: redacts private credentials from URLs and payload objects", () => {
  const sensitiveUrl =
    "https://torrentio.strem.fun/realdebrid=0123456789abcdef0123456789abcdef/manifest.json";
  const safeUrl = redactDebridUrl(sensitiveUrl);
  assert.equal(safeUrl.includes("0123456789abcdef"), false);
  assert.equal(safeUrl.includes(REDACTED_TOKEN_PLACEHOLDER), true);

  const queryUrl = "https://torbox.app/api/stream?token=SECRET_TORBOX_AUTH_TOKEN_99999";
  const safeQueryUrl = redactDebridUrl(queryUrl);
  assert.equal(safeQueryUrl.includes("SECRET_TORBOX_AUTH_TOKEN_99999"), false);
  assert.equal(safeQueryUrl.includes(REDACTED_TOKEN_PLACEHOLDER), true);

  const sensitiveConfig = {
    appName: "Argus",
    debridToken: "super_secret_token_123456",
    streams: [
      { name: "Torrentio RD", url: sensitiveUrl },
    ],
  };

  const redacted = redactObject(sensitiveConfig);
  assert.equal(redacted.debridToken, REDACTED_TOKEN_PLACEHOLDER);
  assert.equal(redacted.streams[0].url.includes("0123456789abcdef"), false);
});

test("StreamHeaderPreburst: safely runs without errors for valid and invalid URLs", async () => {
  const invalidResult = await preburstStreamHeader("ftp://invalid-url.local");
  assert.equal(invalidResult.ok, false);

  const emptyResult = await preburstStreamHeader("");
  assert.equal(emptyResult.ok, false);
});

test("AmbilightSync: performs exponential moving average color smoothing", () => {
  const currentFrame: AmbilightFrame = {
    top: { r: 255, g: 0, b: 0 },
    right: { r: 0, g: 255, b: 0 },
    bottom: { r: 0, g: 0, b: 255 },
    left: { r: 100, g: 100, b: 100 },
    timestamp: 1000,
  };

  const previousFrame: AmbilightFrame = {
    top: { r: 0, g: 0, b: 0 },
    right: { r: 0, g: 0, b: 0 },
    bottom: { r: 0, g: 0, b: 0 },
    left: { r: 0, g: 0, b: 0 },
    timestamp: 950,
  };

  const smoothed = calculateSmoothedFrame(currentFrame, previousFrame, 0.5);
  // (0 * 0.5) + (255 * 0.5) = 127.5 -> 128
  assert.equal(smoothed.top.r, 128);
  assert.equal(smoothed.right.g, 128);
  assert.equal(smoothed.bottom.b, 128);

  const payload = buildWledPayload(smoothed, 200);
  assert.equal(payload.on, true);
  assert.equal(payload.bri, 200);
  assert.equal(Array.isArray(payload.seg), true);
});

test("AmbilightSync: persists configuration correctly", () => {
  const updated = updateAmbilightConfig({
    controllerIp: "192.168.1.150",
    brightness: 220,
  });
  assert.equal(updated.controllerIp, "192.168.1.150");
  assert.equal(updated.brightness, 220);

  const retrieved = getAmbilightConfig();
  assert.equal(retrieved.controllerIp, "192.168.1.150");
  assert.equal(retrieved.brightness, 220);
});

test("SeasonPackDownloader: checks storage headroom and network policies", async () => {
  const storageCheck = await checkStorageSafety(1024 * 1024 * 1024);
  assert.equal(typeof storageCheck.safe, "boolean");
  assert.equal(typeof storageCheck.availableBytes, "number");

  const networkCheck = checkNetworkPermitted();
  assert.equal(typeof networkCheck.allowed, "boolean");
  assert.equal(typeof networkCheck.isMetered, "boolean");
});

test("SeasonPackDownloader: prioritizes episodes starting with current episode", () => {
  const episodes: PlayEpisode[] = [
    { season: 1, episode: 1, name: "E1" },
    { season: 1, episode: 2, name: "E2" },
    { season: 1, episode: 3, name: "E3" },
    { season: 1, episode: 4, name: "E4" },
  ];

  const prioritized = prioritizeSeasonQueue(episodes, 2); // starting at E3 (index 2)
  assert.equal(prioritized[0].episode, 3);
  assert.equal(prioritized[1].episode, 4);
  assert.equal(prioritized[2].episode, 1);
  assert.equal(prioritized[3].episode, 2);
});

test("SeasonPackDownloader: auto-cleanup recognizes threshold and settings", async () => {
  updateSeasonPackSettings({ autoDeleteWatched: false });
  const noClean = await autoCleanupWatchedEpisode("tt123", 1, 1, 0.95);
  assert.equal(noClean.cleaned, false);

  updateSeasonPackSettings({ autoDeleteWatched: true });
  const incompleteClean = await autoCleanupWatchedEpisode("tt123", 1, 1, 0.75); // < 90%
  assert.equal(incompleteClean.cleaned, false);
});
