// Applies the hand-maintained Android TV changes to the project that
// `tauri android init` generates (src-tauri/gen/ is gitignored scaffolding).
//   - network security config: cleartext HTTP to the on-device torrent engine
//     (see docs/android/network_security_config.xml for why release needs it)
//   - Android TV: leanback launcher entry and non-required touchscreen/leanback features
// Fails loudly when the template changes shape so a release never ships unpatched.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const app = join("src-tauri", "gen", "android", "app", "src", "main");
const manifestPath = join(app, "AndroidManifest.xml");
let xml = readFileSync(manifestPath, "utf8");

function must(condition, message) {
  if (!condition) {
    console.error(`[android-patch] ${message}`);
    process.exit(1);
  }
}

mkdirSync(join(app, "res", "xml"), { recursive: true });
copyFileSync(
  join("docs", "android", "network_security_config.xml"),
  join(app, "res", "xml", "network_security_config.xml"),
);

if (!xml.includes("networkSecurityConfig")) {
  must(/<application\b/.test(xml), "no <application> tag in AndroidManifest.xml");
  xml = xml.replace(/<application\b/, '<application\n        android:networkSecurityConfig="@xml/network_security_config"');
}

if (!xml.includes("LEANBACK_LAUNCHER")) {
  const launcher = /(\s*)<category android:name="android\.intent\.category\.LAUNCHER"\s*\/>/;
  must(launcher.test(xml), "no LAUNCHER category in AndroidManifest.xml");
  xml = xml.replace(
    launcher,
    (m, indent) => `${m}${indent}<category android:name="android.intent.category.LEANBACK_LAUNCHER" />`,
  );
}

if (!xml.includes("android.software.leanback")) {
  const features =
    '    <uses-feature android:name="android.software.leanback" android:required="false" />\n' +
    '    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />\n';
  must(/<application\b/.test(xml), "no <application> tag in AndroidManifest.xml");
  xml = xml.replace(/(\s*)<application\b/, (m) => `\n${features}${m.replace(/^\n/, "")}`);
}

writeFileSync(manifestPath, xml);
console.log("[android-patch] patched", manifestPath);
