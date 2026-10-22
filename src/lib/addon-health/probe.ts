import { addonAccepts, gatherCatalogAddons, type Addon } from "@/lib/addons";
import { safeFetch } from "@/lib/safe-fetch";
import { resourceUrl } from "@/lib/stremio-protocol";
import { recordAddonOutcome } from "./store";

/** A public-domain film (Night of the Living Dead, 1968), so probes never request a real title. */
const PROBE_TYPE = "movie";
const PROBE_ID = "tt0063350";
const PROBE_TIMEOUT_MS = 8000;
const LAST_RUN_KEY = "argus.addonHealth.lastProbe";
const EVERY_MS = 6 * 60 * 60 * 1000;

async function probeOne(addon: Addon): Promise<void> {
  const started = performance.now();
  const stream = addonAccepts(addon, "stream", PROBE_TYPE, PROBE_ID);
  const url = stream
    ? resourceUrl({ base: addon.transportUrl, resource: "stream", type: PROBE_TYPE, id: PROBE_ID })
    : addon.transportUrl;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await safeFetch(url, { headers: { Accept: "application/json" }, signal: ac.signal });
    await res.json();
    recordAddonOutcome(addon.manifest.id, res.ok, Math.round(performance.now() - started), `probe-${res.status}`);
  } catch {
    recordAddonOutcome(addon.manifest.id, false, Math.round(performance.now() - started), "probe-error");
  } finally {
    clearTimeout(timer);
  }
}

/** Probes installed addons at most every 6 hours, a few at a time. */
export async function runAddonProbes(authKey: string | null, force = false): Promise<void> {
  try {
    const last = Number(localStorage.getItem(LAST_RUN_KEY) ?? 0);
    if (!force && Date.now() - last < EVERY_MS) return;
    localStorage.setItem(LAST_RUN_KEY, String(Date.now()));
  } catch {
    /* storage unavailable: probe anyway */
  }
  const addons = await gatherCatalogAddons(authKey).catch(() => [] as Addon[]);
  const queue = [...addons];
  const worker = async () => {
    for (let a = queue.shift(); a; a = queue.shift()) await probeOne(a);
  };
  await Promise.all([worker(), worker(), worker()]);
}
