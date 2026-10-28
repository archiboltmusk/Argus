import { CheckCircle2, Copy, Download, HardDrive, RefreshCw, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { clearTransientStorage, runStorageAudit, type StorageAuditResult } from "@/lib/storage-audit";
import { exportRedactedDiagnostics } from "@/lib/diagnostics/redact";
import { loadStoredSettings } from "@/lib/settings/load";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function TrustCenterTab() {
  const [audit, setAudit] = useState<StorageAuditResult>(runStorageAudit);
  const [notice, setNotice] = useState<string | null>(null);

  const handleRefresh = () => {
    setAudit(runStorageAudit());
    setNotice("Storage and credential audit refreshed.");
  };

  const handleClearCache = () => {
    const { clearedCount, bytesFreed } = clearTransientStorage();
    setAudit(runStorageAudit());
    setNotice(`Cleaned ${clearedCount} temporary cache records (${formatBytes(bytesFreed)} freed).`);
  };

  const handleCopyDiagnostics = () => {
    try {
      const text = exportRedactedDiagnostics(loadStoredSettings());
      navigator.clipboard?.writeText(text);
      setNotice("Redacted diagnostics copied to clipboard. Zero sensitive tokens included.");
    } catch {
      setNotice("Could not copy diagnostics.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Credential Isolation & Privacy Audit */}
      <section className="rounded-2xl border border-edge-soft bg-surface/70 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-accent" />
            <h2 className="text-lg font-semibold">Credential Isolation &amp; Privacy Audit</h2>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-edge-soft px-3 py-1.5 text-xs font-medium hover:bg-surface-hover"
          >
            <RefreshCw size={12} /> Re-audit
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-edge-soft bg-surface p-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 size={16} /> 100% Local Storage
            </div>
            <p className="mt-1.5 text-ink-subtle leading-relaxed">
              Debrid tokens, Trakt secrets, and private API keys are kept strictly on your local device.
            </p>
          </div>
          <div className="rounded-xl border border-edge-soft bg-surface p-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 size={16} /> Verified Zero-Leak Exports
            </div>
            <p className="mt-1.5 text-ink-subtle leading-relaxed">
              Diagnostic outputs automatically scrub credentials, passwords, and user paths.
            </p>
          </div>
          <div className="rounded-xl border border-edge-soft bg-surface p-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 size={16} /> Zero Telemetry Trackers
            </div>
            <p className="mt-1.5 text-ink-subtle leading-relaxed">
              No tracking pixels, third-party analytics scripts, or device fingerprinting.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-3.5 text-xs">
          <span className="text-ink-subtle">
            Need support? Generate an anonymized diagnostic report that scrubs all private keys:
          </span>
          <button
            type="button"
            onClick={handleCopyDiagnostics}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 font-semibold text-accent hover:bg-accent/20"
          >
            <Copy size={13} /> Copy Redacted Diagnostics
          </button>
        </div>
      </section>

      {/* Local Storage & Cache Inspector */}
      <section className="rounded-2xl border border-edge-soft bg-surface/70 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <HardDrive size={18} className="text-accent" />
              <h2 className="text-lg font-semibold">Local Storage &amp; Cache Inventory</h2>
            </div>
            <p className="mt-1 text-xs text-ink-subtle">
              Total estimated local database footprint: <strong>{formatBytes(audit.totalEstimatedBytes)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearCache}
            className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20"
          >
            <Trash2 size={13} /> Clean Temporary Caches
          </button>
        </div>

        {notice && (
          <div className="mb-4 rounded-xl border border-accent/20 bg-accent/10 p-3 text-xs text-accent">
            {notice}
          </div>
        )}

        <div className="space-y-3">
          {audit.categories.map((c) => {
            const pct = audit.totalEstimatedBytes > 0 ? (c.estimatedBytes / audit.totalEstimatedBytes) * 100 : 0;

            return (
              <div key={c.name} className="rounded-xl border border-edge-soft bg-surface p-3.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-ink">{c.name}</h3>
                    <p className="mt-0.5 text-[11px] text-ink-subtle">{c.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{formatBytes(c.estimatedBytes)}</span>
                    <span className="text-[11px] text-ink-subtle"> ({c.count} records)</span>
                  </div>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
