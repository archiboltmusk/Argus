import { addonAccepts, type Addon } from "@/lib/addons";
import { safeFetch } from "@/lib/safe-fetch";
import { loadStoredSettings } from "@/lib/settings/load";
import { recordAddonOutcome } from "./store";
import { countsAsOutcome, testAddon, type AddonTestResult, type TestDeps } from "./test-addon";

const LANES = 3;

const deps: TestDeps = {
  fetchText: async (url, signal) => {
    const res = await safeFetch(url, { headers: { Accept: "application/json" }, signal });
    return { status: res.status, text: await res.text() };
  },
  accepts: (manifest, resource, type, id) =>
    addonAccepts({ manifest: manifest as Addon["manifest"], transportUrl: "" }, resource, type, id),
};

/** Tests one addon and feeds the result into its local reliability history. */
export async function runAddonTest(
  addonId: string,
  transportUrl: string,
  signal?: AbortSignal,
): Promise<AddonTestResult> {
  const result = await testAddon(transportUrl, deps, signal);
  if (addonId && countsAsOutcome(result) && loadStoredSettings().addonHealthTracking !== false)
    recordAddonOutcome(addonId, result.status !== "fail", result.ms, `test-${result.reason ?? result.status}`);
  return result;
}

/** Tests many addons a few at a time, reporting each as it starts and finishes. */
export async function runAddonTests(
  targets: Array<{ key: string; addonId: string; transportUrl: string }>,
  hooks: { onStart: (key: string) => void; onDone: (key: string, result: AddonTestResult) => void },
  signal?: AbortSignal,
): Promise<void> {
  const queue = [...targets];
  const worker = async () => {
    for (let t = queue.shift(); t && !signal?.aborted; t = queue.shift()) {
      hooks.onStart(t.key);
      hooks.onDone(t.key, await runAddonTest(t.addonId, t.transportUrl, signal));
    }
  };
  await Promise.all(Array.from({ length: LANES }, worker));
}
