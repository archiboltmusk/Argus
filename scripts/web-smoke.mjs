// Loads the static web build in headless Chromium and fails if the React root
// never renders. Usage: node scripts/web-smoke.mjs <url>
// PLAYWRIGHT_DIR points at a directory that has `playwright` installed.
import { createRequire } from "node:module";

const url = process.argv[2];
if (!url) throw new Error("usage: web-smoke.mjs <url>");
const require = createRequire(`${process.env.PLAYWRIGHT_DIR ?? process.cwd()}/`);
const { chromium } = require("playwright");

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
const failed = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("requestfailed", (r) => {
  if (new URL(r.url()).origin === new URL(url).origin) failed.push(r.url());
});
await page.goto(url, { waitUntil: "load" });
let rendered = true;
try {
  await page.waitForFunction(() => (document.getElementById("root")?.childElementCount ?? 0) > 0, null, {
    timeout: 30000,
  });
} catch {
  rendered = false;
}
await page.screenshot({ path: "web-smoke.png" });
await browser.close();
console.log("page errors:", errors.length ? errors : "none");
console.log("failed same-origin requests:", failed.length ? failed : "none");
if (!rendered || failed.length) {
  console.error(rendered ? "same-origin requests failed" : "#root never rendered");
  process.exit(1);
}
console.log("web smoke ok");
