import { isWeb } from "@/lib/platform";

/**
 * A browser page served over https cannot load plain-http media. The desktop
 * app has no such restriction, so this only ever reports true on the web build.
 */
export function isMixedContentSource(url: string): boolean {
  if (!isWeb() || typeof window === "undefined") return false;
  return window.location.protocol === "https:" && /^http:\/\//i.test(url);
}
