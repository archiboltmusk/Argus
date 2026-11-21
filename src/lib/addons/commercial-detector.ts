import type { Addon } from "@/lib/addons";

export type AddonManifest = Addon["manifest"];

const ZERO_WIDTH_RX = /[\u200B-\u200D\uFEFF]/g;

/**
 * Patterns matching known commercial / subscription-gated addons that require
 * an external paid account or trial key, returning paywall stubs without one.
 */
const COMMERCIAL_ID_OR_NAME_RX =
  /\b(roxxy|just[\s._-]*porn|adult[\s._-]*video[\s._-]*hd|paywall|paid[\s._-]*streams|subscription[\s._-]*hub|vip[\s._-]*pass|commercial[\s._-]*streams)\b/i;

const COMMERCIAL_DESC_RX =
  /(?:all-access\s+is\s+\$|\$\d+\s+lifetime|paid\s+(?:subscription|membership|add-on|access)|subscription\s+required|requires?\s+(?:a\s+)?paid\s+(?:account|subscription|token)|(?:1-hour|free\s+1-hour)\s+trial|playback\s+is\s+locked|auto-activation|vip\s+access\s+required|buy\s+subscription|paid\s+access\s+only|subscribe\s+to\s+unlock|unlock\s+all\s+titles)/i;

const COMMERCIAL_URL_RX =
  /(?:roxxy[\s._-]*hub|roxxy|just[\s._-]*porn|adult[\s._-]*video[\s._-]*hd|paywall[\s._-]*streams)/i;

export interface CommercialAddonInfo {
  isCommercial: boolean;
  name: string;
  reason?: string;
}

export function isCommercialAddon(
  target:
    | Addon
    | AddonManifest
    | { id?: string; name?: string; description?: string; transportUrl?: string }
    | string
    | null
    | undefined,
): CommercialAddonInfo {
  if (!target) return { isCommercial: false, name: "" };

  if (typeof target === "string") {
    const raw = target.trim();
    if (COMMERCIAL_URL_RX.test(raw) || COMMERCIAL_ID_OR_NAME_RX.test(raw)) {
      return {
        isCommercial: true,
        name: raw,
        reason: "This addon is known to require a commercial third-party subscription or payment.",
      };
    }
    return { isCommercial: false, name: raw };
  }

  const manifest = "manifest" in target ? target.manifest : target;
  const id = (("id" in target ? target.id : undefined) ?? manifest?.id ?? "").replace(ZERO_WIDTH_RX, "").trim();
  const name = (("name" in target ? target.name : undefined) ?? manifest?.name ?? id).replace(ZERO_WIDTH_RX, "").trim();
  const description = (manifest?.description ?? ("description" in target ? target.description ?? "" : "")).replace(ZERO_WIDTH_RX, "");
  const transportUrl = ("transportUrl" in target ? target.transportUrl ?? "" : "").replace(ZERO_WIDTH_RX, "");

  if (COMMERCIAL_ID_OR_NAME_RX.test(id) || COMMERCIAL_ID_OR_NAME_RX.test(name)) {
    return {
      isCommercial: true,
      name,
      reason: "This addon is known to require a commercial third-party subscription or payment.",
    };
  }

  if (COMMERCIAL_URL_RX.test(transportUrl)) {
    return {
      isCommercial: true,
      name,
      reason: "The addon server hosts commercial paywalled content requiring paid access.",
    };
  }

  if (COMMERCIAL_DESC_RX.test(description)) {
    return {
      isCommercial: true,
      name,
      reason: "The addon description specifies that a paid subscription or account is required.",
    };
  }

  return { isCommercial: false, name };
}
