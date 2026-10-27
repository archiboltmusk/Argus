#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const inventoryPath = resolve(__dirname, "../docs/feature-inventory.json");

const ALLOWED_STATUSES = new Set(["implemented", "partial", "experimental", "planned", "missing"]);
const REQUIRED_PLATFORMS = ["macOS", "windows", "linux", "android"];

function validate() {
  const raw = readFileSync(inventoryPath, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data.features)) {
    console.error("Error: 'features' must be an array");
    process.exit(1);
  }

  const seenIds = new Set();
  const counts = {
    totalFeatures: data.features.length,
    implemented: 0,
    partial: 0,
    experimental: 0,
    planned: 0,
    missing: 0,
  };

  const errors = [];

  for (let i = 0; i < data.features.length; i++) {
    const f = data.features[i];
    const prefix = `Feature #${i + 1} (${f.id ?? "unknown"})`;

    if (!f.id || typeof f.id !== "string" || !f.id.startsWith("feat-")) {
      errors.push(`${prefix}: id must be a string starting with 'feat-'`);
    } else if (seenIds.has(f.id)) {
      errors.push(`${prefix}: duplicate id '${f.id}'`);
    } else {
      seenIds.add(f.id);
    }

    if (!f.name || typeof f.name !== "string") {
      errors.push(`${prefix}: name is required`);
    }

    if (!f.category || typeof f.category !== "string") {
      errors.push(`${prefix}: category is required`);
    }

    if (!f.description || typeof f.description !== "string") {
      errors.push(`${prefix}: description is required`);
    }

    if (!Array.isArray(f.sourceFiles) || f.sourceFiles.length === 0) {
      errors.push(`${prefix}: sourceFiles must be a non-empty array`);
    }

    if (!Array.isArray(f.entryPoints) || f.entryPoints.length === 0) {
      errors.push(`${prefix}: entryPoints must be a non-empty array`);
    }

    if (!ALLOWED_STATUSES.has(f.status)) {
      errors.push(`${prefix}: status '${f.status}' is invalid`);
    } else {
      counts[f.status] = (counts[f.status] || 0) + 1;
    }

    if (!f.platformCompatibility || typeof f.platformCompatibility !== "object") {
      errors.push(`${prefix}: platformCompatibility must be an object`);
    } else {
      for (const p of REQUIRED_PLATFORMS) {
        if (!f.platformCompatibility[p]) {
          errors.push(`${prefix}: platformCompatibility missing '${p}'`);
        }
      }
    }

    if (!f.acceptanceCriterion || typeof f.acceptanceCriterion !== "string") {
      errors.push(`${prefix}: acceptanceCriterion is required`);
    }
  }

  if (errors.length > 0) {
    console.error("Feature inventory validation failed with errors:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }

  // Remove zero-count status fields if not in schema
  const cleanSummary = {
    totalFeatures: counts.totalFeatures,
    implemented: counts.implemented,
    partial: counts.partial,
    experimental: counts.experimental,
    planned: counts.planned,
  };

  const currentSummary = data.summary ?? {};
  const mismatch =
    currentSummary.totalFeatures !== cleanSummary.totalFeatures ||
    currentSummary.implemented !== cleanSummary.implemented ||
    currentSummary.partial !== cleanSummary.partial ||
    currentSummary.experimental !== cleanSummary.experimental ||
    currentSummary.planned !== cleanSummary.planned;

  if (mismatch) {
    console.log("Syncing feature inventory summary counts:");
    console.log("  Previous:", currentSummary);
    console.log("  Updated: ", cleanSummary);
    data.summary = cleanSummary;
    writeFileSync(inventoryPath, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log("Synced docs/feature-inventory.json successfully.");
  } else {
    console.log(`Validated ${counts.totalFeatures} features. Summary counts match perfectly:`);
    console.log(`  Implemented:  ${counts.implemented}`);
    console.log(`  Partial:      ${counts.partial}`);
    console.log(`  Experimental: ${counts.experimental}`);
    console.log(`  Planned:      ${counts.planned}`);
  }
}

validate();
