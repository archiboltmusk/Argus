#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = process.cwd();
const UI_FALLBACK_PATH = resolve(ROOT, "src/lib/i18n/locales/ui-fallback.ts");

const CALL = /\b(?:t|tr)\(\s*(["'])((?:\\.|(?!\1)[^\\])*?)\1/g;
const KEY = /^\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([A-Za-z_$][A-Za-z0-9_$]*))\s*:/gm;
const LANGS = [
  "ar", "de", "es", "fr", "hi", "id", "it", "ja", "ko", "pl", "pt", "ru", "tr", "vi", "zh"
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry.startsWith(".") || entry === "node_modules" || entry === "locales") continue;
    try {
      const st = statSync(full);
      if (st.isDirectory()) walk(full, out);
      else if (/\.(tsx?|jsx?|mjs)$/.test(entry) && !entry.endsWith(".d.ts")) out.push(full);
    } catch {}
  }
  return out;
}

function uiStrings() {
  const out = new Set();
  for (const f of walk(resolve(ROOT, "src"))) {
    const src = readFileSync(f, "utf8");
    let m;
    CALL.lastIndex = 0;
    while ((m = CALL.exec(src))) {
      const k = m[2].replace(/\\"/g, '"').replace(/\\'/g, "'");
      if (k && k.length <= 300) out.add(k);
    }
  }

  try {
    const ageGate = readFileSync(resolve(ROOT, "src/components/age-gate-modal.tsx"), "utf8");
    const bankStart = ageGate.indexOf("const QUESTION_BANK");
    const bankEnd = ageGate.indexOf("const AR_QUESTION_BANK", bankStart);
    if (bankStart >= 0 && bankEnd > bankStart) {
      const questionBlock = ageGate.slice(bankStart, bankEnd);
      for (const match of questionBlock.matchAll(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g)) {
        const key = match[2].replace(/\\(["'\\])/g, "$1");
        if (key) out.add(key);
      }
    }
  } catch {}

  return out;
}

function localeKeys(lang) {
  const out = new Set();
  const files = [
    resolve(ROOT, `src/lib/i18n/locales/${lang}.ts`),
    resolve(ROOT, "src/lib/i18n/locales/ui-fallback.ts"),
    resolve(ROOT, "src/lib/i18n/locales/context-actions-fallback.ts"),
  ];

  const dir = resolve(ROOT, `src/lib/i18n/locales/${lang}/`);
  try {
    for (const e of readdirSync(dir)) {
      if (e.endsWith(".ts")) files.push(resolve(dir, e));
    }
  } catch {}

  for (const f of files) {
    try {
      const src = readFileSync(f, "utf8");
      let m;
      KEY.lastIndex = 0;
      while ((m = KEY.exec(src))) {
        const key = m[1] ?? m[2] ?? m[3];
        out.add(key.replace(/\\"/g, '"').replace(/\\'/g, "'"));
      }
    } catch {}
  }
  return out;
}

const strings = uiStrings();
const missingMap = new Map();

for (const lang of LANGS) {
  const have = localeKeys(lang);
  for (const str of strings) {
    if (!have.has(str)) {
      missingMap.set(str, true);
    }
  }
}

const missing = Array.from(missingMap.keys());

if (missing.length === 0) {
  console.log("✓ All UI strings are 100% covered across all languages.");
  process.exit(0);
}

console.log(`Auto-healing: Found ${missing.length} missing UI string(s) across languages:`);
for (const s of missing.slice(0, 5)) {
  console.log(`  + ${JSON.stringify(s)}`);
}
if (missing.length > 5) console.log(`  ... and ${missing.length - 5} more`);

const fallbackContent = readFileSync(UI_FALLBACK_PATH, "utf8");
const insertMarker = "const uiFallback: Record<string, string> = {";
const insertPoint = fallbackContent.indexOf(insertMarker);

if (insertPoint === -1) {
  console.error("Could not find insertion marker in ui-fallback.ts");
  process.exit(1);
}

const afterOpenBrace = insertPoint + insertMarker.length;
const newEntries = missing
  .map((str) => `\n  ${JSON.stringify(str)}: ${JSON.stringify(str)},`)
  .join("");

const updatedContent =
  fallbackContent.slice(0, afterOpenBrace) +
  newEntries +
  fallbackContent.slice(afterOpenBrace);

writeFileSync(UI_FALLBACK_PATH, updatedContent, "utf8");
console.log(`✓ Successfully updated src/lib/i18n/locales/ui-fallback.ts!`);
