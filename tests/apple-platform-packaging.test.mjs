import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applePlatform, validateAppleBuildOutput } from "../scripts/apple-platforms.mjs";

test("Apple targets use their own SDK, ABI and device family", () => {
  assert.equal(applePlatform("tvos").sdk, "appletvos");
  assert.deepEqual(applePlatform("tvos").deviceFamily, [3]);
  assert.equal(applePlatform("watchos").target, "arm64_32-apple-watchos9.0");
  assert.deepEqual(applePlatform("watchos").deviceFamily, [4]);
  assert.equal(applePlatform("visionos").sdk, "xros");
  assert.equal(applePlatform("visionos").target, "arm64-apple-xros1.0");
  assert.deepEqual(applePlatform("visionos").deviceFamily, [7]);
  assert.throws(() => applePlatform("unknown"), /Unsupported/);
});
test("Apple compiler jobs stay on Mac and previews cannot attach to stable releases", () => {
  const workflow = readFileSync(new URL("../.github/workflows/apple.yml", import.meta.url), "utf8");
  for (const platform of ["ios", "tvos", "visionos", "watchos"]) {
    const section = workflow.slice(workflow.indexOf(`  ${platform}:`)).split(/\n  [a-z]+:/)[0];
    assert.match(section, /runs-on: macos-15/);
  }
  assert.match(workflow, /TAG="beta"/);
  assert.doesNotMatch(workflow, /TAG="\$\{\{ github.ref_name/);
  assert.match(workflow, /Developer bootstrap - native UI not implemented/);
  const packager = readFileSync(
    new URL("../scripts/package-apple-app.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(packager, /falling back to iphoneos target/);
  assert.match(packager, /Apple packaging requires macOS/);
});

test("an iPhone executable cannot masquerade as a Watch or Vision executable", () => {
  validateAppleBuildOutput("platform WATCHOS\nminos 9.0", "watchos");
  assert.throws(
    () => validateAppleBuildOutput("platform IOS\nminos 16.0", "watchos"),
    /Wrong binary platform/,
  );
  assert.throws(
    () => validateAppleBuildOutput("platform IOS\nminos 16.0", "visionos"),
    /Wrong binary platform/,
  );
  assert.throws(() => validateAppleBuildOutput("", "tvos"), /Wrong binary platform/);
});
