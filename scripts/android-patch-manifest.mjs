// Applies the hand-maintained Android TV changes to the project that
// `tauri android init` generates (src-tauri/gen/ is gitignored scaffolding).
//   - network security config: cleartext HTTP to the on-device torrent engine
//     (see docs/android/network_security_config.xml for why release needs it)
//   - Android TV: native launcher and optional device features
//   - Preserve the previous interface and native Media3/LibVLC bridge internally
// Fails loudly when the template changes shape so a release never ships unpatched.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

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
  xml = xml.replace(
    /<application\b/,
    '<application\n        android:networkSecurityConfig="@xml/network_security_config"',
  );
}

// Budget Android 9/11 projectors (1GB RAM) cap per-app memory aggressively unless largeHeap is enabled.
if (!xml.includes("android:largeHeap")) {
  must(/<application\b/.test(xml), "no <application> tag in AndroidManifest.xml");
  xml = xml.replace(/<application\b/, '<application\n        android:largeHeap="true"');
}

if (!xml.includes("android:hardwareAccelerated")) {
  must(/<application\b/.test(xml), "no <application> tag in AndroidManifest.xml");
  xml = xml.replace(/<application\b/, '<application\n        android:hardwareAccelerated="true"');
}

if (!xml.includes("<queries>")) {
  const queries =
    "    <queries>\n" +
    "      <intent>\n" +
    '        <action android:name="android.intent.action.MAIN" />\n' +
    '        <category android:name="android.intent.category.LEANBACK_LAUNCHER" />\n' +
    "      </intent>\n" +
    "      <intent>\n" +
    '        <action android:name="android.intent.action.MAIN" />\n' +
    '        <category android:name="android.intent.category.LAUNCHER" />\n' +
    "      </intent>\n" +
    "      <intent>\n" +
    '        <action android:name="android.media.tv.action.VIEW_INPUTS" />\n' +
    "      </intent>\n" +
    "    </queries>\n";
  xml = xml.replace(/(\s*)<application\b/, (m) => `\n${queries}${m.replace(/^\n/, "")}`);
}

if (!xml.includes("android.software.leanback")) {
  const features =
    '    <uses-feature android:name="android.software.leanback" android:required="false" />\n' +
    '    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />\n' +
    '    <uses-feature android:name="android.hardware.faketouch" android:required="false" />\n' +
    '    <uses-feature android:name="android.hardware.telephony" android:required="false" />\n' +
    '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n' +
    '    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />\n' +
    '    <uses-feature android:name="android.hardware.bluetooth" android:required="false" />\n' +
    '    <uses-feature android:name="android.hardware.microphone" android:required="false" />\n' +
    '    <uses-feature android:name="android.hardware.wifi" android:required="false" />\n';
  must(/<application\b/.test(xml), "no <application> tag in AndroidManifest.xml");
  xml = xml.replace(/(\s*)<application\b/, (m) => `\n${features}${m.replace(/^\n/, "")}`);
}

// Ensure TV banner attribute is declared on the main activity for Android TV / Projector home screens
if (!xml.includes("android:banner")) {
  xml = xml.replace(/<activity\b/, '<activity\n            android:banner="@mipmap/ic_launcher"');
}

if (!xml.includes("ArgusNativePlayerActivity")) {
  const playerActivity =
    "      <activity\n" +
    '          android:name=".ArgusNativePlayerActivity"\n' +
    '          android:configChanges="orientation|screenSize|smallestScreenSize|screenLayout|keyboard|keyboardHidden|navigation|uiMode"\n' +
    '          android:theme="@style/Theme.AppCompat.NoActionBar"\n' +
    '          android:launchMode="singleTop"\n' +
    '          android:exported="false" />\n';
  must(/<\/application>/.test(xml), "no </application> tag in AndroidManifest.xml");
  xml = xml.replace(/<\/application>/, `${playerActivity}    </application>`);
}

// Phones/tablets launch .MainActivity (full React app); TV/Projectors use NativeTvActivity via LEANBACK_LAUNCHER.
xml = xml.replace(/<activity\b[^>]*>[\s\S]*?<\/activity>/g, (activity) => {
  if (!/android:name="\.MainActivity"/.test(activity.slice(0, activity.indexOf(">"))))
    return activity;
  return activity.replace('        <category android:name="android.intent.category.LEANBACK_LAUNCHER" />\n', "");
});
must(/android:name="\.MainActivity"/.test(xml), "no MainActivity in generated manifest");
writeFileSync(manifestPath, xml);
console.log("[android-patch] patched", manifestPath);

