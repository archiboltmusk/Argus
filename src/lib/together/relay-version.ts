export const REQUIRED_RELAY_VERSION = 11;
export const ARGUS_PUBLIC_RELAY = "wss://pub.arguscommunity.site";

export function migratePublicRelayUrl(url: string): string {
  return /^(?:(?:wss?|https?):\/\/)?(?:pub\.argus\.site|argus\.invalid)\/?$/i.test(url.trim())
    ? ARGUS_PUBLIC_RELAY
    : url;
}

export function relayOutdated(version: number | null | undefined): boolean {
  return version == null || version < REQUIRED_RELAY_VERSION;
}

export function isPublicRelay(url: string): boolean {
  const host = url
    .trim()
    .toLowerCase()
    .replace(/^(wss?|https?):\/\//, "")
    .replace(/\/.*$/, "");
  return host === "pub.arguscommunity.site";
}
