import { test } from "node:test";
import assert from "node:assert/strict";
import type { Meta } from "../src/lib/cinemeta";

// 1. Visual Fine Art Gateway
import { MuseumGateway, CURATED_MASTERPIECES } from "../src/lib/art/museum-gateway";

// 2. OPDS Literature & Bionic Reading
import {
  OpdsLiteratureEngine,
  formatBionicReading,
  CURATED_CLASSIC_BOOKS,
} from "../src/lib/ebook/opds-catalog";

// 3. Universal Audio Federation
import {
  UniversalAudioBridge,
  type UniversalAudioTrack,
} from "../src/lib/music/universal-audio-bridge";

// 4. Cultural Constellation Engine
import { CulturalConstellationEngine } from "../src/lib/algo/cultural-constellation";

// --- 1. VISUAL FINE ART GATEWAY TESTS ---
test("MuseumGateway: curated collection, semantic search, and department filtering", () => {
  const gateway = new MuseumGateway();
  const allMasterpieces = gateway.getCuratedMasterpieces();
  assert.equal(allMasterpieces.length, CURATED_MASTERPIECES.length);
  assert.ok(allMasterpieces.some((m) => m.artist.includes("Gogh")));

  // Semantic search for 'diner' or 'solitude' should return Hopper's Nighthawks
  const hopperResults = gateway.searchArt({ concept: "diner solitude" });
  assert.ok(hopperResults.length > 0);
  assert.equal(hopperResults[0].artist, "Edward Hopper");
  assert.equal(hopperResults[0].title, "Nighthawks");

  // Semantic search for 'wave' should return Hokusai's Great Wave
  const hokusaiResults = gateway.searchArt({ concept: "wave fuji" });
  assert.ok(hokusaiResults.length > 0);
  assert.equal(hokusaiResults[0].artist, "Katsushika Hokusai");
});

// --- 2. OPDS LITERATURE & BIONIC READING TESTS ---
test("OpdsLiteratureEngine: Bionic Reading bolding, OPDS XML parsing, and catalog search", () => {
  // Test Bionic Reading bolding
  const plainText = "The psychological depth of classic Russian literature.";
  const bionic = formatBionicReading(plainText);
  assert.ok(bionic.includes("<b>Th</b>e"));
  assert.ok(bionic.includes("<b>psycho</b>logical"));
  assert.ok(bionic.includes("<b>dep</b>th"));

  const engine = new OpdsLiteratureEngine();
  const searchDostoevsky = engine.searchBooks("Dostoevsky");
  assert.ok(searchDostoevsky.length >= 2);
  assert.ok(searchDostoevsky.some((b) => b.title === "Crime and Punishment"));

  // Test OPDS Atom XML parser
  const sampleOpdsXml = `
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <id>urn:book:123</id>
        <title>The Trial</title>
        <author><name>Franz Kafka</name></author>
        <summary>Josef K. is arrested and prosecuted by a remote, inaccessible authority.</summary>
        <link type="application/epub+zip" href="https://example.org/the-trial.epub"/>
      </entry>
    </feed>
  `;
  const parsed = engine.parseOpdsXml(sampleOpdsXml, "custom");
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, "The Trial");
  assert.equal(parsed[0].authors[0], "Franz Kafka");
  assert.equal(parsed[0].downloadUrl, "https://example.org/the-trial.epub");
});

// --- 3. UNIVERSAL AUDIO FEDERATION TESTS ---
test("UniversalAudioBridge: cross-platform playlist composition, search, and lossless ratio calculation", () => {
  const bridge = new UniversalAudioBridge();
  const playlist = bridge.createPlaylist("Late Night Polymath Session", "Mixed FLAC & Spotify");

  const track1: UniversalAudioTrack = {
    id: "flac-1",
    title: "Gymnopédie No. 1",
    artist: "Erik Satie",
    durationSec: 210,
    source: "local-flac",
    format: "flac",
    isLossless: true,
  };

  const track2: UniversalAudioTrack = {
    id: "sp-1",
    title: "So What",
    artist: "Miles Davis",
    durationSec: 562,
    source: "spotify",
    format: "aac",
    isLossless: false,
  };

  bridge.addTrackToPlaylist(playlist.id, track1);
  bridge.addTrackToPlaylist(playlist.id, track2);

  const retrieved = bridge.getPlaylist(playlist.id);
  assert.ok(retrieved);
  assert.equal(retrieved!.tracks.length, 2);

  // 1 of 2 tracks is lossless -> 0.5 ratio
  const ratio = bridge.getPlaylistLosslessRatio(playlist.id);
  assert.equal(ratio, 0.5);

  const searchResults = bridge.searchTracks("Miles Davis");
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].title, "So What");
});

// --- 4. CULTURAL CONSTELLATION TESTS ---
test("CulturalConstellationEngine: cross-medium synthesis links film to literature, museum art, and musical score", () => {
  const engine = new CulturalConstellationEngine();

  const mockFilm: Meta = {
    id: "tt-tarkovsky",
    type: "movie",
    name: "Sacrifice & Solitude",
    genres: ["Drama", "Mystery"],
    description: "A dark, intense existential examination of conscience and guilt in a remote village.",
  };

  const constellation = engine.synthesizeConstellation(mockFilm);
  assert.ok(constellation);
  assert.ok(constellation.literaryMatch);
  assert.ok(constellation.visualArtMatch);
  assert.ok(constellation.musicalTheme);

  // High complexity existential drama should link with classical literary themes
  assert.ok(constellation.literaryMatch!.affinityScore >= 70);
  assert.ok(constellation.visualArtMatch!.artwork.title.length > 0);
  assert.ok(constellation.musicalTheme!.composerOrArtist.length > 0);
});
