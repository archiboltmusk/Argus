import assert from "node:assert/strict";
import test from "node:test";
import { renderReleasePage } from "../scripts/publish-release-page.mjs";

const asset = (name) => ({
  name,
  url: `https://github.com/example/Argus/releases/download/v3.17.2/${name}`,
});
const release = (body = "", assets = [asset("Argus-aarch64.dmg")]) => ({
  tagName: "v3.17.2",
  body,
  assets,
});

test("release downloads only include installers actually published, not updater files", () => {
  const page = renderReleasePage(
    release("Changes", [
      asset("Argus-aarch64.dmg"),
      asset("latest.json"),
      asset("Argus-aarch64.app.tar.gz"),
    ]),
    "- Fixed artwork",
  );
  assert.match(page, /Apple Silicon.*Download DMG/);
  assert.doesNotMatch(page, /Windows|Linux|latest\.json|app\.tar\.gz/);
  assert.match(page, /What's new\n\n- Fixed artwork/);
  assert.ok(page.indexOf("Download Argus") < page.indexOf("Full changelog"));
});

test("refreshing after desktop uploads adds platform links and preserves the changelog once", () => {
  const initial = renderReleasePage(release("Original change #158"), "- Fixed artwork");
  const updated = renderReleasePage(
    release(initial, [
      asset("Argus-aarch64.dmg"),
      asset("Argus-windows-x64-setup.exe"),
      asset("Argus-linux-x64.AppImage"),
    ]),
    "- Fixed artwork",
  );
  assert.match(updated, /Windows.*Download installer/);
  assert.match(updated, /Linux.*Download AppImage/);
  assert.equal(updated.split("Original change #158").length, 2);
  assert.equal(
    renderReleasePage(
      release(updated, [
        asset("Argus-aarch64.dmg"),
        asset("Argus-windows-x64-setup.exe"),
        asset("Argus-linux-x64.AppImage"),
      ]),
      "- Fixed artwork",
    ),
    updated,
  );
});

test("an empty original changelog remains idempotent", () => {
  const first = renderReleasePage(release());
  assert.equal(renderReleasePage(release(first)), first);
});

test("unsafe links, preview tags, and releases without installers cannot produce a page", () => {
  assert.throws(() => renderReleasePage(release("", [])), /No published installers/);
  assert.throws(() => renderReleasePage({ ...release(), tagName: "beta" }), /stable version/);
  assert.throws(
    () =>
      renderReleasePage(
        release("", [{ name: "Argus-aarch64.dmg", url: "https://example.com/fake.dmg" }]),
      ),
    /Invalid installer/,
  );
});

test("obsolete generated macOS compatibility claim is removed without losing release changes", () => {
  const page = renderReleasePage(
    release(
      "Apple Silicon (M1 or newer), macOS 11+. Unsigned build.\n\n## What's Changed\n- A real fix",
    ),
  );
  assert.doesNotMatch(page, /macOS 11/);
  assert.match(page, /A real fix/);
});
