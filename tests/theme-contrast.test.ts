// @ts-expect-error Node types are outside the browser tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node types are outside the browser tsconfig.
import test from "node:test";
import { accentContrast, THEME_PRESETS } from "../src/lib/theme.ts";
import { flattenAlpha, parseColor, relLum } from "../src/lib/theme-import/color-math.ts";

test("solid accents use the higher-contrast foreground on every built-in theme", () => {
  for (const preset of Object.values(THEME_PRESETS)) {
    const accent = preset.tokens["--color-accent"];
    const canvas = preset.tokens["--color-canvas"];
    const foreground = accentContrast(accent, canvas);
    const background = relLum(flattenAlpha(parseColor(accent)!, parseColor(canvas)!));
    const contrast =
      foreground === "#000" ? (background + 0.05) / 0.05 : 1.05 / (background + 0.05);
    assert.ok(contrast >= 4.5, `${preset.id}: ${contrast}`);
  }
  assert.equal(accentContrast("#124c35"), "#fff");
  assert.equal(accentContrast("oklch(0.9 0.04 145)"), "#000");
});
