import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const context = { URL };
runInNewContext(readFileSync(new URL("../docs/downloads.js", import.meta.url), "utf8"), context);
const { selectAsset, detectPlatform } = context.ArgusDownloads;
const asset = (name, tag = "v3.17.5") => ({
  name,
  browser_download_url: `https://github.com/archiboltmusk/Argus/releases/download/${tag}/${name}`,
});
const release = {
  tag_name: "v3.17.5",
  assets: [
    asset("Argus-AppleWatch-watchOS.ipa"),
    asset("Argus-AndroidTV-arm64.apk"),
    asset("Argus-android-arm64.apk"),
    asset("Argus-iOS-iPadOS.ipa"),
    asset("Argus-aarch64.dmg"),
  ],
};
test("download selection keeps phone and watch/TV installers distinct", () => {
  assert.equal(selectAsset(release, "ios").name, "Argus-iOS-iPadOS.ipa");
  assert.equal(selectAsset(release, "android").name, "Argus-android-arm64.apk");
  assert.equal(selectAsset(release, "projector"), null);
});
test("preview, missing, foreign and cross-version installers are never recommended", () => {
  assert.equal(selectAsset({ ...release, prerelease: true }, "mac"), null);
  assert.equal(selectAsset(release, "windows"), null);
  assert.equal(
    selectAsset({ ...release, assets: [asset("Argus-aarch64.dmg", "v3.17.4")] }, "mac"),
    null,
  );
  assert.equal(
    selectAsset(
      {
        ...release,
        assets: [
          { ...asset("Argus-aarch64.dmg"), browser_download_url: "https://example.com/file" },
        ],
      },
      "mac",
    ),
    null,
  );
});
test("device recommendation respects mobile, TV and unsupported Linux architectures", () => {
  assert.equal(detectPlatform("Android TV"), "projector");
  assert.equal(detectPlatform("Android Mobile"), "android");
  assert.equal(detectPlatform("iPad"), "ios");
  assert.equal(detectPlatform("Linux aarch64"), null);
  assert.equal(detectPlatform("Windows NT"), "windows");
});
