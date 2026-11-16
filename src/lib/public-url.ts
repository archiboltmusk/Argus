/**
 * Resolves a root-relative public asset path (e.g. "/player-icons/back.svg") against
 * Vite's configured `BASE_URL` (e.g. "/Argus/" on GitHub Pages, "./" in Tauri bundles,
 * or "/" in local dev) so icons and static assets never 404 on subpath deployments.
 */
export function publicAssetUrl(path: string, baseOverride?: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return path;
  const rawBase =
    baseOverride ??
    (typeof import.meta !== "undefined"
      ? ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/")
      : "/");

  if (!rawBase || rawBase === "/") return path;
  if (rawBase === "./") return `.${path}`;
  if (rawBase.startsWith("/")) {
    const cleanBase = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
    if (!cleanBase || path === cleanBase || path.startsWith(`${cleanBase}/`)) {
      return path;
    }
    return `${cleanBase}${path}`;
  }
  return path;
}
