import { test } from "node:test";
import assert from "node:assert";
import {
  CURATED_BOOK_TORRENTS,
  inspectTorrentForBooks,
  createEBookFromTorrent,
} from "../src/lib/ebook/torrent-book-resolver";

test("Torrent Book Resolver: inspects magnet links and identifies book files", () => {
  const feynman = CURATED_BOOK_TORRENTS[0];
  assert.ok(feynman);
  assert.strictEqual(feynman.id, "feynman-lectures-physics");
  assert.strictEqual(feynman.format, "epub");

  // Inspect the curated Feynman lectures torrent magnet
  const meta = inspectTorrentForBooks(feynman.magnetUri);
  assert.ok(meta);
  assert.strictEqual(meta.infoHash, feynman.infoHash.toLowerCase());
  assert.ok(meta.files.length >= 1);
  assert.strictEqual(meta.files[0].isEpub, true);
  assert.ok(meta.files[0].streamUrl.includes(feynman.infoHash.toLowerCase()));
});

test("Torrent Book Resolver: handles custom raw 40-character hex infohash", () => {
  const rawHash = "4a5b6c7d8e9f0123456789abcdef0123456789ab";
  const meta = inspectTorrentForBooks(rawHash);
  assert.strictEqual(meta.infoHash, rawHash);
  assert.ok(meta.magnetUri.startsWith("magnet:?xt=urn:btih:"));
  assert.strictEqual(meta.files[0].extension, "epub");
});

test("Torrent Book Resolver: creates Argus EBook and chapter representations", () => {
  const sicp = CURATED_BOOK_TORRENTS.find((c) => c.id === "mit-sicp-classic")!;
  assert.ok(sicp);

  const meta = inspectTorrentForBooks(sicp.magnetUri);
  const { ebook, chapters } = createEBookFromTorrent(meta, 0);

  assert.ok(ebook.id.startsWith("torrent:"));
  assert.strictEqual(ebook.providerId, "torrent");
  assert.ok(chapters.length >= 1);
  assert.strictEqual(chapters[0].chapter, "1");
});

test("Curated Book Torrents: covers STEM, World Classics, and Philosophy", () => {
  assert.ok(CURATED_BOOK_TORRENTS.length >= 5);
  const categories = new Set(CURATED_BOOK_TORRENTS.map((c) => c.category));
  assert.ok(categories.has("science-tech"));
  assert.ok(categories.has("classics"));
  assert.ok(categories.has("philosophy"));
});
