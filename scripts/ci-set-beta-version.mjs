// Stamps the beta version (MAJOR.MINOR.<run number>) and the updater public key
// into src-tauri/tauri.conf.json. Run by CI before a non-PR `tauri build`.
import { readFileSync, writeFileSync } from "node:fs";

const pubkey = (process.env.PUBKEY ?? "").trim();
if (!pubkey) {
  console.error("::error::Add the TAURI_UPDATER_PUBKEY repo variable to publish updates");
  process.exit(1);
}
const file = "src-tauri/tauri.conf.json";
const conf = JSON.parse(readFileSync(file, "utf8"));
const [major, minor] = conf.version.split(".");
// desktop.yml passes the Mac build's version so all platforms share one feed entry.
conf.version = process.env.ARGUS_VERSION || `${major}.${minor}.${process.env.GITHUB_RUN_NUMBER}`;
conf.plugins.updater.pubkey = pubkey;
writeFileSync(file, JSON.stringify(conf, null, 2));
console.log("version", conf.version);
