import type { Addon } from "@/lib/addons";

export type AddonManifest = Addon["manifest"];

/**
 * Patterns matching known commercial / subscription-gated addons that require
 * an external paid account or trial key, returning paywall stubs without one.
 */
const COMMERCIAL_ID_OR_NAME_RX =
  /\b(roxxy|justporn|adult[\s._-]*video[\s._-]*hd|paywall|paid[\s._-]*streams|subscription[\s._-]*hub|vip[\s._-]*pass)\b/i;

const COMMERCIAL_DESC_RX =
  /(?:all-access\s+is\s+\$|\$\d+\s+lifetime|paid\s+(?:subscription|membership|add-on)|subscription\s+required|requires?\s+(?:a\s+)?paid\s+(?:account|subscription)|1-hour\s+trial|free\s+for\s+1\s+hour|playback\s+is\s+locked|auto-activation)/i;

const COMMERCIAL_URL_RX =
  /(?:roxxyhub|justporn|adultvideohd|paywall-streams)/i;

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
  const id = (("id" in target ? target.id : undefined) ?? manifest?.id ?? "").trim();
  const name = (("name" in target ? target.name : undefined) ?? manifest?.name ?? id).trim();
  const description = manifest?.description ?? ("description" in target ? target.description ?? "" : "");
  const transportUrl = "transportUrl" in target ? target.transportUrl ?? "" : "";

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
