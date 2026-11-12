import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = fileURLToPath(new URL("../scripts/ci-set-beta-version.mjs", import.meta.url));
for (const [requested, expected] of [
  ["v3.17.1", "3.17.1"],
  ["3.17.2", "3.17.2"],
  ["", "3.0.800"],
]) {
  test(`release stamp honors ${requested || "CI run version"}`, () => {
    const cwd = mkdtempSync(join(tmpdir(), "argus-release-version-"));
    try {
      mkdirSync(join(cwd, "src-tauri"));
      const file = join(cwd, "src-tauri/tauri.conf.json");
      writeFileSync(join(cwd, "package.json"), JSON.stringify({ version: "3.0.0" }));
      writeFileSync(file, JSON.stringify({ version: "3.0.0", plugins: { updater: {} } }));
      const result = spawnSync(process.execPath, [script], {
        cwd,
        env: {
          ...process.env,
          PUBKEY: "public-key",
          ARGUS_VERSION: requested,
          GITHUB_RUN_NUMBER: "800",
        },
      });
      assert.equal(result.status, 0, result.stderr?.toString());
      assert.equal(JSON.parse(readFileSync(file, "utf8")).version, expected);
      assert.equal(JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")).version, expected);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
}

test("release stamping refuses an absent signing key without changing versions", () => {
  const cwd = mkdtempSync(join(tmpdir(), "argus-release-version-"));
  try {
    mkdirSync(join(cwd, "src-tauri"));
    const file = join(cwd, "src-tauri/tauri.conf.json");
    const original = JSON.stringify({ version: "3.0.0", plugins: { updater: {} } });
    writeFileSync(file, original);
    writeFileSync(join(cwd, "package.json"), JSON.stringify({ version: "3.0.0" }));
    const result = spawnSync(process.execPath, [script], {
      cwd,
      env: { ...process.env, PUBKEY: "", ARGUS_VERSION: "v3.17.1" },
    });
    assert.equal(result.status, 1);
    assert.equal(readFileSync(file, "utf8"), original);
    assert.equal(JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")).version, "3.0.0");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
