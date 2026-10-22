export const REQUIRED_RELAY_VERSION = 10;
export const ARGUS_PUBLIC_RELAY = "https://argus.invalid";

export function relayOutdated(version: number | null | undefined): boolean {
  return version == null || version < REQUIRED_RELAY_VERSION;
}

export function isPublicRelay(url: string): boolean {
  const host = url
    .trim()
    .toLowerCase()
    .replace(/^(wss?|https?):\/\//, "")
    .replace(/\/.*$/, "");
  return host === "github.com/archiboltmusk/Argus";
}
