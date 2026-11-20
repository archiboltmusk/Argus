export const REQUIRED_RELAY_VERSION = 11;
export const HARBOR_PUBLIC_RELAY = "wss://pub.harborcommunity.site";
export const ARGUS_PUBLIC_RELAY =
  import.meta.env?.VITE_ARGUS_PUBLIC_RELAY?.trim() || HARBOR_PUBLIC_RELAY;

function relayHost(url: string): string {
  return url.trim().toLowerCase().replace(/^(wss?|https?):\/\//, "").replace(/\/.*$/, "");
}

export function migratePublicRelayUrl(url: string): string {
  return /^(?:(?:wss?|https?):\/\/)?(?:pub\.argus\.site|pub\.arguscommunity\.site|argus\.invalid)\/?$/i.test(url.trim())
    ? ARGUS_PUBLIC_RELAY
    : url;
}

export function relayOutdated(version: number | null | undefined): boolean {
  return version == null || version < REQUIRED_RELAY_VERSION;
}

export function isPublicRelay(url: string): boolean {
  const host = relayHost(url);
  return host === relayHost(ARGUS_PUBLIC_RELAY) ||
    host === "pub.arguscommunity.site" || host === "pub.harborcommunity.site";
}
