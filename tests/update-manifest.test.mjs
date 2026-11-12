import assert from "node:assert/strict";
import test from "node:test";
import { validateUpdateManifest } from "../scripts/validate-update-manifest.mjs";

const entry = {
  signature: "signed-update",
  url: "https://github.com/example/app/releases/download/v3.17.1/Argus.app.tar.gz",
};
const manifest = () => ({ version: "3.17.1", platforms: { "darwin-aarch64": { ...entry } } });

test("rejects the versionless desktop fallback published to v3.17.1", () => {
  assert.throws(
    () => validateUpdateManifest({ platforms: { "windows-x86_64": entry } }),
    /version/,
  );
});
test("requires a matching release and the Mac platform before desktop merges", () => {
  assert.doesNotThrow(() =>
    validateUpdateManifest(manifest(), { version: "3.17.1", required: ["darwin-aarch64"] }),
  );
  assert.throws(() => validateUpdateManifest(manifest(), { version: "3.17.2" }), /match/);
  assert.throws(
    () =>
      validateUpdateManifest(
        { version: "3.17.1", platforms: { "windows-x86_64": entry } },
        { required: ["darwin-aarch64"] },
      ),
    /darwin/,
  );
});
test("rejects missing signatures, empty platforms and unsafe URLs", () => {
  assert.throws(() => validateUpdateManifest({ version: "3.17.1", platforms: {} }), /platforms/);
  const unsigned = manifest();
  unsigned.platforms["darwin-aarch64"].signature = " ";
  assert.throws(() => validateUpdateManifest(unsigned), /signature/);
  for (const url of [
    "http://example.com/update",
    "https://user:password@example.com/update",
    "file:///update",
  ]) {
    const invalid = manifest();
    invalid.platforms["darwin-aarch64"].url = url;
    assert.throws(() => validateUpdateManifest(invalid), /unsafe/);
  }
});
