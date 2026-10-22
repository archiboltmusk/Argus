import assert from "node:assert/strict";
import test from "node:test";
import { crc32, deflateRawSync } from "node:zlib";
import {
  openEpub,
  htmlToText,
  locateProgress,
  overallProgress,
  resolveEpubPath,
  parseNavToc,
  parseNcxToc,
} from "../src/lib/ebook/epub.ts";
import {
  bookId,
  filterBooks,
  formatFromPath,
  normalizeBooks,
  normalizePrefs,
  shelfOf,
  sortBooks,
  type BookRecord,
} from "../src/lib/ebook/books-core.ts";
import { parseXml, findAll } from "../src/lib/ebook/xml.ts";

function zip(files: Record<string, string>, stored = false): Uint8Array {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text);
    const body = stored ? data : deflateRawSync(data);
    const nameBuf = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(stored ? 0 : 8, 8);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    parts.push(local, nameBuf, body);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(stored ? 0 : 8, 10);
    cd.writeUInt32LE(crc32(data), 16);
    cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += 30 + nameBuf.length + body.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...parts, cdBuf, end]));
}

const OPF = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Tom &amp; Jerry</dc:title>
    <dc:creator>A. Writer</dc:creator><dc:creator>B. Editor</dc:creator>
    <dc:language>en</dc:language>
    <meta name="cover" content="cov"/>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="c1" href="text/one.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="text/two%20b.xhtml" media-type="application/xhtml+xml"/>
    <item id="cov" href="img/cover.jpg" media-type="image/jpeg"/>
  </manifest>
  <spine><itemref idref="c1"/><itemref idref="c2"/><itemref idref="nav" linear="no"/></spine>
</package>`;
const NAV = `<html xmlns:epub="x"><body><nav epub:type="toc"><ol>
  <li><a href="text/one.xhtml">One</a><ol><li><a href="text/one.xhtml#s1">Section</a></li></ol></li>
  <li><a href="text/two%20b.xhtml">Two</a></li></ol></nav></body></html>`;

test("zip handles deflate and stored entries", async () => {
  for (const stored of [false, true]) {
    const book = await openEpub(
      zip(
        {
          "META-INF/container.xml": `<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
          "OEBPS/content.opf": OPF,
          "OEBPS/nav.xhtml": NAV,
          "OEBPS/text/one.xhtml": "<html><body><p>Hello</p></body></html>",
          "OEBPS/text/two b.xhtml": "<html><body><p>World wide</p></body></html>",
          "OEBPS/img/cover.jpg": "x",
        },
        stored,
      ),
    );
    assert.equal(book.meta.title, "Tom & Jerry");
    assert.equal(book.meta.author, "A. Writer, B. Editor");
    assert.deepEqual(
      book.spine.map((s) => s.path),
      ["OEBPS/text/one.xhtml", "OEBPS/text/two b.xhtml"],
    );
    assert.equal(book.coverPath, "OEBPS/img/cover.jpg");
    assert.equal(book.toc.length, 2);
    assert.equal(book.toc[0].children[0].href, "OEBPS/text/one.xhtml#s1");
    assert.equal(
      await book.zip.readText("oebps/TEXT/one.xhtml"),
      "<html><body><p>Hello</p></body></html>",
    );
  }
});

test("openEpub rejects non-epub input", async () => {
  await assert.rejects(openEpub(new Uint8Array([1, 2, 3])));
});

test("path resolution", () => {
  assert.equal(resolveEpubPath("OEBPS/text/", "../img/a%20b.png#x"), "OEBPS/img/a b.png");
  assert.equal(resolveEpubPath("OEBPS/", "/abs/x.css"), "abs/x.css");
  assert.equal(resolveEpubPath("a/", "../../../x"), "x");
});

