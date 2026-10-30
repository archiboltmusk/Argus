#!/usr/bin/env node
/**
 * Theme Token Consistency Linter
 * Ensures views in src/views follow Argus semantic design tokens:
 * - Surfaces: bg-canvas, bg-surface, bg-elevated, bg-raised
 * - Text: text-ink, text-ink-muted, text-ink-subtle
 * - Borders: border-edge, border-edge-soft
 * - Accents: bg-accent, text-accent, bg-accent-soft
 */

import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

const VIEWS_DIR = "src/views";
const TARGET_VIEWS = ["education", "argus-lab.tsx", "sports", "games", "dj-deck-app.tsx"];

function collectFiles(dir, exts = [".tsx", ".css"]) {
  const results = [];
  try {
    const list = readdirSync(dir);
    for (const item of list) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...collectFiles(fullPath, exts));
      } else if (exts.some((ext) => item.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

const files = collectFiles(VIEWS_DIR).filter((f) =>
  TARGET_VIEWS.some((target) => f.includes(target))
);

let totalIssues = 0;

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    // Flag unmapped raw palette colors like bg-zinc-900 or text-gray-400 in main UI components
    const badPatterns = [
      /\bbg-(?:zinc|neutral|slate)-(?:800|900|950)\b/g,
      /\btext-gray-[345]00\b/g,
      /\bborder-gray-[78]00\b/g,
    ];

    for (const pattern of badPatterns) {
      const match = line.match(pattern);
      if (match) {
        console.warn(`[Theme Token Warning] ${file}:${index + 1}: Found '${match[0]}' -> Prefer semantic token (e.g. bg-surface, text-ink-muted, border-edge)`);
        totalIssues++;
      }
    }
  });
}

if (totalIssues === 0) {
  console.log(`✔ All audited view tabs (${files.length} files) adhere to Argus semantic design tokens.`);
  process.exit(0);
} else {
  console.log(`ℹ Found ${totalIssues} legacy token warnings across audited view tabs.`);
  process.exit(0);
}
