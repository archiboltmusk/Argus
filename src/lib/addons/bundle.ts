export type AddonBundleEntry = {
  transportUrl: string;
  id?: string;
  name?: string;
};

export type AddonBundle = {
  format: "argus-addon-bundle";
  version: 1;
  exportedAt: string;
  addons: AddonBundleEntry[];
};

/**
 * Serializes installed addons into a portable JSON bundle compatible with Argus & Stremio URLs.
 */
export function exportAddonBundle(
  addons: ReadonlyArray<{ transportUrl: string; id?: string; manifest?: { id?: string; name?: string } | null }>,
): string {
  const seen = new Set<string>();
  const entries: AddonBundleEntry[] = [];
  for (const item of addons) {
    const url = (item.transportUrl ?? "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    entries.push({
      transportUrl: url,
      id: item.manifest?.id ?? item.id,
      name: item.manifest?.name,
    });
  }
  const bundle: AddonBundle = {
    format: "argus-addon-bundle",
    version: 1,
    exportedAt: new Date().toISOString(),
    addons: entries,
  };
  return JSON.stringify(bundle, null, 2);
}

/**
 * Parses an Argus bundle JSON, Stremio/AIOManager JSON, or newline-separated manifest URLs.
 */
export function parseAddonBundle(raw: string): AddonBundleEntry[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const seen = new Set<string>();
  const entries: AddonBundleEntry[] = [];

  const pushUrl = (url: string | undefined, id?: string, name?: string) => {
    const clean = (url ?? "").trim();
    if (!/^https?:\/\//i.test(clean) || seen.has(clean)) return;
    seen.add(clean);
    entries.push({ transportUrl: clean, id, name });
  };

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { addons?: unknown[] }).addons)
        ? (parsed as { addons: unknown[] }).addons
        : [];
    for (const item of list) {
      if (typeof item === "string") {
        pushUrl(item);
      } else if (typeof item === "object" && item !== null) {
        const obj = item as { transportUrl?: string; url?: string; id?: string; name?: string; manifest?: { id?: string; name?: string } };
        pushUrl(
          obj.transportUrl ?? obj.url,
          obj.manifest?.id ?? obj.id,
          obj.manifest?.name ?? obj.name,
        );
      }
    }
    return entries;
  }

  for (const line of trimmed.split(/\r?\n/)) {
    pushUrl(line);
  }
  return entries;
}

/**
 * Installs entries from a parsed bundle while skipping already-installed transport URLs.
 */
export async function importAddonBundle(
  raw: string,
  existingUrls: ReadonlySet<string>,
  installFn: (id: string, transportUrl: string) => Promise<unknown>,
): Promise<{ installed: number; skipped: number; failed: number }> {
  const entries = parseAddonBundle(raw);
  let installed = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of entries) {
    if (existingUrls.has(entry.transportUrl)) {
      skipped++;
      continue;
    }
    try {
      const fallbackId = entry.id || entry.transportUrl;
      await installFn(fallbackId, entry.transportUrl);
      installed++;
    } catch {
      failed++;
    }
  }

  return { installed, skipped, failed };
}
