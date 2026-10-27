import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Wand2,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AddonLogo, resolveAddonLogo } from "@/components/addon-logo";
import { isAddonEnabled, setAddonEnabled } from "@/lib/addon-store";
import {
  addonLastSuccess,
  addonMedianMs,
  addonScore,
  addonStatus,
} from "@/lib/addon-health/store";
import type { ResolvedAddon } from "@/lib/addons-store/store";
import { useT } from "@/lib/i18n";
import { idOf, nameOf, resourceLabels } from "./addons-utils";

type AddonAudit = {
  addon: ResolvedAddon;
  id: string;
  name: string;
  enabled: boolean;
  status: "healthy" | "degraded" | "failing" | "unknown";
  score: number | null;
  medianMs: number | null;
  lastSuccess: number | null;
  resources: string[];
  isStream: boolean;
  isSubtitle: boolean;
  isCatalog: boolean;
  isMeta: boolean;
  issues: string[];
  recommendation: "keep" | "pause" | "inspect" | "none";
};

export function AddonOptimizerModal({
  installed,
  onClose,
  onApply,
}: {
  installed: ResolvedAddon[];
  onClose: () => void;
  onApply?: () => void;
}) {
  const t = useT();
  const [analyzing, setAnalyzing] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"overview" | "recommendations">("overview");
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  // Simulate quick local telemetry scan
  useEffect(() => {
    const timer = setTimeout(() => setAnalyzing(false), 350);
    return () => clearTimeout(timer);
  }, []);

  const audits = useMemo<AddonAudit[]>(() => {
    const streamAddons: AddonAudit[] = [];
    const list: AddonAudit[] = installed.map((r) => {
      const id = idOf(r);
      const name = nameOf(r);
      const enabled = isAddonEnabled(r.transportUrl);
      const status = addonStatus(id);
      const score = addonScore(id);
      const medianMs = addonMedianMs(id);
      const lastSuccess = addonLastSuccess(id);
      const resources = resourceLabels(r.manifest?.resources);
      const isStream = resources.includes("stream");
      const isSubtitle = resources.includes("subtitles");
      const isCatalog = resources.includes("catalog");
      const isMeta = resources.includes("meta");

      const issues: string[] = [];
      let recommendation: AddonAudit["recommendation"] = "none";

      if (enabled) {
        if (status === "failing") {
          issues.push(t("High failure rate or unresponsive endpoint"));
          recommendation = "pause";
        } else if (status === "degraded") {
          issues.push(t("Intermittent timeouts (>40% failure rate)"));
          recommendation = "inspect";
        } else if (medianMs && medianMs > 2500) {
          issues.push(t("Slow response time (~{ms}ms)", { ms: medianMs }));
          recommendation = "inspect";
        }
      }

      const audit: AddonAudit = {
        addon: r,
        id,
        name,
        enabled,
        status,
        score,
        medianMs,
        lastSuccess,
        resources,
        isStream,
        isSubtitle,
        isCatalog,
        isMeta,
        issues,
        recommendation,
      };

      if (isStream && enabled) streamAddons.push(audit);
      return audit;
    });

    // Redundancy check: if more than 3 active stream scrapers, flag the slowest
    if (streamAddons.length > 3) {
      streamAddons.sort((a, b) => (b.medianMs ?? 9999) - (a.medianMs ?? 9999));
      const slowest = streamAddons[0];
      if (slowest && slowest.recommendation === "none") {
        slowest.issues.push(t("Redundant with faster installed stream providers"));
        slowest.recommendation = "pause";
      }
    }

    return list;
  }, [installed, t]);

  const streamCount = audits.filter((a) => a.isStream && a.enabled).length;
  const subCount = audits.filter((a) => a.isSubtitle && a.enabled).length;
  const catalogCount = audits.filter((a) => a.isCatalog && a.enabled).length;

  const failingCount = audits.filter((a) => a.status === "failing" && a.enabled).length;
  const degradedCount = audits.filter((a) => a.status === "degraded" && a.enabled).length;
  const healthyCount = audits.filter((a) => a.status === "healthy" && a.enabled).length;

  const recommendedActions = useMemo(() => {
    return audits.filter((a) => a.recommendation !== "none");
  }, [audits]);

  const handleApplyAll = () => {
    for (const a of recommendedActions) {
      if (a.recommendation === "pause") {
        setAddonEnabled(a.addon.transportUrl, false);
        window.dispatchEvent(
          new CustomEvent("argus:addons-changed", { detail: { id: a.id, enabled: false } }),
        );
      }
    }
    setApplied(true);
    onApply?.();
  };

  const handleToggle = (a: AddonAudit) => {
    const next = !a.enabled;
    setAddonEnabled(a.addon.transportUrl, next);
    a.enabled = next;
    window.dispatchEvent(
      new CustomEvent("argus:addons-changed", { detail: { id: a.id, enabled: next } }),
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[185] flex items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-[min(94vw,680px)] flex-col overflow-hidden rounded-2xl border border-edge bg-elevated/98 shadow-[0_28px_72px_-20px_rgba(0,0,0,0.85)] animate-in zoom-in-95 fade-in duration-150 backdrop-blur-xl">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 border-b border-edge-soft px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/30">
              <Wand2 size={20} strokeWidth={2.2} />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
                {t("Add-on Optimizer")}
              </span>
              <h2 className="text-[16px] font-semibold text-ink">
                {t("Optimize Your Installed Add-ons")}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-raised text-ink-muted transition-colors hover:bg-canvas/55 hover:text-ink"
            aria-label={t("Close")}
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </header>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-edge-soft bg-canvas/40 px-6 py-2.5">
          <button
            type="button"
            onClick={() => setSelectedTab("overview")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
              selectedTab === "overview"
                ? "bg-ink text-canvas shadow-sm"
                : "text-ink-muted hover:bg-elevated hover:text-ink"
            }`}
          >
            <Layers size={13} strokeWidth={2.4} />
            <span>{t("Configuration Overview")}</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab("recommendations")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
              selectedTab === "recommendations"
                ? "bg-ink text-canvas shadow-sm"
                : "text-ink-muted hover:bg-elevated hover:text-ink"
            }`}
          >
            <Sparkles size={13} strokeWidth={2.4} />
            <span>{t("Actionable Recommendations")}</span>
            {recommendedActions.length > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10.5px] font-bold ${
                  selectedTab === "recommendations"
                    ? "bg-canvas/20 text-canvas"
                    : "bg-accent/20 text-accent ring-1 ring-accent/30"
                }`}
              >
                {recommendedActions.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {analyzing ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Loader2 size={28} className="animate-spin text-accent" />
              <p className="text-[14px] font-medium text-ink">{t("Auditing add-on telemetry & redundancy…")}</p>
              <p className="text-[12px] text-ink-subtle">{t("Checking failure streaks, response latency, and stream overlap.")}</p>
            </div>
          ) : selectedTab === "overview" ? (
            <div className="flex flex-col gap-5">
              {/* Health Score Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 rounded-xl border border-edge-soft bg-canvas/30 p-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                    {t("Healthy Add-ons")}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[22px] font-bold text-emerald-400">
                      {healthyCount}
                    </span>
                    <span className="text-[11.5px] text-ink-subtle">/ {installed.length}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 rounded-xl border border-edge-soft bg-canvas/30 p-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                    {t("Degraded / Slow")}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[22px] font-bold text-amber-300">
                      {degradedCount}
                    </span>
                    <span className="text-[11.5px] text-ink-subtle">{t("needs attention")}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 rounded-xl border border-edge-soft bg-canvas/30 p-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                    {t("Failing Add-ons")}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-[22px] font-bold text-red-400">
                      {failingCount}
                    </span>
                    <span className="text-[11.5px] text-ink-subtle">{t("recommend pause")}</span>
                  </div>
                </div>
              </div>

              {/* Capability Gaps / Summary */}
              <div className="flex flex-col gap-2 rounded-xl border border-edge-soft bg-canvas/20 p-4">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                  {t("Installed Capability Coverage")}
                </h3>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-[12.5px] text-ink">
                    <span className={`h-2 w-2 rounded-full ${streamCount > 0 ? "bg-emerald-400" : "bg-red-400"}`} />
                    <span>{t("Streams: {n} active", { n: streamCount })}</span>
                  </div>
                  <span className="text-edge-soft">·</span>
                  <div className="flex items-center gap-1.5 text-[12.5px] text-ink">
                    <span className={`h-2 w-2 rounded-full ${subCount > 0 ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span>{t("Subtitles: {n} active", { n: subCount })}</span>
                  </div>
                  <span className="text-edge-soft">·</span>
                  <div className="flex items-center gap-1.5 text-[12.5px] text-ink">
                    <span className={`h-2 w-2 rounded-full ${catalogCount > 0 ? "bg-emerald-400" : "bg-red-400"}`} />
                    <span>{t("Catalogs: {n} active", { n: catalogCount })}</span>
                  </div>
                </div>

                {subCount === 0 && (
                  <p className="mt-2 rounded-lg bg-amber-500/15 p-2.5 text-[12px] text-amber-300 ring-1 ring-amber-500/30">
                    <AlertTriangle size={13} className="inline me-1.5" />
                    {t("No subtitle provider enabled. Consider enabling OpenSubtitles or Wyzie in Subtitle sources.")}
                  </p>
                )}
              </div>

              {/* Add-on Audit List */}
              <div className="flex flex-col gap-2">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                  {t("Add-on Health & Redundancy Audit")}
                </h3>
                <div className="flex flex-col gap-2">
                  {audits.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-edge-soft bg-canvas/30 px-3.5 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AddonLogo
                          addonId={a.id}
                          addonName={a.name}
                          manifestLogo={resolveAddonLogo(a.addon.manifest?.logo, a.addon.transportUrl)}
                          size="md"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13.5px] font-semibold text-ink">
                              {a.name}
                            </span>
                            {a.status === "healthy" && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                                {t("Healthy")}
                              </span>
                            )}
                            {a.status === "degraded" && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-500/30">
                                {t("Degraded")}
                              </span>
                            )}
                            {a.status === "failing" && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400 ring-1 ring-red-500/30">
                                {t("Failing")}
                              </span>
                            )}
                            {a.status === "unknown" && (
                              <span className="rounded bg-canvas/40 px-1.5 py-0.5 text-[10px] text-ink-subtle ring-1 ring-edge-soft/60">
                                {t("Unverified")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-ink-subtle">
                            {a.score != null && <span>{t("Score: {n}%", { n: a.score })}</span>}
                            {a.medianMs != null && <span>· ~{a.medianMs}ms</span>}
                            {a.issues.length > 0 && (
                              <span className="text-amber-300/90 font-medium">· {a.issues[0]}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggle(a)}
                          className={`flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold transition-colors ${
                            a.enabled
                              ? "bg-canvas/60 text-ink-subtle ring-1 ring-edge-soft hover:text-ink"
                              : "bg-accent/15 text-accent ring-1 ring-accent/30 hover:bg-accent/25"
                          }`}
                        >
                          {a.enabled ? t("Pause") : t("Resume")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Recommendations Tab */
            <div className="flex flex-col gap-4">
              {recommendedActions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                  <CheckCircle2 size={36} className="text-emerald-400" />
                  <h3 className="text-[16px] font-semibold text-ink">{t("Setup Is Fully Optimized")}</h3>
                  <p className="max-w-md text-[13px] text-ink-muted">
                    {t("All your active add-ons are responding normally with low latency and balanced coverage. No action required.")}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[13px] leading-relaxed text-ink-muted">
                    {t(
                      "Argus identified {n} optimization recommendations based on recent response latencies, failure rates, and provider redundancy.",
                      { n: recommendedActions.length },
                    )}
                  </p>

                  <div className="flex flex-col gap-3">
                    {recommendedActions.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-col gap-2.5 rounded-xl border border-edge-soft bg-canvas/30 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <AddonLogo
                              addonId={a.id}
                              addonName={a.name}
                              manifestLogo={resolveAddonLogo(a.addon.manifest?.logo, a.addon.transportUrl)}
                              size="sm"
                            />
                            <span className="text-[14px] font-semibold text-ink">{a.name}</span>
                          </div>
                          {a.recommendation === "pause" && (
                            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10.5px] font-bold text-red-300 ring-1 ring-red-500/30">
                              {t("Recommend: Pause")}
                            </span>
                          )}
                          {a.recommendation === "inspect" && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-bold text-amber-300 ring-1 ring-amber-500/30">
                              {t("Recommend: Inspect")}
                            </span>
                          )}
                        </div>

                        <ul className="flex flex-col gap-1 text-[12.5px] text-ink-muted ps-1">
                          {a.issues.map((iss, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-amber-400" />
                              <span>{iss}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="flex items-center justify-between border-t border-edge-soft/60 pt-2 text-[11.5px] text-ink-subtle">
                          <span>
                            {a.score != null ? t("Reliability: {n}%", { n: a.score }) : t("Reliability: unverified")}
                            {a.medianMs != null ? ` · Latency: ~${a.medianMs}ms` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggle(a)}
                            className="font-semibold text-ink hover:text-accent transition-colors"
                          >
                            {a.enabled ? t("Pause now") : t("Resume")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-3 border-t border-edge-soft px-6 py-4">
          <span className="text-[11.5px] text-ink-subtle">
            {applied ? t("Optimizations applied successfully.") : t("Changes only take effect with your confirmation.")}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex h-10 items-center rounded-full bg-raised px-4 text-[12.5px] font-semibold text-ink-muted transition-colors hover:bg-canvas/55 hover:text-ink"
            >
              {applied ? t("Done") : t("Close")}
            </button>
            {recommendedActions.length > 0 && !applied && (
              <button
                onClick={handleApplyAll}
                className="flex h-10 items-center gap-1.5 rounded-full bg-accent px-5 text-[13px] font-semibold text-canvas transition-opacity hover:opacity-90"
              >
                <Sparkles size={14} strokeWidth={2.4} />
                <span>{t("Apply Recommendations")}</span>
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
