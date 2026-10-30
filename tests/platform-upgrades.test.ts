import "./_localstorage-stub.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { stripSubtitleAds, parseSubtitle } from "../src/lib/subtitles/parser.ts";
import { BENGAL_AUDIO_VAULT, searchBengalAudio } from "../src/lib/bengal/spoken-audio.ts";
import { dispatchRemoteCommand, subscribeRemoteCommands, type RemoteCommandType } from "../src/lib/remote/living-room-companion.ts";
import { listPrecachedItems, queuePrecache } from "../src/lib/download/smart-precacher.ts";

test("Subtitle Anti-Spam Ad Filter strips betting banners and retains dialogue", () => {
  const dirtySubtitle = `Jaya9 : Top 1 Cricket Platform in Bangladesh
আপনি তো মিঃ রায়চৌধুরী, তাই না?
নাইরোবিতে স্বাগতম, স্যার।`;

  const clean = stripSubtitleAds(dirtySubtitle);
  assert.ok(!clean.includes("Jaya9"), "Must strip Jaya9 ad");
  assert.ok(!clean.includes("Cricket Platform"), "Must strip betting platform banner");
  assert.ok(clean.includes("আপনি তো মিঃ রায়চৌধুরী, তাই না?"), "Must preserve actual dialogue line 1");
  assert.ok(clean.includes("নাইরোবিতে স্বাগতম, স্যার।"), "Must preserve actual dialogue line 2");

  const oneXbetText = `1xBet Official Partner
Download subtitles from www.subscene.vip
Good morning, Topshe!`;
  const cleanEnglish = stripSubtitleAds(oneXbetText);
  assert.ok(!cleanEnglish.includes("1xBet"), "Must strip 1xBet");
  assert.ok(!cleanEnglish.includes("subscene.vip"), "Must strip website link");
  assert.equal(cleanEnglish, "Good morning, Topshe!", "Must preserve dialogue");
});

test("Subtitle parser integrates ad stripper across SRT cues", () => {
  const srtContent = `1
00:01:20,000 --> 00:01:24,000
Jaya9 : Top 1 Cricket Platform in Bangladesh
Welcome to Nairobi, sir.

2
00:01:25,000 --> 00:01:28,000
1xBet - Watch live sports!

3
00:01:29,000 --> 00:01:32,000
Are you Mr. Roychoudhury?`;

  const cues = parseSubtitle(srtContent, "srt");
  assert.equal(cues.length, 2, "Ad-only cues must be completely removed");
  assert.equal(cues[0].text, "Welcome to Nairobi, sir.");
  assert.equal(cues[1].text, "Are you Mr. Roychoudhury?");
});

test("Bengal Spoken Literature Vault contains curated audio dramas", () => {
  assert.ok(BENGAL_AUDIO_VAULT.length >= 6, "Must contain curated spoken classics");

  const feluda = searchBengalAudio("Feluda", "feluda");
  assert.ok(feluda.length >= 2, "Must find Feluda adventures");

  const byomkesh = searchBengalAudio("Byomkesh", "byomkesh");
  assert.ok(byomkesh.length >= 2, "Must find Byomkesh mysteries");

  for (const track of BENGAL_AUDIO_VAULT) {
    assert.ok(track.audioUrl.startsWith("http"), `${track.id} must have a valid stream URL`);
    assert.ok(track.durationMinutes > 0, `${track.id} duration must be positive`);
  }
});

test("Living Room Companion remote dispatches commands accurately", () => {
  const received: RemoteCommandType[] = [];
  const unsub = subscribeRemoteCommands((cmd) => {
    received.push(cmd.command);
  });

  dispatchRemoteCommand("prefer_english_subs");
  dispatchRemoteCommand("play_pause");
  dispatchRemoteCommand("seek_forward");

  assert.deepEqual(received, ["prefer_english_subs", "play_pause", "seek_forward"]);
  unsub();
});

test("Smart Pre-cacher manages queue and stash", () => {
  queuePrecache({
    id: "manga-ch-120",
    type: "manga-chapter",
    title: "Chainsaw Man Chapter 120",
    sourceUrl: "https://example.com/ch120",
  });

  const list = listPrecachedItems();
  assert.ok(list.some((item) => item.id === "manga-ch-120"));
});
