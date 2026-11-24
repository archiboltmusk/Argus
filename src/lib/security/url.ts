/**
 * Validates and sanitizes a media or image URL to ensure it cannot execute script
 * or trigger unexpected protocol actions (protects against XSS and open redirect).
 */
export function safeMediaUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Disallow protocol-relative URLs or backslash tricks
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.startsWith("\\\\")) {
    return null;
  }

  // Safe relative paths starting with a single forward slash
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return encodeURI(trimmed);
  }

  // Safe data URIs for images (excluding SVG which can contain active script tags)
  if (
    trimmed.startsWith("data:image/png;base64,") ||
    trimmed.startsWith("data:image/jpeg;base64,") ||
    trimmed.startsWith("data:image/webp;base64,") ||
    trimmed.startsWith("data:image/avif;base64,") ||
    trimmed.startsWith("data:image/gif;base64,")
  ) {
    return trimmed;
  }

  // Absolute http/https URLs with validated protocols
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch {
    return null;
  }
  return null;
}
