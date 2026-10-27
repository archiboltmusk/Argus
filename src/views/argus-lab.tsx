import {
  Activity, Check, Compass, Database, Gauge, LockKeyhole, RotateCcw,
  ShieldCheck, Sparkles, Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_EXPERIENCE_CONTRACT,
  isExperienceActionAllowed,
  rankExperienceCandidates,
  type ExperienceAction,
  type ExperienceContract,
  type ExperienceMode,
  type StreamCandidate,
} from "@/lib/experience-engine";

const CONTRACT_KEY = "argus.experience-contract.v1";
const MODE_KEY = "argus.experience-mode.v1";

const DEMO_CANDIDATES: StreamCandidate[] = [
  { id: "a", label: "Balanced 1080p", startupMs: 1450, quality: 1080, stability: 0.94, estimatedMbps: 7.5, compatible: true, recentFailures: 0, observations: 18 },
  { id: "b", label: "High quality 4K", startupMs: 4200, quality: 2160, stability: 0.89, estimatedMbps: 21, compatible: true, recentFailures: 1, observations: 12 },
  { id: "c", label: "Low-data 720p", startupMs: 850, quality: 720, stability: 0.97, estimatedMbps: 3.2, compatible: true, recentFailures: 0, observations: 7 },
  { id: "d", label: "Incompatible HDR profile", startupMs: 700, quality: 2160, stability: 0.99, estimatedMbps: 18, compatible: false, recentFailures: 0, observations: 30 },
];

type Tab = "decision" | "contract" | "signals";

function readContract(): ExperienceContract {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONTRACT_KEY) ?? "null") as Partial<ExperienceContract> | null;
    return { ...DEFAULT_EXPERIENCE_CONTRACT, ...(parsed ?? {}) };
  } catch {
    return { ...DEFAULT_EXPERIENCE_CONTRACT };
  }
}

function readMode(): ExperienceMode {
  try {
    const value = localStorage.getItem(MODE_KEY);
    return value === "fast-start" || value === "quality" || value === "reliable" || value === "data-saver"
      ? value
      : "balanced";
  } catch {
    return "balanced";
  }
}

const MODES: Array<{ id: ExperienceMode; title: string; description: string }> = [
  { id: "balanced", title: "Balanced", description: "A measured compromise between stability, speed, quality, and data." },
  { id: "fast-start", title: "Fast start", description: "Reduce waiting time while retaining a stability preference." },
  { id: "quality", title: "Best quality", description: "Give verified-compatible quality more influence." },
  { id: "reliable", title: "Reliability first", description: "Prefer stability backed by actual observations." },
  { id: "data-saver", title: "Data saver", description: "Favor lower estimated bandwidth demand." },
];

