// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";

const downloadsPopoverSource = readFileSync(
  new URL("../src/components/downloads-popover.tsx", import.meta.url),
  "utf8",
);
const argusLoaderSource = readFileSync(
  new URL("../src/components/argus-loader.tsx", import.meta.url),
  "utf8",
);

test("active downloads reuse the shared Argus loader at compact size", () => {
  assert.match(downloadsPopoverSource, /import \{ ArgusLoader \}/);
  assert.match(downloadsPopoverSource, /downloadingCount > 0[\s\S]*?<ArgusLoader size="xs"/);
  assert.match(argusLoaderSource, /xs: "h-7 w-7"/);
  assert.doesNotMatch(downloadsPopoverSource, /DownloadActivityIcon|download-argus-/);
});
