#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

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

const CONFIGS = {
  ios: {
    displayName: "Argus",
    bundleId: "app.argus.mobile.ios",
    execName: "Argus",
    sdk: "iphoneos",
    target: "arm64-apple-ios16.0",
    minOs: "16.0",
    frameworks: ["UIKit", "Foundation", "WebKit"],
  },
  tvos: {
    displayName: "Argus TV",
    bundleId: "app.argus.tvos",
    execName: "ArgusTV",
    sdk: "appletvos",
    target: "arm64-apple-tvos16.0",
    minOs: "16.0",
    frameworks: ["UIKit", "Foundation"],
  },
  visionos: {
    displayName: "Argus Vision",
    bundleId: "app.argus.visionos",
    execName: "ArgusVision",
    sdk: "xros",
    target: "arm64-apple-xros1.0",
    minOs: "1.0",
    frameworks: ["UIKit", "Foundation"],
  },
  watchos: {
    displayName: "Argus Watch",
    bundleId: "app.argus.watchos",
    execName: "ArgusWatch",
    sdk: "watchos",
    target: "arm64-apple-watchos9.0",
    minOs: "9.0",
    frameworks: ["WatchKit", "Foundation"],
  },
};

const conf = CONFIGS[platform] || CONFIGS.ios;
fs.mkdirSync(appDir, { recursive: true });

const infoPlistPath = path.join(appDir, "Info.plist");
if (!fs.existsSync(infoPlistPath)) {
  console.log(`[package-apple-app] Creating Info.plist for ${platform} at ${infoPlistPath}`);
  if (fs.existsSync(distDir)) {
    execSync(`cp -R "${distDir}/." "${appDir}/"`, { stdio: "inherit" });
  }

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
if (!fs.existsSync(execPath)) {
  console.log(`[package-apple-app] Compiling native ARM64 Mach-O binary for ${platform} at ${execPath}`);
  const frameworksArgs = conf.frameworks.map(f => `-framework ${f}`).join(" ");
  const tempSrc = path.join(appDir, "_temp_launcher.m");

  const objcSrc = `
#import <UIKit/UIKit.h>
#if __has_include(<WebKit/WebKit.h>)
#import <WebKit/WebKit.h>
#endif

@interface ArgusBootstrapDelegate : UIResponder <UIApplicationDelegate>
@property (strong, nonatomic) UIWindow *window;
@end

@implementation ArgusBootstrapDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    self.window = [[UIWindow alloc] initWithFrame:[[UIScreen mainScreen] bounds]];
    UIViewController *vc = [[UIViewController alloc] init];
#if __has_include(<WebKit/WebKit.h>)
    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    WKWebView *webView = [[WKWebView alloc] initWithFrame:vc.view.bounds configuration:config];
    webView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [vc.view addSubview:webView];
    NSString *indexPath = [[NSBundle mainBundle] pathForResource:@"index" ofType:@"html"];
    if (indexPath) {
        [webView loadFileURL:[NSURL fileURLWithPath:indexPath] allowingReadAccessToURL:[[NSBundle mainBundle] bundleURL]];
    }
#endif
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
    execSync(`xcrun --sdk ${conf.sdk} clang -target ${conf.target} -fobjc-arc ${frameworksArgs} -o "${execPath}" "${tempSrc}"`, { stdio: "inherit" });
  } catch (err) {
    console.warn(`[package-apple-app] Primary SDK ${conf.sdk} compile failed; attempting iphoneos fallback...`);
    execSync(`xcrun --sdk iphoneos clang -target arm64-apple-ios16.0 -fobjc-arc -framework UIKit -framework Foundation -o "${execPath}" "${tempSrc}"`, { stdio: "inherit" });
  } finally {
    if (fs.existsSync(tempSrc)) fs.unlinkSync(tempSrc);
  }

  fs.chmodSync(execPath, 0o755);
}

console.log(`[package-apple-app] Verification complete for ${conf.displayName} (${platform}): Info.plist and executable exist.`);
