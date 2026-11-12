// Stamps the beta version (MAJOR.MINOR.<run number>) and the updater public key
// into src-tauri/tauri.conf.json. Run by CI before a non-PR `tauri build`.
import { readFileSync, writeFileSync } from "node:fs";

const pubkey = (process.env.PUBKEY ?? "").trim();
if (!pubkey) {
  console.error("::error::TAURI_UPDATER_PUBKEY is required for a release build");
  process.exit(1);
}
const file = "src-tauri/tauri.conf.json";
const conf = JSON.parse(readFileSync(file, "utf8"));
const [major, minor] = conf.version.split(".");
// desktop.yml passes the Mac build's version so all platforms share one feed entry.
const requested = process.env.ARGUS_VERSION?.trim().replace(/^v/, "");
const version = requested || `${major}.${minor}.${process.env.GITHUB_RUN_NUMBER}`;
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("::error::Invalid release version");
  process.exit(1);
}
conf.version = version;
conf.plugins.updater.pubkey = pubkey;
const packageFile = "package.json";
const pkg = JSON.parse(readFileSync(packageFile, "utf8"));
pkg.version = version;
writeFileSync(packageFile, JSON.stringify(pkg, null, 2) + "\n");
writeFileSync(file, JSON.stringify(conf, null, 2));
console.log("version", conf.version);
