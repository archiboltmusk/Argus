import { exportRedactedDiagnostics } from "@/lib/diagnostics/redact";
import { loadStoredSettings } from "@/lib/settings/load";

export type StorageCategoryUsage = {
  name: string;
  count: number;
  estimatedBytes: number;
  description: string;
};

export type StorageAuditResult = {
  totalEstimatedBytes: number;
  categories: StorageCategoryUsage[];
  credentialsAudit: {
    isolatedLocally: boolean;
    redactionVerified: boolean;
    leakedKeysDetected: number;
  };
};

export function runStorageAudit(): StorageAuditResult {
  const categories: Record<string, { count: number; bytes: number; desc: string }> = {
    "Watch History & Resume": { count: 0, bytes: 0, desc: "Playback positions, episode progress, and completed titles." },
    "Stream Ratings & Feedback": { count: 0, bytes: 0, desc: "Local upvotes, downvotes, and verified stream links." },
    "Addon Health & Telemetry": { count: 0, bytes: 0, desc: "Latency samples, failure counts, and uptime records." },
    "Lab & Observatory Rules": { count: 0, bytes: 0, desc: "Experience Contract policies and Decision Lab experiments." },
    "App Settings & Themes": { count: 0, bytes: 0, desc: "Player settings, UI themes, and configured providers." },
    "Other Cached Data": { count: 0, bytes: 0, desc: "Temporary view states, recent searches, and poster caches." },
  };

  let totalBytes = 0;

  try {
    if (typeof localStorage !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const val = localStorage.getItem(key) ?? "";
        const bytes = (key.length + val.length) * 2; // UTF-16 approx
        totalBytes += bytes;

        if (key.includes("history") || key.includes("playback") || key.includes("season-lock")) {
          categories["Watch History & Resume"].count += 1;
          categories["Watch History & Resume"].bytes += bytes;
        } else if (key.includes("stream-ratings") || key.includes("dead-links") || key.includes("verified-links")) {
          categories["Stream Ratings & Feedback"].count += 1;
          categories["Stream Ratings & Feedback"].bytes += bytes;
        } else if (key.includes("addonHealth")) {
          categories["Addon Health & Telemetry"].count += 1;
          categories["Addon Health & Telemetry"].bytes += bytes;
        } else if (key.includes("argus.lab") || key.includes("experience-contract")) {
          categories["Lab & Observatory Rules"].count += 1;
          categories["Lab & Observatory Rules"].bytes += bytes;
        } else if (key.includes("settings") || key.includes("theme")) {
          categories["App Settings & Themes"].count += 1;
          categories["App Settings & Themes"].bytes += bytes;
        } else {
          categories["Other Cached Data"].count += 1;
          categories["Other Cached Data"].bytes += bytes;
        }
      }
    }
  } catch {
    /* ignore */
  }

  // Credentials audit: verify redaction and credential safety
  const settings = loadStoredSettings();
  const sensitiveKeys = [
    settings.rdKey,
    settings.tbKey,
    settings.adKey,
    settings.pmKey,
    settings.traktClientSecret,
    settings.tmdbKey,
  ].filter(Boolean);

  let leakedKeysDetected = 0;
  let redactionVerified = true;

  try {
    const redactedExport = exportRedactedDiagnostics(settings);
    for (const key of sensitiveKeys) {
      if (key && key.length > 5 && redactedExport.includes(key)) {
        leakedKeysDetected += 1;
        redactionVerified = false;
      }
    }
  } catch {
    redactionVerified = false;
  }

  return {
    totalEstimatedBytes: totalBytes,
    categories: Object.entries(categories).map(([name, data]) => ({
      name,
      count: data.count,
      estimatedBytes: data.bytes,
      description: data.desc,
    })),
    credentialsAudit: {
      isolatedLocally: true,
      redactionVerified,
      leakedKeysDetected,
    },
  };
}

export function clearTransientStorage(): { clearedCount: number; bytesFreed: number } {
  let clearedCount = 0;
  let bytesFreed = 0;
  try {
    if (typeof localStorage !== "undefined") {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("argus:temp:") || key.startsWith("argus:cache:") || key.includes("__probe__"))) {
          keysToRemove.push(key);
        }
      }
      for (const k of keysToRemove) {
        const val = localStorage.getItem(k) ?? "";
        bytesFreed += (k.length + val.length) * 2;
        localStorage.removeItem(k);
        clearedCount += 1;
      }
    }
  } catch {
    /* ignore */
  }
  return { clearedCount, bytesFreed };
}
