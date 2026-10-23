import { invoke } from "@tauri-apps/api/core";

const TRUSTED_KEYS = "argus.plugin.trusted-keys.v1";
const KEY_PREFIX = "ed25519:";

export type PluginTrust = {
  /** The entry carries a signature and a key. */
  signed: boolean;
  /** The signature checks out against that key. A signed entry that fails is refused outright. */
  valid: boolean;
  /** The user accepted this key on an earlier install. */
  keyKnown: boolean;
  signer: string | null;
};

export type UntrustedPluginInfo = {
  name: string;
  author?: string;
  hosts: string[];
  signer: string | null;
};

type Prompt = (info: UntrustedPluginInfo) => Promise<boolean>;

let prompt: Prompt | null = null;

/** The settings panel registers the dialog. With none registered nothing asks, so nothing installs. */
export function setUntrustedPluginPrompt(fn: Prompt | null): void {
  prompt = fn;
}

export async function confirmUntrustedPlugin(info: UntrustedPluginInfo): Promise<boolean> {
  return prompt ? prompt(info) : false;
}

/** The line an author signs. Binding the id, version and hash means a signature cannot be moved to
 * a different plugin or a different build. */
export function signedMessage(entry: { id: string; version: string; sha256?: string }): string {
  return `argus.plugin/1\n${entry.id}\n${entry.version}\n${entry.sha256 ?? ""}`;
}

function readKeys(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(TRUSTED_KEYS) ?? "[]");
    return Array.isArray(raw) ? raw.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

export function rememberTrustedKey(signer: string): void {
  const keys = readKeys();
  if (keys.includes(signer)) return;
  try {
    localStorage.setItem(TRUSTED_KEYS, JSON.stringify([...keys, signer]));
  } catch {
    /* storage unavailable: the key is asked about again next time */
  }
}

export async function assessTrust(entry: {
  id: string;
  version: string;
  sha256?: string;
  publicKey?: string;
  signature?: string;
}): Promise<PluginTrust> {
  const { publicKey, signature } = entry;
  if (!publicKey || !signature || !entry.sha256) {
    return { signed: false, valid: false, keyKnown: false, signer: null };
  }
  const signer = publicKey.startsWith(KEY_PREFIX) ? publicKey : KEY_PREFIX + publicKey;
  let valid = false;
  try {
    valid = await invoke<boolean>("plugin_verify_signature", {
      publicKey: signer.slice(KEY_PREFIX.length),
      signature,
      message: signedMessage(entry),
    });
  } catch {
    valid = false;
  }
  return { signed: true, valid, keyKnown: valid && readKeys().includes(signer), signer };
}
