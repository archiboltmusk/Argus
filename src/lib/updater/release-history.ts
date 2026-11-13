import type { VersionEntry } from "./versions";

/** Only official stable desktop installers belong in the recovery picker. */
export function githubReleaseHistory(raw: unknown): VersionEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((release) => {
    if (
      !release ||
      release.draft ||
      release.prerelease ||
      !/^v\d+\.\d+\.\d+$/.test(release.tag_name)
    )
      return [];
    const entry: VersionEntry = {
      version: release.tag_name.slice(1),
      channel: "stable",
      date:
        typeof release.published_at === "string" ? release.published_at.slice(0, 10) : undefined,
      notes: typeof release.body === "string" ? release.body : undefined,
    };
    for (const asset of Array.isArray(release.assets) ? release.assets : []) {
      const field =
        asset.name === "Argus-aarch64.dmg"
          ? "mac"
          : asset.name === "Argus-windows-x64-setup.exe"
            ? "win"
            : asset.name === "Argus-linux-x64.AppImage"
              ? "linux"
              : null;
      if (!field || typeof asset.browser_download_url !== "string") continue;
      try {
        const url = new URL(asset.browser_download_url);
        if (
          url.origin === "https://github.com" &&
          url.pathname ===
            `/archiboltmusk/Argus/releases/download/${release.tag_name}/${asset.name}`
        )
          entry[field] = url.href;
      } catch {
        /* Ignore malformed release metadata. */
      }
    }
    return entry.mac || entry.win || entry.linux ? [entry] : [];
  });
}
