import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateUpdateManifest } from "../scripts/validate-update-manifest.mjs";
const ci = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
const desktop = readFileSync(new URL("../.github/workflows/desktop.yml", import.meta.url), "utf8");

test("one CI release stages Mac as a draft and calls the remaining desktop builders", () => {
  assert.match(ci, /draft: true/);
  assert.match(ci, /target_commitish: \$\{\{ github.sha \}\}/);
  assert.match(ci, /needs: \[publish\][\s\S]*uses: \.\/\.github\/workflows\/desktop.yml/);
  assert.doesNotMatch(ci, /--draft=false|--latest=true|gh release upload beta/);
  assert.match(desktop, /workflow_call:/);
  assert.doesNotMatch(desktop, /workflow_run:/);
});
test("publication requires both platform builds and all signed platform entries", () => {
  assert.match(desktop, /needs.windows.result == 'success' && needs.linux.result == 'success'/);
  const validation = desktop.indexOf("darwin-aarch64 windows-x86_64 linux-x86_64");
  const feedUpload = desktop.indexOf('gh release upload "$TAG" latest.json');
  const promote = desktop.indexOf("--draft=false --latest=true");
  const legacy = desktop.indexOf("gh release upload beta latest.json");
  assert.ok(validation > 0 && validation < feedUpload && feedUpload < promote && promote < legacy);
});
test("a missing or unsigned OS prevents promotion of the combined update feed", () => {
  const required = ["darwin-aarch64", "windows-x86_64", "linux-x86_64"];
  const platforms = Object.fromEntries(
    required.map((platform) => [
      platform,
      {
        signature: "signed",
        url: `https://github.com/archiboltmusk/Argus/releases/download/v3.17.5/${platform}`,
      },
    ]),
  );
  validateUpdateManifest({ version: "3.17.5", platforms }, { required });
  for (const platform of required) {
    const partial = { ...platforms };
    delete partial[platform];
    assert.throws(
      () => validateUpdateManifest({ version: "3.17.5", platforms: partial }, { required }),
      /missing/,
    );
    assert.throws(
      () =>
        validateUpdateManifest(
          {
            version: "3.17.5",
            platforms: { ...platforms, [platform]: { ...platforms[platform], signature: "" } },
          },
          { required },
        ),
      /signature/,
    );
  }
});
