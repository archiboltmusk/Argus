import { checkConformance, type ConformanceKind } from "./conformance";

/** A public-domain film (Night of the Living Dead, 1968), so tests never request a real title. */
export const TEST_TYPE = "movie";
export const TEST_ID = "tt0063350";
export const TEST_TIMEOUT_MS = 8000;
export const SLOW_MS = 3000;

export type TestStatus = "pass" | "slow" | "fail";
export type TestReason = "timeout" | "network" | "http" | "bad-json" | "schema" | "no-streams";
export type TestStepName = "manifest" | "catalog" | "meta" | "stream" | "subtitles";

export type TestStep = {
  name: TestStepName;
  status: TestStatus;
  ms: number;
  reason?: TestReason;
  detail?: string;
};

export type AddonTestResult = {
  status: TestStatus;
  ms: number;
  steps: TestStep[];
  /** Worst failing step, for one-line display. */
  reason?: TestReason;
  detail?: string;
  at: number;
};

type Manifest = {
  catalogs?: Array<{
    id: string;
    type: string;
    extra?: Array<{ name: string; isRequired?: boolean }>;
  }>;
  resources?: unknown[];
  types?: string[];
  idPrefixes?: string[];
};

export type TestDeps = {
  fetchText: (url: string, signal: AbortSignal) => Promise<{ status: number; text: string }>;
  accepts: (manifest: Manifest, resource: string, type: string, id: string) => boolean;
  now?: () => number;
};

const REASON_LABEL: Record<TestReason, string> = {
  timeout: "Timed out",
  network: "Network or CORS error",
  http: "HTTP error",
  "bad-json": "Reply was not valid JSON",
  schema: "Reply breaks the protocol",
  "no-streams": "No streams for the sample title",
};

export const testReasonLabel = (reason: TestReason): string => REASON_LABEL[reason];

const baseOf = (transportUrl: string) => transportUrl.replace(/\/manifest\.json(?:\?.*)?$/, "");

/** First catalog that can be requested without any extra argument. */
function plainCatalog(manifest: Manifest) {
  return manifest.catalogs?.find(
    (c) => typeof c?.id === "string" && typeof c?.type === "string" && !c.extra?.some((e) => e.isRequired),
  );
}

type Fetched = { ok: true; body: unknown; ms: number } | { ok: false; step: TestStep };

async function fetchJson(
  name: TestStepName,
  url: string,
  deps: TestDeps,
  signal?: AbortSignal,
): Promise<Fetched> {
  const now = deps.now ?? (() => performance.now());
  const started = now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TEST_TIMEOUT_MS);
  const onOuterAbort = () => ac.abort();
  signal?.addEventListener("abort", onOuterAbort);
  const fail = (reason: TestReason, detail?: string): Fetched => ({
    ok: false,
    step: { name, status: "fail", ms: Math.round(now() - started), reason, detail },
  });
  try {
    const res = await deps.fetchText(url, ac.signal);
    if (res.status < 200 || res.status >= 300) return fail("http", `HTTP ${res.status}`);
    try {
      return { ok: true, body: JSON.parse(res.text), ms: Math.round(now() - started) };
    } catch {
      return fail("bad-json");
    }
  } catch (err) {
    if (ac.signal.aborted) return fail("timeout");
    return fail("network", err instanceof Error ? err.message : undefined);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onOuterAbort);
  }
}

function judge(name: TestStepName, kind: ConformanceKind, fetched: Fetched & { ok: true }): TestStep {
  const issues = checkConformance(kind, fetched.body);
  if (issues.length > 0)
    return { name, status: "fail", ms: fetched.ms, reason: "schema", detail: issues[0] };
  if (name === "stream") {
    const streams = (fetched.body as { streams: unknown[] }).streams;
    if (streams.length === 0) return { name, status: "fail", ms: fetched.ms, reason: "no-streams" };
  }
  return { name, status: fetched.ms > SLOW_MS ? "slow" : "pass", ms: fetched.ms };
}

function summarize(steps: TestStep[], at: number): AddonTestResult {
  const failed =
    steps.find((s) => s.status === "fail" && s.reason !== "no-streams") ?? steps.find((s) => s.status === "fail");
  const slow = steps.find((s) => s.status === "slow");
  const status: TestStatus = failed ? "fail" : slow ? "slow" : "pass";
  const worst = failed ?? slow;
  return {
    status,
    ms: steps.reduce((sum, s) => sum + s.ms, 0),
    steps,
    reason: failed?.reason,
    detail: worst?.detail,
    at,
  };
}

/**
 * Runs the manifest, protocol and sample-request checks for one addon. Each resource the addon
 * serves is asked about the same public-domain film, so nothing user-specific is ever sent.
 */
export async function testAddon(
  transportUrl: string,
  deps: TestDeps,
  signal?: AbortSignal,
): Promise<AddonTestResult> {
  const steps: TestStep[] = [];
  const at = Date.now();
  const manifestRes = await fetchJson("manifest", transportUrl, deps, signal);
  if (!manifestRes.ok) return summarize([manifestRes.step], at);
  const manifestStep = judge("manifest", "manifest", manifestRes);
  steps.push(manifestStep);
  if (manifestStep.status === "fail") return summarize(steps, at);

  const manifest = manifestRes.body as Manifest;
  const base = baseOf(transportUrl);
  const plans: Array<[TestStepName, ConformanceKind, string | null]> = [];
  const catalog = plainCatalog(manifest);
  plans.push(["catalog", "catalog", catalog ? `${base}/catalog/${catalog.type}/${catalog.id}.json` : null]);
  for (const [name, kind, dir] of [
    ["meta", "meta", "meta"],
    ["stream", "stream", "stream"],
    ["subtitles", "subtitles", "subtitles"],
  ] as const)
    plans.push([
      name,
      kind,
      deps.accepts(manifest, name, TEST_TYPE, TEST_ID) ? `${base}/${dir}/${TEST_TYPE}/${TEST_ID}.json` : null,
    ]);

  for (const [name, kind, url] of plans) {
    if (!url || signal?.aborted) continue;
    const res = await fetchJson(name, url, deps, signal);
    steps.push(res.ok ? judge(name, kind, res) : res.step);
  }
  return summarize(steps, at);
}

/** Whether a result should count against the addon's reliability score. */
export function countsAsOutcome(result: AddonTestResult): boolean {
  // An empty stream list for one old film says little about the addon, so it is shown but not scored.
  return !(result.status === "fail" && result.reason === "no-streams");
}
