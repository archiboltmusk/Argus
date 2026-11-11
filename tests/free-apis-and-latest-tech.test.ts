import test from "node:test";
import assert from "node:assert/strict";
import {
  checkOllamaAvailability,
  queryOllamaCinemaCompanion,
} from "../src/lib/ai/ollama-client";
import { CinemaLoreBot } from "../src/lib/ai/cinema-lore-bot";
import { identifyAudioFingerprint } from "../src/lib/audio/acoustid-recognizer";
import { getWatchProviders } from "../src/lib/providers/watch-availability";
import { fetchAniListAnimeDetails } from "../src/lib/anime/anilist-api";

test("Ollama client: handles offline gracefully with informative start command", async () => {
  // Querying a non-existent port should return the offline fallback
  const res = await queryOllamaCinemaCompanion({
    question: "Who is the main character?",
    filmTitle: "Inception",
    currentTimestampSec: 120,
    baseUrl: "http://127.0.0.1:54321", // Dummy port
  });

  assert.equal(res.isLocal, false);
  assert.equal(res.model, "none");
  assert.ok(res.response.includes("Ollama was not detected"));
  assert.ok(res.response.includes("ollama run llama3.2"));
});

test("CinemaLoreBot: integrates with askAICompanion maintaining spoiler bounds", async () => {
  const bot = CinemaLoreBot.getInstance();
  bot.registerCharacter({
    id: "c1",
    name: "Arthur Dent",
    firstAppearanceSec: 10,
    initialRole: "Confused Earthling",
  });

  const res = await bot.askAICompanion("Who is Arthur?", 100, "Hitchhiker's Guide");
  assert.equal(res.isSpoilerShielded, true);
  assert.ok(res.knownMilestones.includes("Arthur Dent"));
});

test("AcoustID: guards invalid fingerprints and duration parameters", async () => {
  const emptyRes = await identifyAudioFingerprint({
    fingerprint: "",
    durationSec: 180,
  });
  assert.equal(emptyRes, null);

  const zeroDurationRes = await identifyAudioFingerprint({
    fingerprint: "AQAAZEmSJVIiRVEU...",
    durationSec: 0,
  });
  assert.equal(zeroDurationRes, null);
});

test("Watch Availability: validates tmdbId requirement", async () => {
  const res = await getWatchProviders({
    tmdbId: 0,
  });
  assert.deepEqual(res, []);
});

test("AniList API: handles empty title query without crashing", async () => {
  const res = await fetchAniListAnimeDetails("   ");
  assert.equal(res, null);
});
