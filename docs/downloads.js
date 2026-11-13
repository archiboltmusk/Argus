/* Shared by the static download page and its release acceptance tests. */
(function (root) {
  const patterns = {
    mac: /^Argus-aarch64\.dmg$/i,
    windows: /^Argus-windows-x64-setup\.exe$/i,
    linux: /^Argus-linux-x64\.AppImage$/i,
    android: /^Argus-android-arm64\.apk$/i,
    projector: /^Argus-SmartProjector-AndroidTV\.apk$/i,
    ios: /^Argus-iOS-iPadOS\.ipa$/i,
  };
  function selectAsset(release, platform) {
    if (
      !release ||
      release.draft ||
      release.prerelease ||
      !/^v\d+\.\d+\.\d+$/.test(release.tag_name)
    )
      return null;
    return (
      (release.assets || []).find((asset) => {
        if (!patterns[platform]?.test(asset.name)) return false;
        try {
          const url = new URL(asset.browser_download_url);
          return (
            url.origin === "https://github.com" &&
            url.pathname ===
              `/archiboltmusk/Argus/releases/download/${release.tag_name}/${asset.name}`
          );
        } catch {
          return false;
        }
      }) || null
    );
  }
  function detectPlatform(ua) {
    if (/android/i.test(ua)) return /TV|AFT|projector/i.test(ua) ? "projector" : "android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
    if (/Windows/i.test(ua)) return "windows";
    if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
    if (/Linux/i.test(ua)) return /aarch64|armv/i.test(ua) ? null : "linux";
    return null;
  }
  root.ArgusDownloads = { selectAsset, detectPlatform };
})(globalThis);
