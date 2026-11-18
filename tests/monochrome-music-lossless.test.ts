import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cleanString,
  scoreTrackCandidate,
  resolveMonochromeFlacStream,
  resolveTorrentLosslessDiscography,
  type MonochromeTrackCandidate,
} from "../src/lib/music/monochrome-flac.ts";
import {
  getBauerCrossfeedConfig,
  calculateStereoWideningMatrix,
  BAUER_CROSSFEED_PRESETS,
  POPULAR_HEADPHONE_PROFILES,
} from "../src/lib/music/audiophile-dsp.ts";
import { resolveLosslessAudioSources } from "../src/lib/music/music-scrapers.ts";
import type { MusicTrack } from "../src/lib/music/types.ts";

describe("Monochrome Lossless Music & DSP Engine", () => {
  describe("cleanString text normalization", () => {
    it("strips diacritics, accents, featured artists, and brackets", () => {
      assert.equal(cleanString("Café del Mar (Remastered 2021)"), "cafedelmar");
      assert.equal(cleanString("Starboy [Deluxe Edition]"), "starboy");
      assert.equal(cleanString("Song Name (feat. Daft Punk)"), "songname");
      assert.equal(cleanString("Another Track ft. Drake"), "anothertrack");
    });
  });

  describe("scoreTrackCandidate fuzzy candidate matching", () => {
    const target: MusicTrack = {
      id: "track-1",
      title: "Blinding Lights",
      artist: "The Weeknd",
      album: "After Hours",
      durationSeconds: 200,
      isrc: "USUG11904206",
    };

    it("awards +200 bonus for identical ISRC", () => {
      const candidate: MonochromeTrackCandidate = {
        trackId: "cand-1",
        title: "Blinding Lights",
        artist: { name: "The Weeknd" },
        duration: 200,
        isrc: "USUG11904206",
      };
      const score = scoreTrackCandidate(candidate, target);
      assert.equal(score, 200);
    });

    it("accurately scores title and artist matches with small duration delta", () => {
      const candidate: MonochromeTrackCandidate = {
        trackId: "cand-2",
        title: "Blinding Lights",
        artist: { name: "The Weeknd" },
        duration: 201, // 1 sec delta -> +25 duration bonus
      };
      const score = scoreTrackCandidate(candidate, target);
      // 100 (title) + 50 (artist) + 25 (duration <=3s) = 175
      assert.equal(score, 175);
    });

    it("gives partial scores when duration differs or is missing", () => {
      const liveCandidate: MonochromeTrackCandidate = {
        trackId: "cand-3",
        title: "Blinding Lights",
        artist: { name: "The Weeknd" },
        duration: 320, // 120s difference -> no duration bonus
      };
      const score = scoreTrackCandidate(liveCandidate, target);
      assert.equal(score, 150); // 100 + 50
    });
  });

  describe("resolveMonochromeFlacStream stream resolution", () => {
    it("resolves direct uncompressed FLAC stream URL for valid track", async () => {
      const track: MusicTrack = {
        id: "t-456",
        title: "Hotel California",
        artist: "Eagles",
        durationSeconds: 390,
      };
      const result = await resolveMonochromeFlacStream(track);
      assert.ok(result !== null);
      assert.ok(result.streamUrl.startsWith("https://tracks.monochrome.st/track/"));
      assert.ok(result.bitrateKbps >= 1411);
      assert.equal(result.bitDepth, 24);
      assert.ok(result.sampleRateHz >= 48000);
      assert.ok(result.badge.includes("FLAC"));
    });
  });

  describe("resolveTorrentLosslessDiscography scraper", () => {
    it("generates bit-perfect releases with valid magnet URIs and tracker info", () => {
      const track: MusicTrack = {
        id: "t-789",
        title: "Get Lucky",
        artist: "Daft Punk",
        album: "Random Access Memories",
        durationSeconds: 248,
      };
      const releases = resolveTorrentLosslessDiscography(track);
      assert.ok(releases.length >= 3);

      const vinylRel = releases.find((r) => r.edition.includes("Vinyl"));
      assert.ok(vinylRel);
      assert.ok(vinylRel.magnetUri.startsWith("magnet:?xt=urn:btih:"));
      assert.ok(vinylRel.debridStreamUrl.startsWith("debrid://stream/"));
      assert.equal(vinylRel.bitrateKbps, 5800);
      assert.ok(vinylRel.seeders > 0);
    });
  });

  describe("Audiophile DSP & Bauer Crossfeed", () => {
    it("calculates continuous Bauer crossfeed parameters across 0.0 - 1.0", () => {
      const offCrossfeed = getBauerCrossfeedConfig(0);
      assert.equal(offCrossfeed.cutoffHz, 700);
      assert.equal(offCrossfeed.feedDb, -60);

      const standardCrossfeed = getBauerCrossfeedConfig(0.5);
      assert.equal(standardCrossfeed.cutoffHz, 750);
      assert.ok(standardCrossfeed.feedDb < 0);
      assert.equal(standardCrossfeed.delayMs, 0.3);

      const maxCrossfeed = getBauerCrossfeedConfig(1.0);
      assert.equal(maxCrossfeed.cutoffHz, 1000);
      assert.equal(maxCrossfeed.feedDb, -3);
      assert.equal(maxCrossfeed.delayMs, 0.4);
    });

    it("has preset configurations for low, medium, and high acoustic stages", () => {
      assert.equal(BAUER_CROSSFEED_PRESETS.low.cutoffHz, 500);
      assert.equal(BAUER_CROSSFEED_PRESETS.medium.cutoffHz, 700);
      assert.equal(BAUER_CROSSFEED_PRESETS.high.cutoffHz, 1000);
    });

    it("calculates Mid/Side Stereo Widening matrix coefficients", () => {
      const monoMatrix = calculateStereoWideningMatrix(0.5);
      assert.equal(monoMatrix.sideGain, 0.67);
      assert.equal(monoMatrix.midGain, 1.33);

      const neutralMatrix = calculateStereoWideningMatrix(1.0);
      assert.equal(neutralMatrix.sideGain, 1.0);
      assert.equal(neutralMatrix.midGain, 1.0);

      const wideMatrix = calculateStereoWideningMatrix(1.5);
      assert.equal(wideMatrix.sideGain, 1.2);
      assert.equal(wideMatrix.midGain, 0.8);
    });

    it("includes flagship audiophile models in POPULAR_HEADPHONE_PROFILES", () => {
      const ids = POPULAR_HEADPHONE_PROFILES.map((p) => p.id);
      assert.ok(ids.includes("sennheiser-hd800s"));
      assert.ok(ids.includes("focal-clear"));
      assert.ok(ids.includes("hifiman-sundara"));
      assert.ok(ids.includes("audeze-lcd-x"));
      assert.ok(ids.includes("apple-airpods-pro-2"));
      assert.ok(ids.includes("moondrop-blessing-2"));
    });
  });

  describe("resolveLosslessAudioSources federation priority", () => {
    it("federates Monochrome Hi-Res FLAC and torrent sources first", async () => {
      const track: MusicTrack = {
        id: "t-fed",
        title: "Comfortably Numb",
        artist: "Pink Floyd",
        album: "The Wall",
        durationSeconds: 382,
      };

      const sources = await resolveLosslessAudioSources(track);
      assert.ok(sources.length >= 3);

      // Verify that lossless sources are sorted to the front
      assert.equal(sources[0].isLossless, true);
      assert.ok(sources[0].bitrateKbps >= 1411);

      const monochromeSrc = sources.find((s) => s.provider === "Monochrome Hi-Res FLAC");
      assert.ok(monochromeSrc);
      assert.equal(monochromeSrc.format, "FLAC");

      const tidalSrc = sources.find((s) => s.provider === "Tidal HiFi Master Proxy");
      assert.ok(tidalSrc);
      assert.equal(tidalSrc.bitrateKbps, 9216);

      const torrentSrc = sources.find((s) => s.provider === "Torrent Lossless Swarm");
      assert.ok(torrentSrc);
      assert.equal(torrentSrc.isLossless, true);
    });
  });
});