// Locate generated MainActivity.kt inside src/main/java or src/main/kotlin
function findFileRecursive(dir, filename) {
  if (!existsSync(dir)) return null;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const hit = findFileRecursive(full, filename);
      if (hit) return hit;
    } else if (entry.name === filename) {
      return full;
    }
  }
  return null;
}

const mainActivityPath =
  findFileRecursive(join(app, "java"), "MainActivity.kt") ||
  findFileRecursive(join(app, "kotlin"), "MainActivity.kt");
must(Boolean(mainActivityPath), "could not locate MainActivity.kt inside generated Android app");

const kotlinDir = dirname(mainActivityPath);
let mainActivitySrc = readFileSync(mainActivityPath, "utf8");
const pkgMatch = /^\s*package\s+([A-Za-z0-9_.]+)/m.exec(mainActivitySrc);
must(Boolean(pkgMatch), `no package declaration in ${mainActivityPath}`);
const appPackage = pkgMatch[1];

const nativePlayerTemplateDir = join("docs", "android", "native-player");
for (const ktFile of [
  "ArgusNativePlayerState.kt",
  "ArgusNativePlayerActivity.kt",
  "ArgusNativePlayerBridge.kt",
]) {
  const src = readFileSync(join(nativePlayerTemplateDir, ktFile), "utf8").replace(
    /__PACKAGE_NAME__/g,
    appPackage,
  );
  writeFileSync(join(kotlinDir, ktFile), src);
}

if (!mainActivitySrc.includes("onWebViewCreate")) {
  if (!mainActivitySrc.includes("android.webkit.WebView")) {
    mainActivitySrc = mainActivitySrc.replace(
      /(package\s+[^\r\n]+)/,
      "$1\n\nimport android.webkit.WebView",
    );
  }
  const webViewHook =
    "\n  override fun onWebViewCreate(webView: WebView) {\n" +
    "    super.onWebViewCreate(webView)\n" +
    "    webView.settings.domStorageEnabled = true\n" +
    "    webView.settings.databaseEnabled = true\n" +
    "    webView.settings.mediaPlaybackRequiresUserGesture = false\n" +
    '    webView.addJavascriptInterface(ArgusNativePlayerBridge(this, webView), "ArgusNativePlayer")\n' +
    "  }\n";
  must(/}\s*$/.test(mainActivitySrc), "unexpected end of MainActivity.kt");
  mainActivitySrc = mainActivitySrc.replace(/}\s*$/, `${webViewHook}}\n`);
  writeFileSync(mainActivityPath, mainActivitySrc);
  console.log("[android-patch] wired ArgusNativePlayer bridge into", mainActivityPath);
}

// Inject Media3 ExoPlayer + LibVLC native dependencies into app/build.gradle.kts
const appGradlePath = join("src-tauri", "gen", "android", "app", "build.gradle.kts");
must(existsSync(appGradlePath), `missing ${appGradlePath}`);
let appGradle = readFileSync(appGradlePath, "utf8");

if (!appGradle.includes("media3-exoplayer")) {
  const mediaDeps =
    '    implementation("androidx.media3:media3-exoplayer:1.5.1")\n' +
    '    implementation("androidx.media3:media3-exoplayer-hls:1.5.1")\n' +
    '    implementation("androidx.media3:media3-exoplayer-dash:1.5.1")\n' +
    '    implementation("androidx.media3:media3-ui:1.5.1")\n' +
    '    implementation("androidx.media3:media3-common:1.5.1")\n' +
    '    implementation("org.videolan.android:libvlc-all:3.6.0")\n';
  must(/dependencies\s*\{/.test(appGradle), "no dependencies block in app/build.gradle.kts");
  appGradle = appGradle.replace(/dependencies\s*\{/, `dependencies {\n${mediaDeps}`);
}

if (!appGradle.includes("libc++_shared.so")) {
  const packagingBlock =
    "    packaging {\n" +
    "        jniLibs {\n" +
    '            pickFirsts.add("**/libc++_shared.so")\n' +
    "        }\n" +
    "    }\n";
  must(/android\s*\{/.test(appGradle), "no android block in app/build.gradle.kts");
  appGradle = appGradle.replace(/android\s*\{/, `android {\n${packagingBlock}`);
}

writeFileSync(appGradlePath, appGradle);
console.log("[android-patch] patched dependencies in", appGradlePath);
