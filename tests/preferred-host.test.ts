import assert from "node:assert/strict";
import test from "node:test";
import { matchedPreferredHost } from "../src/lib/streams/preferred-host.ts";

const hosts = ["pixeldrain.com"];

test("matches the URL host and its subdomains", () => {
  assert.equal(matchedPreferredHost({ url: "https://cdn.pixeldrain.com/api/file/x" }, hosts), "pixeldrain.com");
});

test("matches a host named only in the row label, case-insensitively", () => {
  const s = { url: "https://proxy.example.net/r/1", name: "PenguPlay 1080p HDHub4u · PixelDrain" };
  assert.equal(matchedPreferredHost(s, hosts), "pixeldrain.com");
});

test("does not match other hosts", () => {
  assert.equal(matchedPreferredHost({ url: "https://a.b/c", name: "HDHub4u · FSL" }, hosts), null);
  assert.equal(matchedPreferredHost({ name: "PixelDrain" }, []), null);
});
