import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const targets = [
  ["macOS Apple Silicon", "Argus-aarch64.dmg"],
  ["macOS Intel", "Argus-x86_64.dmg"],
  ["Windows x64", "Argus-windows-x64-setup.exe"],
  ["Linux x64", "Argus-linux-x64.AppImage"],
  ["Android mobile", "Argus-android-arm64.apk"],
  ["Android TV / projector", "Argus-SmartProjector-AndroidTV.apk"],
  ["iOS / iPadOS", "Argus-iOS-iPadOS.ipa"],
  ["Apple TV", "Argus-AppleTV-tvOS.ipa"],
  ["Apple Vision Pro", "Argus-VisionPro-visionOS.ipa"],
  ["Apple Watch", "Argus-AppleWatch-watchOS.ipa"],
  ["Samsung Tizen", "Argus-Samsung-Tizen.wgt"],
  ["LG webOS", "Argus-LG-webOS.zip"],
  ["Hisense VIDAA", "Argus-Hisense-VIDAA.zip"],
  ["Philips Titan OS", "Argus-Philips-TitanOS.zip"],
  ["Panasonic", "Argus-Panasonic-MyHomeScreen.zip"],
  ["Roku", "Argus-Roku-Channel.zip"],
  ["Web TV", "Argus-WebTV-10foot-standalone.zip"],
];

export function platformSupport(release, evidence = []) {
  if (
    !release ||
    release.draft ||
    release.prerelease ||
    !/^v\d+\.\d+\.\d+$/.test(release.tag_name)
  ) {
    throw new Error("Support matrix requires one published stable release");
  }
  return targets.map(([platform, name]) => {
    const asset = (release.assets ?? []).find(
      (item) =>
        item.name === name &&
        item.browser_download_url ===
          `https://github.com/archiboltmusk/Argus/releases/download/${release.tag_name}/${name}`,
    );
    const tested = evidence.find(
      (item) =>
        item.tag === release.tag_name &&
        item.asset === name &&
        item.result === "passed" &&
        typeof item.device === "string" &&
        item.device.trim() &&
        typeof item.report === "string" &&
        item.report.startsWith("https://github.com/archiboltmusk/Argus/"),
    );
    return {
      platform,
      artifact: asset ? name : null,
      status: asset ? (tested ? "device-tested" : "build-only") : "experimental",
      report: asset && tested ? tested.report : null,
    };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , input, output, evidenceFile] = process.argv;
  if (!input || !output)
    throw new Error("usage: platform-support.mjs release.json support.md [device-evidence.json]");
  const release = JSON.parse(readFileSync(input, "utf8"));
  const evidence = evidenceFile ? JSON.parse(readFileSync(evidenceFile, "utf8")) : [];
  const rows = platformSupport(release, evidence);
  writeFileSync(
    output,
    `# Platform evidence for ${release.tag_name}\n\nBuild-only means an installer exists; it does not prove playback on a device. Experimental means no matching installer in this stable release.\n\n| Platform | Status | Artifact | Device report |\n| --- | --- | --- | --- |\n${rows.map((r) => `| ${r.platform} | ${r.status} | ${r.artifact ?? "Unavailable"} | ${r.report ? `[Report](${r.report})` : "Not recorded"} |`).join("\n")}\n`,
  );
}
