import { useMemo } from "react";
import { useSettings } from "@/lib/settings";
import { createAllDebrid } from "./alldebrid";
import { createDebridLink } from "./debridlink";
import { createPremiumize } from "./premiumize";
import { createRealDebrid } from "./realdebrid";
import { createTorbox } from "./torbox";
import { withFailover } from "./failover";
import type { DebridSlug, DebridStore } from "./types";

export type DebridKeys = {
  rdKey: string;
  tbKey: string;
  adKey: string;
  pmKey: string;
  dlKey: string;
};

export type DebridBackupKeys = Partial<Record<DebridSlug, string[]>>;

const FACTORIES: Record<DebridSlug, (key: string) => DebridStore> = {
  rd: createRealDebrid,
  tb: createTorbox,
  ad: createAllDebrid,
  pm: createPremiumize,
  dl: createDebridLink,
};

export function buildDebridClients(keys: DebridKeys, backups?: DebridBackupKeys): DebridStore[] {
  const clients: DebridStore[] = [];
  const add = (slug: DebridSlug, key: string) => {
    if (!key) return;
    const extras = (backups?.[slug] ?? [])
      .map((k) => k.trim())
      .filter((k) => k && k !== key)
      .map((k) => FACTORIES[slug](k));
    clients.push(withFailover(FACTORIES[slug](key), extras));
  };
  add("rd", keys.rdKey);
  add("tb", keys.tbKey);
  add("ad", keys.adKey);
  add("pm", keys.pmKey);
  add("dl", keys.dlKey);
  return clients;
}

export function useDebridClients(): DebridStore[] {
  const { settings } = useSettings();
  return useMemo(
    () =>
      buildDebridClients(
        {
          rdKey: settings.rdKey,
          tbKey: settings.tbKey,
          adKey: settings.adKey,
          pmKey: settings.pmKey,
          dlKey: settings.dlKey,
        },
        settings.debridFailover ? settings.debridBackupKeys : undefined,
      ),
    [
      settings.rdKey,
      settings.tbKey,
      settings.adKey,
      settings.pmKey,
      settings.dlKey,
      settings.debridFailover,
      settings.debridBackupKeys,
    ],
  );
}

export function useDebridSlugs(): DebridSlug[] {
  const clients = useDebridClients();
  return useMemo(() => clients.map((c) => c.slug), [clients]);
}
