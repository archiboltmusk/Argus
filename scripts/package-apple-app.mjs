#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { applePlatform, validateAppleBuildOutput } from "./apple-platforms.mjs";

const args = process.argv.slice(2);
function getArg(name, fallback = "") {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return fallback;
}

const platform = getArg("platform", "ios"); // ios, tvos, visionos, watchos
const appDir = path.resolve(getArg("app-dir"));
const distDir = path.resolve(getArg("dist-dir", "dist"));
const version = getArg("version", "3.0.0");

const conf = applePlatform(platform);
if (process.platform !== "darwin")
  throw new Error("Apple packaging requires macOS with Xcode and the target SDK installed.");
execSync(`xcrun --sdk ${conf.sdk} --show-sdk-path`, { stdio: "inherit" });
fs.mkdirSync(appDir, { recursive: true });

// Clean up any invalid macOS Contents structure if accidentally copied
const contentsDir = path.join(appDir, "Contents");
if (fs.existsSync(contentsDir)) {
  console.log(`[package-apple-app] Removing macOS Contents folder from ${platform} app bundle...`);
  fs.rmSync(contentsDir, { recursive: true, force: true });
}

// Always copy frontend web assets from distDir to appDir
if (fs.existsSync(distDir)) {
  console.log(`[package-apple-app] Copying frontend assets from ${distDir} to ${appDir}`);
  execSync(`cp -R "${distDir}/." "${appDir}/"`, { stdio: "inherit" });
}

const infoPlistPath = path.join(appDir, "Info.plist");
let needsPlist = !fs.existsSync(infoPlistPath);
if (!needsPlist) {
  try {
    const existing = fs.readFileSync(infoPlistPath, "utf8");
    if (
      existing.includes("$(EXECUTABLE_NAME)") ||
      existing.includes("$(PRODUCT_NAME)") ||
      !existing.includes("<key>CFBundleExecutable</key>")
    ) {
      needsPlist = true;
    }
  } catch {
    needsPlist = true;
  }
}

if (needsPlist) {
  console.log(`[package-apple-app] Writing clean Info.plist for ${platform} at ${infoPlistPath}`);
  const supportedPlatform =
    platform === "tvos"
      ? "AppleTVOS"
      : platform === "visionos"
        ? "XROS"
        : platform === "watchos"
          ? "WatchOS"
          : "iPhoneOS";

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>${conf.displayName}</string>
    <key>CFBundleExecutable</key>
    <string>${conf.execName}</string>
    <key>CFBundleIdentifier</key>
    <string>${conf.bundleId}</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>${conf.displayName}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>${version}</string>
    <key>CFBundleVersion</key>
    <string>${version}</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>MinimumOSVersion</key>
    <string>${conf.minOs}</string>
    <key>UIDeviceFamily</key>
    <array>
        ${conf.deviceFamily.map((family) => `<integer>${family}</integer>`).join("\n        ")}
    </array>
    <key>CFBundleSupportedPlatforms</key>
    <array>
        <string>${supportedPlatform}</string>
    </array>
    <key>UIRequiresFullScreen</key>
    <true/>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
    <key>UISupportedInterfaceOrientations~ipad</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationPortraitUpsideDown</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
</dict>
</plist>
`;
  fs.writeFileSync(infoPlistPath, plistContent, "utf8");
}

const execPath = path.join(appDir, conf.execName);
let needsBinary = !fs.existsSync(execPath);
if (!needsBinary) {
  try {
    const stat = fs.statSync(execPath);
    if (stat.size === 0) needsBinary = true;
  } catch {
    needsBinary = true;
  }
}

if (needsBinary) {
  console.log(
    `[package-apple-app] Compiling native ARM64 Mach-O binary for ${platform} at ${execPath}`,
  );
  const tempSrc = path.join(appDir, "_temp_launcher.m");

  if (platform === "ios") {
    const objcSrc = `
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

@interface ArgusBootstrapDelegate : UIResponder <UIApplicationDelegate>
@property (strong, nonatomic) UIWindow *window;
@end

@implementation ArgusBootstrapDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    self.window = [[UIWindow alloc] initWithFrame:[[UIScreen mainScreen] bounds]];
    UIViewController *vc = [[UIViewController alloc] init];
    vc.view.backgroundColor = [UIColor colorWithRed:17.0/255.0 green:18.0/255.0 blue:20.0/255.0 alpha:1.0];
    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    [config.preferences setValue:@YES forKey:@"allowFileAccessFromFileURLs"];
    @try {
        [config setValue:@YES forKey:@"allowUniversalAccessFromFileURLs"];
    } @catch (NSException *e) {}
    if (@available(iOS 14.0, *)) {
        [config.defaultWebpagePreferences setAllowsContentJavaScript:YES];
    }
    WKWebView *webView = [[WKWebView alloc] initWithFrame:vc.view.bounds configuration:config];
    webView.backgroundColor = [UIColor colorWithRed:17.0/255.0 green:18.0/255.0 blue:20.0/255.0 alpha:1.0];
    webView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [vc.view addSubview:webView];
    NSString *indexPath = [[NSBundle mainBundle] pathForResource:@"index" ofType:@"html"];
    if (indexPath) {
        [webView loadFileURL:[NSURL fileURLWithPath:indexPath] allowingReadAccessToURL:[[NSBundle mainBundle] bundleURL]];
    }
    self.window.rootViewController = vc;
    [self.window makeKeyAndVisible];
    return YES;
}
@end

