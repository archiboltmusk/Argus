export const EXTERNAL_LINK_PREFERENCE_KEY = "argus.external-link-destination.v1";

export type ExternalLinkDestinationPreference = "browser" | "argus";
export type ExternalLinkPreferenceStorage = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): ExternalLinkPreferenceStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readExternalLinkDestinationPreference(
  storage: ExternalLinkPreferenceStorage | null = browserStorage(),
): ExternalLinkDestinationPreference {
  if (!storage) return "browser";
  try {
    return storage.getItem(EXTERNAL_LINK_PREFERENCE_KEY) === "argus" ? "argus" : "browser";
  } catch {
    return "browser";
  }
}

export function writeExternalLinkDestinationPreference(
  preference: ExternalLinkDestinationPreference,
  storage: ExternalLinkPreferenceStorage | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(EXTERNAL_LINK_PREFERENCE_KEY, preference);
  } catch {
    // Opening the link remains available when persistence is unavailable.
  }
}

export function resolveExternalLinkActionLayout(
  preference: ExternalLinkDestinationPreference,
  canOpenInArgus: boolean,
): {
  main: ExternalLinkDestinationPreference;
  alternate: ExternalLinkDestinationPreference | null;
} {
  if (!canOpenInArgus) return { main: "browser", alternate: null };
  return preference === "argus"
    ? { main: "argus", alternate: "browser" }
    : { main: "browser", alternate: "argus" };
}
