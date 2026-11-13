import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CHANGES_START = "<!-- argus:changes -->";
const CHANGES_END = "<!-- /argus:changes -->";
const INSTALLERS = [
  ["macOS", "Apple Silicon", "Argus-aarch64.dmg", "Download DMG"],
  ["macOS", "Intel", "Argus-x86_64.dmg", "Download DMG"],
  ["Windows", "x64", "Argus-windows-x64-setup.exe", "Download installer"],
  ["Windows", "x64", "Argus-windows-x64.msi", "Download MSI"],
  ["Linux", "x64", "Argus-linux-x64.AppImage", "Download AppImage"],
  ["Linux", "Debian / Ubuntu x64", "Argus-linux-x64.deb", "Download DEB"],
];

export function renderReleasePage(release, highlights = "") {
  if (!/^v\d+\.\d+\.\d+$/.test(release.tagName)) throw new Error("Expected a stable version tag");
  const assets = new Map(release.assets.map((asset) => [asset.name, asset]));
  const rows = INSTALLERS.flatMap(([os, device, name, label]) => {
    const asset = assets.get(name);
    if (!asset) return [];
    const url = new URL(asset.url);
    if (
      url.origin !== "https://github.com" ||
      !url.pathname.includes(`/releases/download/${release.tagName}/`) ||
      /[\s()]/.test(asset.url)
    ) {
      throw new Error(`Invalid installer download: ${name}`);
    }
    return [`| ${os} | ${device} | [${label}](${asset.url}) |`];
  });
  if (!rows.length) throw new Error("No published installers; refusing an empty download page");

  const body = release.body ?? "";
  const start = body.indexOf(CHANGES_START);
  const end = body.indexOf(CHANGES_END, start);
  let changes =
    start >= 0 && end > start ? body.slice(start + CHANGES_START.length, end).trim() : body.trim();
  // Remove the obsolete generated compatibility claim, retaining the actual changelog.
  changes = changes
    .replace(/^Apple Silicon \(M1 or newer\), macOS 11\+\.[^\n]*(?:\n|$)/, "")
    .trim();
  const lines = [
    "## Download Argus",
    "",
    "| Platform | Device | Download |",
    "| --- | --- | --- |",
    ...rows,
    "",
    "Already installed? Open **Settings → Updates** in Argus.",
    "",
  ];
  if (highlights.trim()) lines.push("## What's new", "", highlights.trim(), "");
  if (assets.has("Argus-aarch64.dmg") || assets.has("Argus-x86_64.dmg")) {
    lines.push(
      "<details>",
      "<summary>Install on macOS</summary>",
      "",
      "Open the DMG and drag Argus into Applications. On first launch, right-click Argus and choose Open if macOS asks for confirmation.",
      "",
      "</details>",
      "",
    );
  }
  if (changes)
    lines.push(
      "<details>",
      "<summary>Full changelog</summary>",
      "",
      CHANGES_START,
      changes,
      CHANGES_END,
      "",
      "</details>",
      "",
    );
  if (!changes) lines.push(CHANGES_START, CHANGES_END, "");
  return lines.join("\n");
}

export function publishReleasePage(tag, repo) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? "") || !/^[\w.-]+\/[\w.-]+$/.test(repo ?? "")) {
    throw new Error("Usage: node scripts/publish-release-page.mjs vX.Y.Z owner/repo");
  }
  const release = JSON.parse(
    execFileSync("gh", ["release", "view", tag, "--repo", repo, "--json", "tagName,body,assets"], {
      encoding: "utf8",
    }),
  );
  const highlightsPath = fileURLToPath(new URL(`../docs/releases/${tag}.md`, import.meta.url));
  const highlights = existsSync(highlightsPath) ? readFileSync(highlightsPath, "utf8") : "";
  const dir = mkdtempSync(join(tmpdir(), "argus-release-page-"));
  try {
    const notes = join(dir, "notes.md");
    writeFileSync(notes, renderReleasePage(release, highlights));
    execFileSync(
      "gh",
      ["release", "edit", tag, "--repo", repo, "--title", `Argus ${tag}`, "--notes-file", notes],
      { stdio: "inherit" },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  publishReleasePage(process.argv[2], process.argv[3]);
}