int main(int argc, char * argv[]) {
    @autoreleasepool {
        return UIApplicationMain(argc, argv, nil, NSStringFromClass([ArgusBootstrapDelegate class]));
    }
}
`;
    fs.writeFileSync(tempSrc, objcSrc, "utf8");
    try {
      execSync(
        `xcrun --sdk iphoneos clang -target arm64-apple-ios16.0 -fobjc-arc -framework UIKit -framework Foundation -framework WebKit -o "${execPath}" "${tempSrc}"`,
        { stdio: "inherit" },
      );
    } catch {
      throw new Error("The iOS launcher failed to compile; refusing an empty replacement binary.");
    } finally {
      if (fs.existsSync(tempSrc)) fs.unlinkSync(tempSrc);
    }
  } else if (platform === "tvos") {
    const objcSrc = `
#import <UIKit/UIKit.h>

@interface ArgusBootstrapDelegate : UIResponder <UIApplicationDelegate>
@property (strong, nonatomic) UIWindow *window;
@end

@implementation ArgusBootstrapDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    self.window = [[UIWindow alloc] initWithFrame:[[UIScreen mainScreen] bounds]];
    UIViewController *vc = [[UIViewController alloc] init];
    self.window.rootViewController = vc;
    [self.window makeKeyAndVisible];
    return YES;
}
@end

int main(int argc, char * argv[]) {
    @autoreleasepool {
        return UIApplicationMain(argc, argv, nil, NSStringFromClass([ArgusBootstrapDelegate class]));
    }
}
`;
    fs.writeFileSync(tempSrc, objcSrc, "utf8");
    try {
      execSync(
        `xcrun --sdk appletvos clang -target arm64-apple-tvos16.0 -fobjc-arc -framework UIKit -framework Foundation -o "${execPath}" "${tempSrc}"`,
        { stdio: "inherit" },
      );
    } catch {
      throw new Error("The tvOS launcher failed to compile; refusing an empty replacement binary.");
    } finally {
      if (fs.existsSync(tempSrc)) fs.unlinkSync(tempSrc);
    }
  } else {
    // These remain developer bootstraps until a native Watch/Vision UI is supplied.
    // Compile only for the requested OS; an iPhone binary is not a valid fallback.
    console.warn(
      `[package-apple-app] ${platform} is a developer bootstrap, not a feature-complete native app.`,
    );
    execSync(
      `xcrun --sdk ${conf.sdk} clang -target ${conf.target} -o "${execPath}" -x c - << 'EOF'\nint main(int argc, char *argv[]) { return 0; }\nEOF`,
      { stdio: "inherit" },
    );
  }

  fs.chmodSync(execPath, 0o755);
}

console.log(
  `[package-apple-app] Verification complete for ${conf.displayName} (${platform}): Info.plist and executable exist.`,
);
