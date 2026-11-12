import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Reject incomplete feeds before replacing a working release's update metadata.
export function validateUpdateManifest(manifest, { version, required = [] } = {}) {
  if (
    !manifest ||
    typeof manifest.version !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(manifest.version)
  ) {
    throw new Error("Update manifest must contain a valid version");
  }
  if (version && manifest.version !== version)
    throw new Error("Update manifest version does not match release");
  const platforms = manifest.platforms;
  if (
    !platforms ||
    Array.isArray(platforms) ||
    typeof platforms !== "object" ||
    !Object.keys(platforms).length
  ) {
    throw new Error("Update manifest has no platforms");
  }
  for (const platform of required) {
    if (!Object.hasOwn(platforms, platform))
      throw new Error(`Update manifest is missing ${platform}`);
  }
  for (const [platform, entry] of Object.entries(platforms)) {
    if (!entry || typeof entry.signature !== "string" || !entry.signature.trim()) {
      throw new Error(`Update manifest has no signature for ${platform}`);
    }
    const url = new URL(entry.url);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) {
      throw new Error(`Update manifest has an unsafe URL for ${platform}`);
    }
  }
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, version, ...required] = process.argv.slice(2);
  validateUpdateManifest(JSON.parse(readFileSync(file, "utf8")), { version, required });
  console.log("Update manifest validated");
}
