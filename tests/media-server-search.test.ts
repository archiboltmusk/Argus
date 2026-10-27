import assert from "node:assert/strict";
import test from "node:test";
import { searchMediaServerMetas } from "../src/lib/media-server/search.ts";
import type { MediaServerConnection, MediaServerItem } from "../src/lib/media-server/types.ts";

function item(patch: Partial<MediaServerItem> = {}): MediaServerItem {
  return {
    id: "one",
    connectionId: "plex-a",
    libraryId: "movies",
    kind: "movie",
    title: "Arrival",
    identity: { tmdbId: 329865 },
    versions: [],
    updatedAt: 1,
    ...patch,
  };
}

function connection(id = "plex-a", enabled = true): MediaServerConnection {
  return { id, enabled, name: id, profileId: "profile-a" } as MediaServerConnection;
}

test("search finds indexed server titles without requiring a catalog result", () => {
  const result = searchMediaServerMetas("arrival", [item({ year: 2016 })], [connection()]);
  assert.deepEqual(result, {
    movies: [{ id: "tmdb:movie:329865", type: "movie", name: "Arrival", releaseInfo: "2016" }],
    series: [],
  });
});

test("search excludes disabled, unconfigured and other-profile connection items", () => {
  const items = [
    item(),
    item({ id: "disabled", connectionId: "disabled", title: "Arrival disabled", identity: { tmdbId: 2 } }),
    item({ id: "foreign", connectionId: "profile-b-server", title: "Arrival private", identity: { tmdbId: 3 } }),
  ];
  const result = searchMediaServerMetas("arrival", items, [connection(), connection("disabled", false)]);
  assert.deepEqual(result.movies.map(({ name }) => name), ["Arrival"]);
  assert.deepEqual(searchMediaServerMetas("arrival", items, []), { movies: [], series: [] });
});

test("search normalizes accents, punctuation and whitespace without dropping non-Latin titles", () => {
  const items = [item({ title: "Amélie:  Le Fabuleux" }), item({ id: "ja", title: "千と千尋の神隠し", identity: { tmdbId: 129 } })];
  assert.equal(searchMediaServerMetas("amelie le", items, [connection()]).movies.length, 1);
  assert.equal(searchMediaServerMetas("千と千尋", items, [connection()]).movies[0].id, "tmdb:movie:129");
  assert.deepEqual(searchMediaServerMetas("?!", items, [connection()]), { movies: [], series: [] });
});

test("same identity on multiple servers groups once while movie and series identities stay distinct", () => {
  const result = searchMediaServerMetas("arrival", [
    item(),
    item({ id: "copy", connectionId: "jellyfin-b" }),
    item({ id: "series", kind: "series" }),
  ], [connection(), connection("jellyfin-b")]);
  assert.equal(result.movies.length, 1);
  assert.deepEqual(result.series.map(({ id }) => id), ["tmdb:tv:329865"]);
});

test("IMDb case variants group once and preserve distinct media kinds", () => {
  const result = searchMediaServerMetas("arrival", [
    item({ identity: { imdbId: "TT2543164" } }),
    item({ id: "copy", identity: { imdbId: "tt2543164" } }),
    item({ id: "series", kind: "series", identity: { imdbId: "tt2543164" } }),
  ], [connection()]);
  assert.deepEqual(result.movies.map(({ id }) => id), ["tt2543164"]);
  assert.deepEqual(result.series.map(({ id }) => id), ["tt2543164"]);
});

test("ID-less remakes from different years and unknown-year copies stay separate", () => {
  const result = searchMediaServerMetas("return", [
    item({ id: "old", title: "The Return", year: 1980, identity: {} }),
    item({ id: "new", title: "The Return", year: 2020, identity: {} }),
    item({ id: "unknown-a", title: "The Return", identity: {} }),
    item({ id: "unknown-b", title: "The Return", identity: {} }),
  ], [connection()]);
  assert.equal(result.movies.length, 4);
  assert.equal(new Set(result.movies.map(({ id }) => id)).size, 4);
});

test("ID-less same-year title variants group once", () => {
  const result = searchMediaServerMetas("return", [
    item({ title: "The   Return", year: 2020, identity: {} }),
    item({ id: "copy", title: "the return", year: 2020, identity: {} }),
  ], [connection()]);
  assert.equal(result.movies.length, 1);
});

test("episodes use parent series identity and seasons do not appear as separate titles", () => {
  const result = searchMediaServerMetas("arrival", [
    item({ id: "series", kind: "series", identity: { tvdbId: 42 } }),
    item({ id: "season", kind: "season", parentId: "series" }),
    item({ id: "episode", title: "Pilot", kind: "episode", parentId: "series", identity: { season: 1, episode: 1 } }),
  ], [connection()]);
  assert.equal(result.movies.length, 0);
  assert.deepEqual(result.series.map(({ id }) => id), ["tvdb:series:42"]);
});

test("search results are deterministic metadata without server credentials or authenticated artwork", () => {
  const items = [item({ posterPath: "https://private.test/poster?token=secret" })];
  const connections = [{ ...connection(), origin: "https://user:password@private.test", userId: "private-user" }];
  const first = searchMediaServerMetas("arrival", items, connections);
  assert.deepEqual(searchMediaServerMetas("arrival", items, connections), first);
  assert.doesNotMatch(JSON.stringify(first), /secret|password|private-user|private\.test/);
});