const CONTRACT_RULES: Array<{ id: ExperienceAction; title: string; description: string }> = [
  { id: "auto-switch", title: "Automatic source switching", description: "Permit bounded recovery to another compatible source when playback fails." },
  { id: "external-ai", title: "External AI services", description: "Allow optional diagnostics to be sent to a remote AI provider. Off by default." },
  { id: "telemetry", title: "Optional telemetry", description: "Allow opt-in product diagnostics to leave this device." },
  { id: "auto-install", title: "Automatic integration installation", description: "Allow integrations to be installed without a confirmation step." },
];

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-edge-soft bg-surface/70 p-5 shadow-sm ${className}`}>{children}</section>;
}

export function ArgusLabView({ active = true }: { active?: boolean }) {
  const [tab, setTab] = useState<Tab>("decision");
  const [mode, setMode] = useState<ExperienceMode>(readMode);
  const [contract, setContract] = useState<ExperienceContract>(readContract);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const ranked = useMemo(() => rankExperienceCandidates(DEMO_CANDIDATES, mode), [mode]);

  useEffect(() => {
    try {
      const key = "__argus_lab_probe__";
      localStorage.setItem(key, "1");
      localStorage.removeItem(key);
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onMotion = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    media.addEventListener?.("change", onMotion);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      media.removeEventListener?.("change", onMotion);
    };
  }, [active]);

  useEffect(() => {
    try { localStorage.setItem(MODE_KEY, mode); } catch {}
  }, [mode]);

  useEffect(() => {
    try { localStorage.setItem(CONTRACT_KEY, JSON.stringify(contract)); } catch {}
  }, [contract]);

  const setRule = (id: ExperienceAction, allowed: boolean) =>
    setContract((current) => ({ ...current, [id]: allowed }));

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-canvas text-ink">
      <div className="mx-auto max-w-[1280px] px-5 pb-16 pt-8 sm:px-8 lg:px-12">
        <header className="mb-8 flex flex-col gap-5 border-b border-edge-soft pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              <Compass size={14} /> Local-first experience engine
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Argus Observatory</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-subtle sm:text-base">
              Inspect decisions, set boundaries, and preview how Argus balances playback trade-offs. This page never contacts a media source.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-edge-soft bg-surface px-4 py-3">
            <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-400" : "bg-amber-400"}`} />
            <div><p className="text-sm font-medium">{online ? "Device reports online" : "Device reports offline"}</p><p className="text-xs text-ink-subtle">Browser connectivity signal only</p></div>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, label: "Your rules", value: Object.values(contract).filter(Boolean).length + " / 4 allowed", sub: "Local preference contract" },
            { icon: Gauge, label: "Decision profile", value: MODES.find((item) => item.id === mode)?.title ?? "Balanced", sub: "Deterministic ranking" },
            { icon: Database, label: "Local storage", value: storageAvailable === null ? "Checking…" : storageAvailable ? "Writable" : "Unavailable", sub: "Small temporary write test" },
          ].map((metric) => (
            <Panel key={metric.label} className="flex items-start gap-3">
              <div className="rounded-xl bg-accent/10 p-3 text-accent"><metric.icon size={20} /></div>
              <div><p className="text-xs text-ink-subtle">{metric.label}</p><p className="mt-1 text-lg font-semibold">{metric.value}</p><p className="mt-1 text-xs text-ink-subtle">{metric.sub}</p></div>
            </Panel>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Argus Observatory sections">
          {([
            ["decision", "Decision Lab"],
            ["contract", "Experience Contract"],
            ["signals", "Local Signals"],
          ] as Array<[Tab, string]>).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === id ? "bg-accent text-white" : "border border-edge-soft bg-surface text-ink-subtle hover:text-ink"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "decision" && (
          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <Panel>
              <div className="mb-4 flex items-center gap-2"><Sparkles size={18} className="text-accent" /><h2 className="text-lg font-semibold">What should matter most?</h2></div>
              <div className="space-y-2">
                {MODES.map((item) => (
                  <button key={item.id} onClick={() => setMode(item.id)} aria-pressed={mode === item.id}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${mode === item.id ? "border-accent bg-accent/10" : "border-edge-soft hover:bg-surface-hover"}`}>
                    <span className="flex items-center justify-between gap-3 text-sm font-semibold">{item.title}{mode === item.id && <Check size={16} className="text-accent" />}</span>
                    <span className="mt-1 block text-xs leading-5 text-ink-subtle">{item.description}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 rounded-xl bg-surface p-3 text-xs leading-5 text-ink-subtle">
                Preview uses four synthetic candidates. Scores are illustrative and are not live stream measurements.
              </p>
            </Panel>
            <Panel>
              <div className="mb-4 flex items-center gap-2"><Activity size={18} className="text-accent" /><h2 className="text-lg font-semibold">Ranked decision trace</h2></div>
              <div className="space-y-3">
                {ranked.map((candidate, index) => (
                  <article key={candidate.id} className="rounded-xl border border-edge-soft p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><div className="flex items-center gap-2"><span className="text-xs text-ink-subtle">0{index + 1}</span><h3 className="font-semibold">{candidate.label}</h3></div>
                        <p className="mt-1 text-xs text-ink-subtle">Evidence confidence: {candidate.confidence}% · {candidate.observations} observations</p>
                      </div>
                      <div className="min-w-20 text-right"><span className="text-2xl font-semibold">{candidate.score}</span><span className="text-xs text-ink-subtle"> / 100</span></div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-accent" style={{ width: `${candidate.score}%` }} /></div>
                    <ul className="mt-3 flex flex-wrap gap-2">{candidate.reasons.map((reason) => <li key={reason} className="rounded-full bg-surface px-2.5 py-1 text-xs text-ink-subtle">{reason}</li>)}</ul>
                  </article>
                ))}
                {ranked.length === 0 && <p className="text-sm text-ink-subtle">No compatible candidates are available in this preview.</p>}
              </div>
            </Panel>
          </div>
        )}

        {tab === "contract" && (
          <Panel>
            <div className="mb-5 flex items-start gap-3"><LockKeyhole size={22} className="mt-1 text-accent" /><div><h2 className="text-xl font-semibold">Your Experience Contract</h2><p className="mt-1 text-sm leading-6 text-ink-subtle">These are local policy preferences for future Argus features. This first version stores them and exposes a policy-checking algorithm; it does not yet gate every existing subsystem.</p></div></div>
            <div className="divide-y divide-edge-soft">
              {CONTRACT_RULES.map((rule) => {
                const allowed = isExperienceActionAllowed(contract, rule.id);
                return <div key={rule.id} className="flex items-start justify-between gap-4 py-4">
                  <div><h3 className="font-medium">{rule.title}</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-ink-subtle">{rule.description}</p></div>
                  <button type="button" role="switch" aria-checked={allowed} onClick={() => setRule(rule.id, !allowed)}
                    className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${allowed ? "bg-accent" : "bg-edge"}`}
                    aria-label={rule.title}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${allowed ? "left-6" : "left-1"}`} /></button>
                </div>;
              })}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-4">
              <p className="text-sm text-ink-subtle">Rules are saved in this browser profile. They are not synchronized or sent to a server.</p>
              <button type="button" onClick={() => setContract({ ...DEFAULT_EXPERIENCE_CONTRACT })} className="inline-flex items-center gap-2 rounded-lg border border-edge-soft px-3 py-2 text-sm hover:bg-surface-hover"><RotateCcw size={15} /> Reset rules</button>
            </div>
          </Panel>
        )}

        {tab === "signals" && (
          <div className="grid gap-5 md:grid-cols-2">
            <Panel><div className="mb-4 flex items-center gap-2"><Activity size={18} className="text-accent" /><h2 className="text-lg font-semibold">Signals available locally</h2></div>
              <div className="space-y-3">
                <Signal label="Network status" value={online ? "Online" : "Offline"} detail="navigator.onLine; does not guarantee internet reachability." />
                <Signal label="Storage probe" value={storageAvailable === null ? "Checking" : storageAvailable ? "Passed" : "Blocked"} detail="A temporary localStorage write/remove operation." />
                <Signal label="Reduced motion" value={reducedMotion ? "Enabled" : "Not requested"} detail="Operating-system/browser accessibility preference." />
                <Signal label="Performance API" value={typeof performance !== "undefined" ? "Available" : "Unavailable"} detail="Availability only; no browsing history or playback content is inspected." />
              </div>
            </Panel>
            <Panel><div className="mb-4 flex items-center gap-2"><Zap size={18} className="text-accent" /><h2 className="text-lg font-semibold">Next architectural hooks</h2></div>
              <ol className="space-y-3 text-sm leading-6 text-ink-subtle">
                <li><strong className="text-ink">1. Observe</strong> — collect only signals the user has permitted.</li>
                <li><strong className="text-ink">2. Normalize</strong> — convert raw measurements into bounded, comparable values.</li>
                <li><strong className="text-ink">3. Decide</strong> — apply deterministic weights and hard compatibility constraints.</li>
                <li><strong className="text-ink">4. Explain</strong> — show the highest-impact factors and evidence confidence.</li>
                <li><strong className="text-ink">5. Authorize</strong> — reject actions disallowed by the Experience Contract.</li>
                <li><strong className="text-ink">6. Recover</strong> — use bounded retries and provide an undo path.</li>
              </ol>
              <p className="mt-4 rounded-xl border border-edge-soft p-3 text-xs leading-5 text-ink-subtle">The page is an initial architecture slice, not a claim that all six stages are wired into playback yet.</p>
            </Panel>
          </div>
        )}

        <footer className="mt-8 flex items-start gap-3 rounded-2xl border border-edge-soft p-4 text-xs leading-5 text-ink-subtle">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-accent" />
          <p><strong className="text-ink">Local-first by design.</strong> Observatory stores only its selected mode and policy switches in localStorage. The ranking demo uses synthetic inputs, and the page makes no requests to add-ons, media sources, or AI services.</p>
        </footer>
      </div>
    </main>
  );
}

function Signal({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="flex items-start justify-between gap-4 rounded-xl bg-surface p-3"><div><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs leading-5 text-ink-subtle">{detail}</p></div><span className="shrink-0 text-sm font-semibold">{value}</span></div>;
}