test("ncx toc", () => {
  const ncx = `<ncx><navMap><navPoint id="a"><navLabel><text>Intro</text></navLabel><content src="a.xhtml"/>
    <navPoint id="b"><navLabel><text>Deep</text></navLabel><content src="b.xhtml#z"/></navPoint></navPoint></navMap></ncx>`;
  const toc = parseNcxToc(ncx, "OEBPS/toc.ncx");
  assert.equal(toc[0].label, "Intro");
  assert.equal(toc[0].children[0].href, "OEBPS/b.xhtml#z");
  assert.deepEqual(parseNavToc("<nav/>", "n.xhtml"), []);
});

test("progress mapping round-trips", () => {
  const b = { spine: [{}, {}, {}] as never[], spineStart: [0, 0.2, 0.5] };
  assert.equal(overallProgress(b, 1, 0.5), 0.35);
  const mid = locateProgress(b, 0.35);
  assert.equal(mid.chapter, 1);
  assert.ok(Math.abs(mid.fraction - 0.5) < 1e-9);
  assert.deepEqual(locateProgress(b, 1), { chapter: 2, fraction: 1 });
  assert.equal(overallProgress(b, 9, 2), 1);
});

test("htmlToText strips markup", () => {
  assert.equal(
    htmlToText(
      "<html><head><style>p{}</style></head><body><p>A &amp; <b>B</b></p><script>x()</script></body></html>",
    ),
    "A & B",
  );
});

test("xml parser handles namespaces, CDATA and self-closing tags", () => {
  const root = parseXml(
    `<?xml version="1.0"?><!-- c --><a:r xmlns:a="u"><a:i x:k="v" k2='w'/><a:t><![CDATA[<raw>]]></a:t></a:r>`,
  );
  assert.equal(root.name, "r");
  assert.equal(findAll(root, "i")[0].attrs.k, "v");
  assert.equal(findAll(root, "i")[0].attrs.k2, "w");
  assert.equal(findAll(root, "t")[0].text, "<raw>");
});

const rec = (over: Partial<BookRecord>): BookRecord => ({
  id: "x",
  path: "/a/b.epub",
  format: "epub",
  title: "T",
  author: "",
  addedAt: 1,
  openedAt: 0,
  progress: 0,
  chapter: 0,
  fraction: 0,
  hasCover: false,
  bookmarks: [],
  ...over,
});

test("library sorting, shelves and search", () => {
  const books = [
    rec({ title: "Beta", author: "Zed", openedAt: 5, progress: 0.5 }),
    rec({ title: "alpha", author: "", addedAt: 9, progress: 1 }),
    rec({ title: "Gamma 10", author: "Amy" }),
    rec({ title: "Gamma 2", author: "Amy", openedAt: 7 }),
  ];
  assert.deepEqual(
    sortBooks(books, "title").map((b) => b.title),
    ["alpha", "Beta", "Gamma 2", "Gamma 10"],
  );
  assert.deepEqual(sortBooks(books, "recent").map((b) => b.title)[0], "Gamma 2");
  assert.equal(sortBooks(books, "author")[3].title, "alpha");
  assert.equal(sortBooks(books, "added")[0].title, "alpha");
  assert.deepEqual(
    filterBooks(books, "finished", "").map((b) => b.title),
    ["alpha"],
  );
  assert.deepEqual(
    filterBooks(books, "reading", "").map((b) => b.title),
    ["Beta"],
  );
  assert.equal(filterBooks(books, "all", "amy").length, 2);
  assert.equal(shelfOf({ progress: 0 }), "unread");
});

test("normalizers drop junk and clamp", () => {
  assert.equal(formatFromPath("/x/Y.PDF"), "pdf");
  assert.equal(formatFromPath("/x/y.txt"), null);
  assert.equal(bookId("/a"), bookId("/a"));
  assert.notEqual(bookId("/a"), bookId("/b"));
  const out = normalizeBooks([
    null,
    { path: "/x.txt" },
    { path: "/ok/one_two.epub", progress: 7 },
    { path: "/ok/one_two.epub" },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].title, "one two");
  assert.equal(out[0].progress, 1);
  assert.equal(normalizePrefs({ fontSize: 999, theme: "nope" }).fontSize, 36);
  assert.equal(normalizePrefs(null).theme, "dark");
});
