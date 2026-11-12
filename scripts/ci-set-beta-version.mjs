// Stamps the beta version (MAJOR.MINOR.<run number>) and the updater public key
// into src-tauri/tauri.conf.json. Run by CI before a non-PR `tauri build`.
import { readFileSync, writeFileSync } from "node:fs";

const pubkey = (process.env.PUBKEY ?? "").trim();
const file = "src-tauri/tauri.conf.json";
const conf = JSON.parse(readFileSync(file, "utf8"));
const [major, minor] = conf.version.split(".");
// desktop.yml passes the Mac build's version so all platforms share one feed entry.
conf.version = process.env.ARGUS_VERSION || `${major}.${minor}.${process.env.GITHUB_RUN_NUMBER}`;
if (pubkey) {
  conf.plugins.updater.pubkey = pubkey;
} else {
  console.warn("::warning::TAURI_UPDATER_PUBKEY is not set; skipping updater pubkey stamp");
}
writeFileSync(file, JSON.stringify(conf, null, 2));
console.log("version", conf.version);
