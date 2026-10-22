import assert from "node:assert/strict";
import test from "node:test";
import { buildSearchUrl, parseFeed, type Indexer } from "../src/lib/streams/indexer-feed.ts";

const tz: Indexer = { id: "a", name: "My Jackett", kind: "torznab", url: "http://localhost:9117/api/v2.0/indexers/all/results/torznab/", apiKey: "k", enabled: true };
const nz: Indexer = { ...tz, id: "b", name: "My NZB", kind: "newznab", url: "https://nzb.example/api" };

const TORZNAB = `<rss><channel>
<item><title>Movie.2020.1080p.BluRay.x264-GRP</title><link>http://x/dl</link>
<enclosure url="http://x/dl.torrent" length="1234" type="application/x-bittorrent"/>
<torznab:attr name="infohash" value="ABCDEF0123456789ABCDEF0123456789ABCDEF01"/>
<torznab:attr name="seeders" value="42"/><torznab:attr name="size" value="5000"/></item>
<item><title>No hash &amp; no magnet</title><link>http://x/y.torrent</link></item>
<item><title><![CDATA[Via Magnet]]></title><link>magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&amp;dn=x</link></item>
</channel></rss>`;

test("torznab items need a hash", () => {
  const s = parseFeed(TORZNAB, tz);
  assert.equal(s.length, 2);
  assert.equal(s[0].infoHash, "abcdef0123456789abcdef0123456789abcdef01");
  assert.match(s[0].title!, /👤 42/);
  assert.equal(s[0].behaviorHints?.videoSize, 5000);
  assert.equal(s[1].infoHash, "0123456789abcdef0123456789abcdef01234567");
  assert.equal(s[1].addonId, "indexer:a");
});

test("newznab items become nzb streams", () => {
  const xml = `<rss><channel><item><title>Show.S01E02.720p</title><enclosure url="https://nzb.example/get?id=1&amp;x=2" length="9"/></item></channel></rss>`;
  const s = parseFeed(xml, nz);
  assert.equal(s[0].nzbUrl, "https://nzb.example/get?id=1&x=2");
});

test("search urls carry id or text queries", () => {
  const q = { type: "series" as const, imdbId: "tt0903747", title: "Breaking Bad", season: 1, episode: 2 };
  const id = new URL(buildSearchUrl(tz, q, "id"));
  assert.equal(id.searchParams.get("t"), "tvsearch");
  assert.equal(id.searchParams.get("imdbid"), "tt0903747");
  assert.equal(id.searchParams.get("ep"), "2");
  const text = new URL(buildSearchUrl(nz, { type: "movie", imdbId: "", title: "Alien", year: 1979 }, "text"));
  assert.equal(text.searchParams.get("q"), "Alien 1979");
  assert.equal(text.pathname, "/api");
});
