import test from "node:test";
import assert from "node:assert/strict";
import { githubReleaseHistory } from "../src/lib/updater/release-history";
const asset = (name: string, tag = "v3.17.4") => ({
  name,
  browser_download_url: `https://github.com/archiboltmusk/Argus/releases/download/${tag}/${name}`,
});
const release = {
  tag_name: "v3.17.4",
  assets: [
    asset("Argus-aarch64.dmg"),
    asset("Argus-linux-x64.AppImage"),
    asset("Argus-windows-x64-setup.exe"),
  ],
  body: "A tested release",
  published_at: "2026-11-13T12:00:00Z",
};
test("recovery history maps official stable installers for each desktop platform", () => {
  const entries = githubReleaseHistory([release]);
  assert.equal(entries[0].version, "3.17.4");
  assert.equal(entries[0].channel, "stable");
  assert.match(entries[0].mac!, /Argus-aarch64.dmg$/);
  assert.match(entries[0].linux!, /AppImage$/);
  assert.match(entries[0].win!, /setup.exe$/);
});
test("recovery excludes previews, drafts, wrong-version assets and foreign downloads", () => {
  assert.deepEqual(
    githubReleaseHistory([
      { ...release, prerelease: true },
      { ...release, draft: true },
      { ...release, tag_name: "projector-v3.17.4" },
      { ...release, assets: [asset("Argus-aarch64.dmg", "v3.17.3")] },
      {
        ...release,
        assets: [{ name: "Argus-aarch64.dmg", browser_download_url: "https://example.com/file" }],
      },
    ]),
    [],
  );
});
