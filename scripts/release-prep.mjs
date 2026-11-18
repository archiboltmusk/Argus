#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

function run(cmd, silent = false) {
  return execSync(cmd, { encoding: "utf8", stdio: silent ? "pipe" : "inherit" });
}

function runCapture(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: "pipe" }).trim();
  } catch {
    return "";
  }
}

const args = process.argv.slice(2);
let versionArg = args.find((a) => !a.startsWith("--"));
const shouldCommit = !args.includes("--no-commit");
const shouldTag = !args.includes("--no-tag");
const skipCheck = args.includes("--skip-check");

const pkgPath = resolve(process.cwd(), "package.json");
const tauriConfPath = resolve(process.cwd(), "src-tauri/tauri.conf.json");

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf8"));

if (!versionArg) {
  // Infer next patch version from latest git tag or package.json
  const latestTag = runCapture("git describe --tags --abbrev=0") || `v${pkg.version}`;
  const match = latestTag.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (match) {
    const [, maj, min, pat] = match;
    versionArg = `v${maj}.${min}.${Number(pat) + 1}`;
  } else {
    versionArg = `v${pkg.version}`;
  }
}

const cleanTag = versionArg.startsWith("v") ? versionArg : `v${versionArg}`;
const cleanVersion = cleanTag.replace(/^v/, "");

if (!/^\d+\.\d+\.\d+$/.test(cleanVersion)) {
  console.error(`Invalid version format: "${versionArg}". Expected format like "v3.17.13" or "3.17.13".`);
  process.exit(1);
}

console.log(`\n========================================`);
console.log(` Argus Release Preparation: ${cleanTag}`);
console.log(`========================================\n`);

// 1. Check git branch and status
const branch = runCapture("git rev-parse --abbrev-ref HEAD");
console.log(`Current branch: ${branch}`);

// 2. Check release notes
const releaseNotesPath = resolve(process.cwd(), `docs/releases/${cleanTag}.md`);
if (!existsSync(releaseNotesPath)) {
  console.log(`Generating release notes at: docs/releases/${cleanTag}.md`);
  const lastTag = runCapture("git describe --tags --abbrev=0") || "HEAD~10";
  const rawCommits = runCapture(`git log ${lastTag}..HEAD --oneline`) || "";
  const commitLines = rawCommits
    .split("\n")
    .map((l) => l.replace(/^[a-f0-9]+\s+/, "").trim())
    .filter((l) => l && !l.startsWith("chore(release)") && !l.includes("[release]"));

  let body = "";
  if (commitLines.length > 0) {
    body = commitLines.map((c) => `- **${c.split(":")[0] ?? "Update"}**: ${c.split(":").slice(1).join(":").trim() || c}`).join("\n") + "\n";
  } else {
    body = `- **General**: Maintenance, stability improvements, and platform packaging fixes.\n`;
  }
  writeFileSync(releaseNotesPath, body, "utf8");
} else {
  console.log(`Release notes verified: docs/releases/${cleanTag}.md`);
}

// 3. Stamp versions into package.json and tauri.conf.json
console.log(`Updating version to ${cleanVersion} in package.json and tauri.conf.json...`);
pkg.version = cleanVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");

tauriConf.version = cleanVersion;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n", "utf8");

// 4. Run typecheck if not skipped
if (!skipCheck) {
  console.log(`\nRunning TypeScript typecheck...`);
  try {
    run("pnpm run typecheck");
    console.log(`Typecheck passed successfully.`);
  } catch (err) {
    console.error(`Typecheck failed. Fix errors before creating release.`);
    process.exit(1);
  }
}

// 5. Commit and tag
if (shouldCommit) {
  console.log(`\nStaging files and committing release...`);
  run(`git add package.json src-tauri/tauri.conf.json docs/releases/${cleanTag}.md`);
  const commitMsg = `chore(release): prepare ${cleanTag} [release]`;
  try {
    run(`git commit -m "${commitMsg}"`);
  } catch {
    console.log("No new changes to commit.");
  }

  if (shouldTag) {
    console.log(`Creating annotated git tag ${cleanTag}...`);
    try {
      run(`git tag -a ${cleanTag} -m "Release ${cleanTag}"`);
      console.log(`Tag ${cleanTag} created successfully.`);
    } catch (err) {
      console.warn(`Tag ${cleanTag} already exists or failed to create.`);
    }
  }
}

console.log(`\n========================================`);
console.log(` Release ${cleanTag} Prepared Successfully!`);
console.log(`========================================`);
console.log(`To push and trigger CI build:`);
console.log(`  git push origin ${branch}`);
console.log(`  git push origin ${cleanTag}\n`);
