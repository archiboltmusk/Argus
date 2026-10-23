import assert from "node:assert/strict";
import test from "node:test";
import {
  authHeaders,
  navigationLink,
  opdsBook,
  openSearchTemplate,
  parseOpds2,
  parseOpdsAtom,
  parseOpdsFeed,
  searchUrl,
  validateOpdsUrl,
} from "../src/lib/ebook/opds.ts";

const BASE = "https://books.example/opds/";

const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE feed [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/terms/">
  <title>Catalog &amp; More</title>
  <link rel="search" type="application/atom+xml" href="/opds/search?q={searchTerms}"/>
  <link rel="next" type="application/atom+xml" href="?page=2"/>
  <entry>
    <id>urn:book:1</id>
    <title>Dracula</title>
    <author><name>Bram Stoker</name></author>
    <summary><![CDATA[A <b>vampire</b> tale]]></summary>
    <category term="horror" label="Horror"/>
    <link rel="http://opds-spec.org/image" type="image/jpeg" href="/c/1.jpg"/>
    <link rel="http://opds-spec.org/acquisition/open-access" type="application/pdf" href="/b/1.pdf"/>
    <link rel="http://opds-spec.org/acquisition/open-access" type="application/epub+zip" href="/b/1.epub"/>
  </entry>
  <entry>
    <id>urn:nav:1</id>
    <title>Popular</title>
    <link rel="http://opds-spec.org/sort/popular" type="application/atom+xml;profile=opds-catalog;kind=acquisition" href="popular.atom"/>
  </entry>
  <entry>
    <id>urn:book:2</id>
    <title>PDF only</title>
    <link rel="http://opds-spec.org/acquisition" type="application/pdf" href="/b/2.pdf"/>
    <link rel="http://opds-spec.org/acquisition" type="application/epub+zip" href="file:///etc/passwd"/>
  </entry>
</feed>`;

test("parses Atom entries, links and pagination", () => {
  const feed = parseOpdsAtom(ATOM, BASE);
  assert.equal(feed.title, "Catalog & More");
  assert.equal(feed.next, "https://books.example/opds/?page=2");
  assert.equal(feed.entries.length, 3);
  const book = opdsBook(feed.entries[0]);
  assert.equal(book?.epubUrl, "https://books.example/b/1.epub");
  assert.equal(book?.cover, "https://books.example/c/1.jpg");
  assert.deepEqual(book?.authors, ["Bram Stoker"]);
  assert.equal(book?.summary, "A <b>vampire</b> tale");
  assert.deepEqual(book?.categories, ["Horror"]);
  assert.equal(
    searchUrl(feed.search!, "war & peace"),
    "https://books.example/opds/search?q=war%20%26%20peace",
  );
});

test("navigation entries lead to feeds and file: links are dropped", () => {
  const feed = parseOpdsAtom(ATOM, BASE);
  assert.equal(navigationLink(feed.entries[1])?.href, "https://books.example/opds/popular.atom");
  assert.equal(opdsBook(feed.entries[1]), null);
  assert.equal(opdsBook(feed.entries[2]), null);
});

test("parses OPDS 2.0 publications and navigation", () => {
  const feed = parseOpdsFeed(
    JSON.stringify({
      metadata: { title: "JSON catalog" },
      links: [
        { rel: "next", href: "/p2", type: "application/opds+json" },
        { rel: "search", href: "/s{?query}", type: "application/opds+json", templated: true },
      ],
      navigation: [{ href: "/new", title: "New", type: "application/opds+json" }],
      publications: [
        {
          metadata: { title: "Emma", author: [{ name: "Jane Austen" }], identifier: "id1" },
          links: [
            {
              rel: "http://opds-spec.org/acquisition/open-access",
              href: "/e.epub",
              type: "application/epub+zip",
            },
          ],
          images: [{ href: "/e.jpg", type: "image/jpeg" }],
        },
      ],
    }),
    BASE,
  );
  assert.equal(feed.entries.length, 2);
  assert.equal(navigationLink(feed.entries[0])?.href, "https://books.example/new");
  assert.equal(opdsBook(feed.entries[1])?.epubUrl, "https://books.example/e.epub");
  assert.deepEqual(feed.entries[1].authors, ["Jane Austen"]);
  assert.equal(searchUrl(feed.search!, "emma"), "https://books.example/s?query=emma");
});

test("reads the Atom template from an OpenSearch description", () => {
  const xml = `<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/"><Url type="text/html" template="/h?q={searchTerms}"/><Url type="application/atom+xml" template="/a?q={searchTerms}"/></OpenSearchDescription>`;
  assert.equal(searchUrl(openSearchTemplate(xml, BASE)!, "x"), "https://books.example/a?q=x");
});

test("credentials are sent only to the catalog origin", () => {
  const connection = {
    url: "https://books.example/opds",
    auth: { username: "me", password: "pw", apiKey: "k" },
  };
  const same = authHeaders(connection, "https://books.example/b/1.epub");
  assert.equal(same.Authorization, `Basic ${Buffer.from("me:pw").toString("base64")}`);
  assert.equal(same["X-API-Key"], "k");
  assert.deepEqual(authHeaders(connection, "https://cdn.other/b/1.epub"), {});
  assert.deepEqual(authHeaders({ url: connection.url }, connection.url), {});
});

test("feed URL validation", () => {
  assert.equal(
    validateOpdsUrl(" https://standardebooks.org/feeds/opds "),
    "https://standardebooks.org/feeds/opds",
  );
  assert.equal(validateOpdsUrl("http://192.168.1.5:8083/opds"), "http://192.168.1.5:8083/opds");
  assert.throws(() => validateOpdsUrl("http://standardebooks.org/feeds/opds"));
  assert.throws(() => validateOpdsUrl("file:///etc/passwd"));
  assert.throws(() => validateOpdsUrl("https://user:pw@example.com/opds"));
});

test("rejects non-catalog XML", () => {
  assert.throws(() => parseOpdsAtom("<html><body/></html>", BASE));
});

test("link picker accepts epub by extension and skips other formats", () => {
  const feed = parseOpdsAtom(
    `<feed xmlns="http://www.w3.org/2005/Atom">
      <entry><title>A</title><link rel="http://opds-spec.org/acquisition" type="application/octet-stream" href="/dl/a.epub"/></entry>
      <entry><title>B</title><link rel="http://opds-spec.org/acquisition" href="/dl/b.epub"/></entry>
      <entry><title>C</title><link rel="http://opds-spec.org/acquisition" type="application/x-mobipocket-ebook" href="/dl/c.mobi"/></entry>
      <entry><title>D</title><link rel="http://opds-spec.org/acquisition" type="application/octet-stream" href="/dl/d.pdf"/></entry>
    </feed>`,
    BASE,
  );
  assert.deepEqual(
    feed.entries.map((entry) => opdsBook(entry)?.epubUrl),
    ["https://books.example/dl/a.epub", "https://books.example/dl/b.epub", undefined, undefined],
  );
});
