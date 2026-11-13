import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

test("Android scaffolding keeps MainActivity for phones, adds NativePlayer internally, and patches idempotently", () => {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const folder = mkdtempSync(join(tmpdir(), "argus-native-manifest-"));
  try {
    const main = join(folder, "src-tauri/gen/android/app/src/main");
    mkdirSync(main, { recursive: true });
    mkdirSync(join(folder, "docs/android"), { recursive: true });
    writeFileSync(
      join(folder, "docs/android/network_security_config.xml"),
      "<network-security-config />",
    );
    mkdirSync(join(main, "java/app/test"), { recursive: true });
    writeFileSync(
      join(main, "java/app/test/MainActivity.kt"),
      "package app.test\nclass MainActivity : TauriActivity() {}\n",
    );
    writeFileSync(
      join(folder, "src-tauri/gen/android/app/build.gradle.kts"),
      "android {}\ndependencies {}\n",
    );
    mkdirSync(join(folder, "docs/android/native-player"), { recursive: true });
    for (const file of [
      "ArgusNativePlayerActivity.kt",
      "ArgusNativePlayerBridge.kt",
      "ArgusNativePlayerState.kt",
    ]) {
      copyFileSync(
        join(root, "docs/android/native-player", file),
        join(folder, "docs/android/native-player", file),
      );
    }
    const manifest = join(main, "AndroidManifest.xml");
    writeFileSync(
      manifest,
      `<manifest><application><activity android:name=".MainActivity" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity><activity android:name="OtherActivity"><intent-filter><action android:name="KEEP" /></intent-filter></activity></application></manifest>`,
    );
    execFileSync(process.execPath, [join(root, "scripts/android-patch-manifest.mjs")], {
      cwd: folder,
    });
    const once = readFileSync(manifest, "utf8");
    execFileSync(process.execPath, [join(root, "scripts/android-patch-manifest.mjs")], {
      cwd: folder,
    });
    assert.equal(readFileSync(manifest, "utf8"), once);
    assert.match(once, /android:name="\.MainActivity" android:exported="true"/);
    const mainActivity = once.match(
      /<activity\b[^>]*android:name="\.MainActivity"[^>]*>[\s\S]*?<\/activity>/,
    )?.[0];
    assert.ok(mainActivity);
    assert.match(mainActivity, /android\.intent\.category\.LAUNCHER/);
    assert.doesNotMatch(mainActivity, /android\.intent\.category\.LEANBACK_LAUNCHER/);
    assert.match(once, /android:name="\.ArgusNativePlayerActivity"[\s\S]*?android:exported="false"/);
    assert.match(once, /android:name="KEEP"/);
    const native = readFileSync(
      join(root, "src-tauri/native-player/android/src/main/AndroidManifest.xml"),
      "utf8",
    );
    assert.match(native, /app.argus.player.NativeTvActivity/);
    assert.match(native, /android.intent.category.LEANBACK_LAUNCHER/);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
