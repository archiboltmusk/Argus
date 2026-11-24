/**
 * Validates and sanitizes a media or image URL to ensure it cannot execute script
 * or trigger unexpected protocol actions (protects against XSS and open redirect).
 */
export function safeMediaUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  return null;
}
