/**
 * Debrid Token Vault & URL Redaction Engine
 *
 * Prevents accidental disclosure of private Real-Debrid, TorBox, AllDebrid,
 * Premiumize, and Debrid-Link credentials in URLs, clipboard copies, bug reports, and export backups.
 */

export const REDACTED_TOKEN_PLACEHOLDER = "***REDACTED_DEBRID_TOKEN***";

// Real-Debrid / AllDebrid / Premiumize / TorBox key assignments in path segments (e.g. realdebrid=xyz)
const PATH_DEBRID_KEY_REGEX = /((?:realdebrid|alldebrid|premiumize|torbox|debridlink)=)([A-Za-z0-9_-]{16,})/gi;

// Raw 32-64 char tokens directly preceding /manifest.json
const RD_TOKEN_REGEX = /(https?:\/\/[^\/]+\/)([A-Za-z0-9%_-]{24,64})(\/manifest\.json)/gi;

// Query parameter tokens (?api_key=..., &token=...)
const QUERY_TOKEN_REGEX = /([?&](?:api_?key|token|auth|key)=)([A-Za-z0-9_-]{16,})/gi;

// Addon path-embedded credentials (e.g. torrentio, comet, mediafusion)
const ADDON_URL_TOKEN_REGEX = /((?:strem\.fun|comet|mediafusion)[^\/]*\/)([A-Za-z0-9%_=-]{20,})/gi;

/**
 * Sanitizes a URL by replacing sensitive Debrid tokens with a safe redaction placeholder.
 */
export function redactDebridUrl(url?: string | null): string {
  if (!url || typeof url !== "string") return "";

  let sanitized = url.replace(PATH_DEBRID_KEY_REGEX, `$1${REDACTED_TOKEN_PLACEHOLDER}`);
  sanitized = sanitized.replace(QUERY_TOKEN_REGEX, `$1${REDACTED_TOKEN_PLACEHOLDER}`);
  sanitized = sanitized.replace(ADDON_URL_TOKEN_REGEX, `$1${REDACTED_TOKEN_PLACEHOLDER}`);
  sanitized = sanitized.replace(RD_TOKEN_REGEX, `$1${REDACTED_TOKEN_PLACEHOLDER}$3`);

  return sanitized;
}

/**
 * Recursively redacts sensitive debrid tokens and credentials from any object,
 * config payload, or bug report before exporting or saving to disk.
 */
export function redactObject<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return redactDebridUrl(value) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactObject(item)) as unknown as T;
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("debrid") &&
        (lowerKey.includes("key") || lowerKey.includes("token") || lowerKey.includes("secret"))
      ) {
        result[key] = REDACTED_TOKEN_PLACEHOLDER;
      } else {
        result[key] = redactObject(val);
      }
    }
    return result as T;
  }

  return value;
}

/**
 * Sanitizes text prior to writing to system clipboard unless the user explicitly
 * copied a raw token alone.
 */
export function sanitizeClipboardForExport(text: string): string {
  if (!text) return "";
  // If the string is a URL or JSON object, redact any embedded tokens
  if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("{") || text.startsWith("[")) {
    return redactDebridUrl(text);
  }
  return text;
}
