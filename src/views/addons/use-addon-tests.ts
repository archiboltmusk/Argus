import { useCallback, useEffect, useRef, useState } from "react";
import { runAddonTest, runAddonTests } from "@/lib/addon-health/test-all";
import type { AddonTestResult } from "@/lib/addon-health/test-addon";
import type { ResolvedAddon } from "@/lib/addons-store/store";
import { addonKey, idOf } from "./addons-utils";

export type AddonTestState = { running: boolean; result?: AddonTestResult };

const target = (r: ResolvedAddon) => ({ key: addonKey(r), addonId: idOf(r), transportUrl: r.transportUrl });

export function useAddonTests() {
  const [states, setStates] = useState<Record<string, AddonTestState>>({});
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const patch = useCallback((key: string, next: AddonTestState) => {
    setStates((prev) => ({ ...prev, [key]: { ...prev[key], ...next } }));
  }, []);

  const testAll = useCallback(
    (addons: ResolvedAddon[]) => {
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;
      const targets = addons.filter((r) => r.transportUrl).map(target);
      setStates(Object.fromEntries(targets.map((t) => [t.key, { running: true }])));
      void runAddonTests(
        targets,
        { onStart: () => {}, onDone: (key, result) => patch(key, { running: false, result }) },
        ac.signal,
      );
    },
    [patch],
  );

  const testOne = useCallback(
    async (r: ResolvedAddon) => {
      const t = target(r);
      patch(t.key, { running: true });
      patch(t.key, { running: false, result: await runAddonTest(t.addonId, t.transportUrl) });
    },
    [patch],
  );

  const running = Object.values(states).some((s) => s.running);
  return { states, running, testAll, testOne };
}
