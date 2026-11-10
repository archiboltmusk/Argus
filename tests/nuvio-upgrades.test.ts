import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  saveLangAudioDelay,
  loadLangAudioDelay,
  getNightModeWebAudioFilters,
  buildNightModeMpvFilter,
} from "../src/lib/player/audio-night-mode.ts";
import {
  jellyfinItemToMeta,
  jellyfinItemToStream,
} from "../src/lib/jellyfin/jellyfin-client.ts";
import type { JellyfinItem } from "../src/lib/jellyfin/jellyfin-types.ts";
import { mdblistListToHomeRow } from "../src/lib/mdblist/mdblist-account.ts";
import type { MdblistUserList } from "../src/lib/mdblist/mdblist-account.ts";
import {
  watchPartyJoinUrl,
  evaluateWatchPartyDrift,
} from "../src/lib/together/watch-party-qr.ts";
import {
  storePreloadedNextStream,
  consumePreloadedNextStream,
  clearPreloadedNextStreams,
} from "../src/lib/player/zero-wait-binge.ts";

describe("Nuvio Upgrades Suite", () => {
  describe("Audio Night Mode & Per-Language Audio Delay", () => {
    it("stores and retrieves per-language audio delay in localStorage", () => {
      saveLangAudioDelay("jpn", 150);
      assert.equal(loadLangAudioDelay("jpn"), 150);

      // Falls back to 0 for unknown languages
      assert.equal(loadLangAudioDelay("unknown_xyz"), 0);
    });

    it("generates correct Web Audio DRC and mpv vocal normalization filters", () => {
      const webAudioFilters = getNightModeWebAudioFilters();
      assert.equal(webAudioFilters.compressor.threshold, -24);
      assert.equal(webAudioFilters.compressor.ratio, 12);
      assert.equal(webAudioFilters.vocalBoost.frequency, 2400);

      const mpvFilter = buildNightModeMpvFilter();
      assert.match(mpvFilter, /dynaudnorm/);
      assert.match(mpvFilter, /equalizer/);
    });
  });

  describe("Jellyfin & Emby Integration", () => {
    const mockMovie: JellyfinItem = {
      Id: "jf-movie-123",
      Name: "Inception",
      Type: "Movie",
      ProductionYear: 2010,
      Overview: "A thief who steals corporate secrets through dream-sharing technology.",
      CommunityRating: 8.8,
      OfficialRating: "PG-13",
      Genres: ["Action", "Sci-Fi"],
      RunTimeTicks: 88800000000, // 8880 seconds -> 148 mins
      UserData: {
        PlaybackPositionTicks: 44400000000,
        Played: false,
        IsFavorite: true,
      },
    };

    it("converts Jellyfin movie item to Argus Meta object", () => {
      const meta = jellyfinItemToMeta(mockMovie, "https://jellyfin.local");
      assert.equal(meta.id, "jellyfin:jf-movie-123");
      assert.equal(meta.name, "Inception");
      assert.equal(meta.type, "movie");
      assert.equal(meta.releaseInfo, "2010");
      assert.equal(meta.imdbRating, "8.8");
      assert.equal(meta.runtime, "148 min");
      assert.ok(meta.poster?.includes("https://jellyfin.local/Items/jf-movie-123/Images/Primary"));
    });

    it("generates direct stream object with Jellyfin auth token header", () => {
      const stream = jellyfinItemToStream(mockMovie, "https://jellyfin.local", "dummy-api-key");
      assert.equal(stream.name, "Jellyfin Direct Play");
      assert.ok(stream.url.includes("https://jellyfin.local/Videos/jf-movie-123/stream"));
      assert.ok(stream.url.includes("api_key=dummy-api-key"));
    });
  });

  describe("MDBList Dynamic User Shelf Integration", () => {
    it("converts user MDBList into Argus HomeRow shelf", () => {
      const list: MdblistUserList = {
        id: 42,
        name: "Top Sci-Fi Mind-Benders",
        slug: "top-sci-fi-mind-benders",
        items: 15,
        likes: 120,
        user_name: "Cinephile99",
      };

      const row = mdblistListToHomeRow(list);
      assert.equal(row.key, "mdblist-list-42");
      assert.equal(row.name, "Top Sci-Fi Mind-Benders");
    });
  });

  describe("Watch Party QR Code & Drift Compensation", () => {
    it("builds a join URL containing room and peer secret parameters", () => {
      const url = watchPartyJoinUrl("room-9876", "secret-token-123");
      assert.match(url, /partyRoom=room-9876/);
      assert.match(url, /partyKey=secret-token-123/);
    });

    it("evaluates drift and determines correct correction action", () => {
      // < 0.25s is negligible
      const inSync = evaluateWatchPartyDrift(100.1, 100.0);
      assert.equal(inSync.action, "in-sync");

      // Small drift (0.25s to 2s) adjusts playback rate
      // Local behind host (host=101, local=100) -> speed up to catch up
      const behindHost = evaluateWatchPartyDrift(101.0, 100.0);
      assert.equal(behindHost.action, "rate-adjust");
      assert.ok(behindHost.targetPlaybackRate > 1.0);

      // Local ahead of host (host=100, local=101) -> slow down
      const aheadOfHost = evaluateWatchPartyDrift(100.0, 101.0);
      assert.equal(aheadOfHost.action, "rate-adjust");
      assert.ok(aheadOfHost.targetPlaybackRate < 1.0);

      // Large drift (> 2s) triggers hard seek
      const largeDrift = evaluateWatchPartyDrift(105.0, 100.0);
      assert.equal(largeDrift.action, "seek");
      assert.equal(largeDrift.seekTarget, 105.0);
    });
  });

  describe("Zero-Wait Binge Next Episode Cache", () => {
    it("stores and consumes preloaded next episode streams", () => {
      clearPreloadedNextStreams();
      assert.equal(consumePreloadedNextStream("show-1", 2), null);

      storePreloadedNextStream("show-1", 2, {
        name: "Preloaded Fast CDN",
        url: "https://cdn.stream/ep2.mp4",
      });

      const retrieved = consumePreloadedNextStream("show-1", 2);
      assert.ok(retrieved);
      assert.equal(retrieved.name, "Preloaded Fast CDN");

      // Consuming invalidates or returns cached stream
      assert.equal(consumePreloadedNextStream("show-1", 3), null);
    });
  });
});
