export const APPLE_PLATFORMS = {
  ios: {
    displayName: "Argus",
    deviceFamily: [1, 2],
    bundleId: "app.argus.mobile.ios",
    execName: "Argus",
    sdk: "iphoneos",
    binaryPlatform: "IOS",
    target: "arm64-apple-ios16.0",
    minOs: "16.0",
    frameworks: ["UIKit", "Foundation", "WebKit"],
  },
  tvos: {
    displayName: "Argus TV",
    deviceFamily: [3],
    bundleId: "app.argus.tvos",
    execName: "ArgusTV",
    sdk: "appletvos",
    binaryPlatform: "TVOS",
    target: "arm64-apple-tvos16.0",
    minOs: "16.0",
    frameworks: ["UIKit", "Foundation"],
  },
  visionos: {
    displayName: "Argus Vision",
    deviceFamily: [7],
    bundleId: "app.argus.visionos",
    execName: "ArgusVision",
    sdk: "xros",
    binaryPlatform: "VISIONOS",
    target: "arm64-apple-xros1.0",
    minOs: "1.0",
    frameworks: ["UIKit", "Foundation"],
  },
  watchos: {
    displayName: "Argus Watch",
    deviceFamily: [4],
    bundleId: "app.argus.watchos",
    execName: "ArgusWatch",
    sdk: "watchos",
    binaryPlatform: "WATCHOS",
    target: "arm64_32-apple-watchos9.0",
    minOs: "9.0",
    frameworks: [],
  },
};

export function applePlatform(name) {
  const config = APPLE_PLATFORMS[name];
  if (!config) throw new Error(`Unsupported Apple platform: ${name}`);
  return config;
}

export function validateAppleBuildOutput(output, platform) {
  const expected = applePlatform(platform).binaryPlatform;
  const found = [...output.matchAll(/\bplatform\s+([A-Z0-9_]+)/g)].map((match) => match[1]);
  if (!found.length || found.some((value) => value !== expected)) {
    throw new Error(
      `Wrong binary platform for ${platform}: expected ${expected}, found ${found.join(", ") || "unknown"}`,
    );
  }
}
