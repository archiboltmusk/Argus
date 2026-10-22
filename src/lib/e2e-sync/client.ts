import { applyBackup, buildBackup, parseBackup } from "@/lib/backup";
import { safeFetchLocal } from "@/lib/safe-fetch";
import { open, seal, vaultId, type Sealed } from "./crypto";

export type E2eSyncConfig = { endpoint: string; passphrase: string };

async function target(cfg: E2eSyncConfig): Promise<string> {
  const base = cfg.endpoint.trim().replace(/\/+$/, "");
  return `${base}/${await vaultId(cfg.passphrase)}.json`;
}

/** Encrypts the backup on this device and PUTs it to the user's own server. */
export async function pushSync(cfg: E2eSyncConfig): Promise<void> {
  const sealed = await seal(JSON.stringify(await buildBackup()), cfg.passphrase);
  const r = await safeFetchLocal(await target(cfg), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sealed),
  });
  if (!r.ok) throw new Error(`Server answered ${r.status}.`);
}

export async function pullSync(cfg: E2eSyncConfig): Promise<void> {
  const r = await safeFetchLocal(await target(cfg));
  if (r.status === 404) throw new Error("Nothing saved under this passphrase yet.");
  if (!r.ok) throw new Error(`Server answered ${r.status}.`);
  const text = await open((await r.json()) as Sealed, cfg.passphrase);
  const parsed = parseBackup(text);
  if (!parsed.ok) throw new Error("The saved data is not a valid backup.");
  await applyBackup(parsed.backup);
}
