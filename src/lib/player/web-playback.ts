import { isWeb } from "@/lib/platform";

/**
 * A browser page served over https cannot load plain-http media. The desktop
 * app has no such restriction, so this only ever reports true on the web build.
 */
export function isMixedContentSource(url: string): boolean {
  if (!isWeb() || typeof window === "undefined") return false;
  if (window.location.protocol !== "https:" || !/^http:\/\//i.test(url)) return false;
  // Browsers treat localhost / 127.0.0.1 / [::1] companion streaming servers as
  // potentially trustworthy origins even when the page is loaded over HTTPS.
  return !/^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?(?:\/|$)/i.test(url);
}
