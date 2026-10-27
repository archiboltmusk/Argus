import assert from "node:assert/strict";
import test from "node:test";
import { searchMediaServerMetas } from "../src/lib/media-server/search.ts";
import type { MediaServerConnection, MediaServerItem } from "../src/lib/media-server/types.ts";

function item(patch: Partial<MediaServerItem> & Pick<MediaServerItem, "id" | "connectionId" | "title">): MediaServerItem {
  return {
    libraryId: "movies",
    kind: "movie",
    identity: {},
    versions: [],
    updatedAt: 1,
    ...patch,
  };
}

function connection(id: string, enabled = true): MediaServerConnection {
  return { id, enabled, name: id, profileId: "profile-a" } as MediaServerConnection;
}

test("search includes matching titles found only in enabled home-server libraries", () => {
  const results = searchMediaServerMetas(
    "spirited away",
    [item({ id: "1", connectionId: "plex-a", title: "Spirited Away", year: 2001, identity: { tmdbId: 129 } })],
    [connection("plex-a")],
  );
  assert.equal(results.movies.length, 1);
  assert.equal(results.movies[0].id, "tmdb:movie:129");
  assert.equal(results.movies[0].releaseInfo, "2001");
});

test("search excludes items from disabled or unconfigured connections", () => {
  const items = [
    item({ id: "1", connectionId: "plex-a", title: "Arrival", identity: { tmdbId: 329865 } }),
    item({ id: "2", connectionId: "plex-disabled", title: "Arrival", identity: { tmdbId: 329865 } }),
  ];
  const results = searchMediaServerMetas("arrival", items, [connection("plex-a"), connection("plex-disabled", false)]);
  assert.equal(results.movies.length, 1);
  assert.equal(results.movies[0].id, "tmdb:movie:329865");
});

test("same identified title on two enabled servers is represented once", () => {
  const results = searchMediaServerMetas(
    "dune",
    [
      item({ id: "1", connectionId: "plex-a", title: "Dune", year: 2021, identity: { tmdbId: 438631 } }),
      item({ id: "2", connectionId: "jellyfin-b", title: "Dune", year: 2021, identity: { tmdbId: 438631 } }),
    ],
    [connection("plex-a"), connection("jellyfin-b")],
  );
  assert.equal(results.movies.length, 1);
});
