// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";

import {
  getVoiceClarifierMpvFilter,
  VOICE_CLARIFIER_PROFILES,
} from "../src/lib/player/neural-voice-clarifier.ts";
import { LanSwarmManager } from "../src/lib/streams/lan-swarm-cache.ts";
import { computeSubtitleLayout } from "../src/lib/subtitles/letterbox-subtitle-dodger.ts";
import { synthesizeChapters } from "../src/lib/player/synthetic-chapters.ts";
import { resolveLegalStudioFallback } from "../src/lib/streams/hybrid-legal-fallback.ts";
import { IndicDubbingEngine, type DubCue } from "../src/lib/player/indic-dubbing-overlay.ts";

test("Neural Voice Clarifier generates tuned acoustic filters for Ray & Projectors", () => {
  const disabled = getVoiceClarifierMpvFilter(false);
  assert.equal(disabled, null);

  const rayFilter = getVoiceClarifierMpvFilter(true, "ray-vintage", 2);
  assert.match(rayFilter!, /highpass=f=80/);
  assert.match(rayFilter!, /equalizer=f=3000.*:g=7/);
  assert.match(rayFilter!, /volume=\+2dB/);

  const beemFilter = getVoiceClarifierMpvFilter(true, "projector-beem");
  assert.match(beemFilter!, /equalizer=f=220.*:g=-5\.0/); // Cuts boxy resonance
  assert.match(beemFilter!, /equalizer=f=3500.*:g=6\.5/); // Lifts speech presence
});

test("LAN P2P Swarm Cache intercepts redundant downloads and tracks WAN bytes saved", () => {
  const swarm = LanSwarmManager.getInstance();
  swarm.clear();
  swarm.setEnabled(true);

  // Initial miss
  const miss = swarm.queryLanPeersForChunk("hash-tintin-4k", 0, 1024 * 1024);
  assert.equal(miss.availableOnLan, false);

  // Buffer locally
  swarm.registerLocalChunk("hash-tintin-4k", 0, 1024 * 1024 * 50); // 50MB

  // Subsequent hit from local LAN loopback
  const hit = swarm.queryLanPeersForChunk("hash-tintin-4k", 0, 1024 * 1024 * 10);
  assert.equal(hit.availableOnLan, true);

  const stats = swarm.getStats();
  assert.ok(stats.wanBytesSaved > 0);
});

test("Face & Letterbox-Aware Subtitle Dodger places amber in black bars and dodges faces", () => {
  // 1. 2.39:1 widescreen film on 16:9 (1.777) TV
  const letterbox = computeSubtitleLayout({
    videoAspect: 2.39,
    displayAspect: 1.777,
    displayHeightPx: 1080,
    isProjectorOrOled: true,
  });
  assert.equal(letterbox.placement, "bottom-letterbox");
  assert.equal(letterbox.textColor, "#FFD180"); // Warm amber
  assert.ok(letterbox.hasLetterbox);
  assert.ok(letterbox.letterboxHeightPx > 36);

  // 2. Full-bleed 16:9 film with face at bottom center
  const faceDodge = computeSubtitleLayout({
    videoAspect: 1.777,
    displayAspect: 1.777,
    displayHeightPx: 1080,
    faceBoxes: [{ x: 0.4, y: 0.8, width: 0.2, height: 0.15 }],
  });
  assert.equal(faceDodge.placement, "in-frame-top");
  assert.equal(faceDodge.offsetYPercent, 88);
});

test("Automatic Scene & Song Chapter Synthesizer creates intermission and song markers", () => {
  const chapters = synthesizeChapters({
    durationSec: 9000, // 2.5 hours
    isIndianCinema: true,
    knownSongTitles: ["Ami Banglay Gaan Gai", "Pothom Bhalobasha"],
    audioSilenceOffsetsSec: [4620],
  });

  assert.ok(chapters.length >= 6);
  assert.ok(chapters.some((c) => c.kind === "prologue"));
  assert.ok(chapters.some((c) => c.kind === "intermission" && c.startSec === 4620));
  assert.ok(chapters.some((c) => c.kind === "song" && c.title.includes("Ami Banglay")));
  assert.ok(chapters.some((c) => c.kind === "climax"));
  assert.ok(chapters.some((c) => c.kind === "credits"));
});

test("Hybrid Legal Streaming Fallback resolves official studio channels for rare classics", () => {
  // Healthy torrent (>=5 seeders) does not trigger fallback
  const healthy = resolveLegalStudioFallback("Feluda Chander Pahar", 2013, 12);
  assert.equal(healthy.isAvailable, false);

  // Dead torrent (0 seeders) of SVF classic triggers official master
  const svfFallback = resolveLegalStudioFallback("Byomkesh Satyanweshi", 2013, 0);
  assert.equal(svfFallback.isAvailable, true);
  assert.match(svfFallback.studioName!, /SVF|Angel/);
  assert.equal(svfFallback.resolution, "1080p");
});

test("Edge Zero-Shot Indic Dubbing Overlay manages soundtrack ducking during speech", () => {
  const engine = IndicDubbingEngine.getInstance();
  engine.setConfig(true, "bengali");

  const cues: DubCue[] = [
    {
      id: "cue-1",
      startSec: 10.0,
      endSec: 14.5,
      originalText: "Mille sabords! Tintin!",
      language: "bengali",
    },
  ];

  // Quiet period at 5.0s -> no ducking
  const quietState = engine.evaluatePlaybackPosition(5.0, cues);
  assert.equal(quietState.isSpeaking, false);
  assert.equal(quietState.soundtrackVolumeMultiplier, 1.0);
  assert.equal(engine.getMpvDuckingFilter(5.0, cues), null);

  // Spoken period at 12.0s -> 15% ducking
  const speakState = engine.evaluatePlaybackPosition(12.0, cues);
  assert.equal(speakState.isSpeaking, true);
  assert.equal(speakState.soundtrackVolumeMultiplier, 0.85);
  assert.equal(engine.getMpvDuckingFilter(12.0, cues), "volume=-1.4dB");
});
