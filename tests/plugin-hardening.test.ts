import assert from "node:assert/strict";
import test from "node:test";
import { assertPluginUrl } from "../src/lib/manga/plugins/host-http";
import { hostAllowed } from "../src/lib/manga/plugins/worker-host";
import { sha256Hex } from "../src/lib/streams/plugins/hash";
import { signedMessage } from "../src/lib/streams/plugins/trust";

test("plugin urls must be plain https on the public network", () => {
  assert.equal(assertPluginUrl("https://example.org/a?b=1"), "https://example.org/a?b=1");
  for (const bad of [
    "http://example.org/a",
    "https://user:pw@example.org/a",
    "https://127.0.0.1/a",
    "https://localhost/a",
    "https://192.168.1.4/a",
    "file:///etc/passwd",
    "ftp://example.org/a",
    "https://example.org/" + "a".repeat(5000),
  ]) {
    assert.throws(() => assertPluginUrl(bad), bad.slice(0, 40));
  }
});

test("a plugin reaches only the hosts it declared, subdomains included", () => {
  const declared = ["api.example.org", "*.cdn.example.net"];
  assert.equal(hostAllowed("https://api.example.org/x", declared), true);
  assert.equal(hostAllowed("https://v2.api.example.org/x", declared), true);
  assert.equal(hostAllowed("https://img.cdn.example.net/x", declared), true);
  assert.equal(hostAllowed("https://example.org/x", declared), false);
  assert.equal(hostAllowed("https://evilapi.example.org/x", declared), false);
  assert.equal(hostAllowed("https://api.example.org.evil.test/x", declared), false);
  assert.equal(hostAllowed("not a url", declared), false);
  assert.equal(hostAllowed("https://anything.test/x", []), true);
  assert.equal(hostAllowed("https://anything.test/x", undefined), true);
});

test("the signed line binds id, version and hash", () => {
  const a = signedMessage({ id: "p", version: "1", sha256: "ab" });
  assert.equal(a, "argus.plugin/1\np\n1\nab");
  assert.notEqual(a, signedMessage({ id: "p", version: "2", sha256: "ab" }));
  assert.notEqual(a, signedMessage({ id: "q", version: "1", sha256: "ab" }));
  assert.notEqual(a, signedMessage({ id: "p", version: "1", sha256: "ac" }));
});

test("sha256Hex matches the known digest", async () => {
  assert.equal(
    await sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("the reference plugin matches its manifest hash and parses a feed", async () => {
  const { readFileSync } = await import("node:fs");
  const { parseStreamRepoManifest } = await import("../src/lib/streams/plugins/manifest");
  const dir = new URL("../examples/plugins/json-catalog/", import.meta.url);
  const code = readFileSync(new URL("plugin.js", dir), "utf8");
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", dir), "utf8"));
  const parsed = parseStreamRepoManifest(manifest, "https://example.org/manifest.json");
  assert.equal(parsed.entries.length, 1);
  assert.equal(parsed.entries[0].sha256, await sha256Hex(code));
  assert.deepEqual(parsed.entries[0].hosts, ["feeds.example.org"]);

  let provider: { streams: (req: unknown) => Promise<unknown[]> } | null = null;
  const requested: string[] = [];
  const feed = {
    items: [
      {
        title: "Example Film",
        _dc: { "dc:creator": "A. Maker", "dc:date": "1968", "dc:identifier": "imdb:tt0000001" },
        attachments: [
          { url: "https://feeds.example.org/film.mp4", mime_type: "video/mp4" },
          { url: "http://feeds.example.org/insecure.mp4", mime_type: "video/mp4" },
          { url: "https://feeds.example.org/notes.pdf", mime_type: "application/pdf" },
        ],
      },
      { title: "Other", attachments: [{ url: "https://feeds.example.org/x.mp4", mime_type: "video/mp4" }] },
    ],
  };
  const argus = {
    register: (p: typeof provider) => {
      provider = p;
    },
    http: async (url: string) => {
      requested.push(url);
      return feed;
    },
  };
  new Function("argus", code)(argus);
  const byId = await provider!.streams({ imdbId: "tt0000001", title: "x", year: null });
  const byTitle = await provider!.streams({ imdbId: null, title: "example film", year: 1968 });
  const wrongYear = await provider!.streams({ imdbId: null, title: "Example Film", year: 1999 });
  assert.equal((byId as { url: string }[]).length, 1);
  assert.equal((byId as { url: string }[])[0].url, "https://feeds.example.org/film.mp4");
  assert.equal(byTitle.length, 1);
  assert.equal(wrongYear.length, 0);
  assert.deepEqual([...new Set(requested)], ["https://feeds.example.org/catalog.json"]);
});
