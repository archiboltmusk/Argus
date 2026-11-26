import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { probeLocalWebCompanion } from "@/lib/stream-proxy";

const ROOT = process.cwd();

test("Homebrew Cask manifest defines arm64 DMG, SHA-256, and postflight quarantine fix", () => {
  const cask = readFileSync(resolve(ROOT, "Casks/argus.rb"), "utf8");
  assert.match(cask, /cask\s+"argus"/);
  assert.match(cask, /version\s+"\d+\.\d+\.\d+"/);
  assert.match(cask, /sha256\s+"[a-f0-9]{64}"/);
  assert.match(cask, /depends_on arch:\s*:arm64/);
  assert.match(cask, /xattr.*-cr/s);
  assert.match(cask, /codesign.*--force.*--deep.*--sign/s);
});

test("winget manifests are internally consistent", () => {
  const versionYaml = readFileSync(resolve(ROOT, "winget/archiboltmusk.Argus.yaml"), "utf8");
  const installerYaml = readFileSync(resolve(ROOT, "winget/archiboltmusk.Argus.installer.yaml"), "utf8");
  const localeYaml = readFileSync(resolve(ROOT, "winget/archiboltmusk.Argus.locale.en-US.yaml"), "utf8");

  const versionMatch = versionYaml.match(/^PackageVersion:\s*(\S+)/m);
  assert.ok(versionMatch, "version manifest must declare PackageVersion");
  const ver = versionMatch[1];

  assert.match(installerYaml, new RegExp(`^PackageVersion:\\s*${ver}$`, "m"));
  assert.match(localeYaml, new RegExp(`^PackageVersion:\\s*${ver}$`, "m"));
  assert.match(installerYaml, new RegExp(`v${ver}/Argus-windows-x64-setup\\.exe`));
  assert.match(installerYaml, /InstallerSha256:\s*[A-F0-9]{64}/);
});

test("probeLocalWebCompanion returns first healthy candidate and null when unreachable", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "http://localhost:8787/health") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;

    const found = await probeLocalWebCompanion(
      ["http://127.0.0.1:8787", "http://localhost:8787"],
      500,
    );
    assert.equal(found, "http://localhost:8787");

    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;

    const none = await probeLocalWebCompanion(["http://127.0.0.1:8787"], 500);
    assert.equal(none, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
