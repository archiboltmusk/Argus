import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  HardDrive,
  Layers,
  RefreshCw,
  Server,
  ShieldCheck,
  Wifi,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { Section } from "../shared";
import { fetchInstalledAddons } from "@/lib/addon-store";
import { userAddons, type Addon } from "@/lib/addons";
import { useAuth } from "@/lib/auth";
import { useAddonStatus, useAddonScore } from "@/lib/addon-health/store";
import { useAddonTests } from "@/views/addons/use-addon-tests";
import type { ResolvedAddon } from "@/lib/addons-store/store";
import {
  mediaServerConnections,
  subscribeMediaServerConnections,
} from "@/lib/media-server/connections";
import { probeMediaServerHealth } from "@/lib/media-server/health";
import { useMediaServerHealth } from "@/hooks/use-media-server-health";
import type { MediaServerConnection } from "@/lib/media-server/types";
import {
  fetchAioStatusHealth,
  type AioStatusSnapshot,
  type AioService,
} from "@/lib/streams/aiostatus";
import { useView } from "@/lib/view";

export function ConnectionHealthSection() {
  const t = useT();
  const { setView } = useView();
  const { authKey } = useAuth();

  // 1. Addons
  const [addons, setAddons] = useState<ResolvedAddon[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const addonTests = useAddonTests();

  const loadAddons = useCallback(async () => {
    setAddonsLoading(true);
    try {
      const local = await fetchInstalledAddons().catch(() => [] as Addon[]);
      const stremio = authKey ? await userAddons(authKey).catch(() => [] as Addon[]) : [];
      const combined = [...local, ...stremio];
      const seen = new Set<string>();
      const list: ResolvedAddon[] = [];
      for (const a of combined) {
        if (!a?.manifest?.id || seen.has(a.manifest.id)) continue;
        seen.add(a.manifest.id);
        list.push({
          manifest: a.manifest,
          transportUrl: a.transportUrl,
          source: "user",
          installed: true,
        });
      }
      setAddons(list);
    } finally {
      setAddonsLoading(false);
    }
  }, [authKey]);

  useEffect(() => {
    void loadAddons();
  }, [loadAddons]);

  // 2. Media Servers (Plex / Jellyfin / Emby)
  const [servers, setServers] = useState<MediaServerConnection[]>(() => mediaServerConnections());
  useEffect(() => {
    const update = () => setServers(mediaServerConnections());
    return subscribeMediaServerConnections(update);
  }, []);
  const serverHealth = useMediaServerHealth(servers);

  // 3. Debrid Services (Real-Debrid, TorBox, AllDebrid, Premiumize, Debrid-Link)
  const [aioHealth, setAioHealth] = useState<AioStatusSnapshot | null>(null);
  const [debridLoading, setDebridLoading] = useState(false);

  const checkDebrid = useCallback(async () => {
    if (!authKey) return;
    setDebridLoading(true);
    try {
      const list = await userAddons(authKey).catch(() => [] as Addon[]);
      if (list.length > 0) {
        const snap = await fetchAioStatusHealth(list, new AbortController().signal);
        setAioHealth(snap);
      }
    } finally {
      setDebridLoading(false);
    }
  }, [authKey]);

  useEffect(() => {
    void checkDebrid();
  }, [checkDebrid]);

  // Run full system diagnostics across all services
  const runningAll = addonTests.running || addonsLoading || debridLoading;
  const testAllConnections = useCallback(() => {
    if (addons.length > 0) {
      addonTests.testAll(addons);
    }
    servers.forEach((s) => void probeMediaServerHealth(s));
    void checkDebrid();
  }, [addons, addonTests, servers, checkDebrid]);

  // Operational metrics
  const serverIssues = servers.filter((s) => serverHealth[s.id] === "inactive").length;
  const debridIssues = (aioHealth?.services ?? []).filter(
    (s) => s.status === "expired" || s.status === "expiring",
  ).length;

  return (
    <Section
      title={t("Connection health & diagnostics")}
      subtitle={t(
        "Monitor uptime, response latency, and reachability across your installed addons, Debrid providers, and local media servers in one place.",
      )}
    >
      <div className="flex flex-col gap-6">
        {/* Top summary card */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-edge-soft bg-elevated/40 p-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                serverIssues > 0 || debridIssues > 0
                  ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
              }`}
            >
              {serverIssues > 0 || debridIssues > 0 ? (
                <AlertTriangle size={18} strokeWidth={2.4} />
              ) : (
                <ShieldCheck size={20} strokeWidth={2.4} />
              )}
            </span>
            <div>
              <p className="text-[15px] font-semibold text-ink">
                {serverIssues > 0 || debridIssues > 0
                  ? t("{n} connection(s) require attention", { n: serverIssues + debridIssues })
                  : t("All configured connections are operational")}
              </p>
              <p className="text-[12.5px] text-ink-subtle">
                {t(
                  "{addons} addons · {debrids} debrid accounts · {servers} media servers",
                  {
                    addons: addons.length,
                    debrids: aioHealth?.services.length ?? 0,
                    servers: servers.length,
                  },
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={testAllConnections}
            disabled={runningAll}
            className="flex h-9 items-center gap-2 rounded-full border border-edge-soft bg-raised px-4 text-[12.5px] font-semibold text-ink transition-colors hover:bg-elevated hover:text-accent disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw
              size={13}
              strokeWidth={2.4}
              className={runningAll ? "animate-spin text-accent" : ""}
            />
            {runningAll ? t("Testing connections…") : t("Test all connections")}
          </button>
        </div>

        {/* 1. Addons section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.16em] text-ink-subtle">
              <Layers size={14} />
              {t("Installed addons ({n})", { n: addons.length })}
            </h4>
            <button
              type="button"
              onClick={() => setView("addons")}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-muted transition-colors hover:text-ink"
            >
              {t("Manage addons")}
              <ChevronRight size={13} strokeWidth={2.4} className="rtl:-scale-x-100" />
            </button>
          </div>

          {addons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-edge-soft p-5 text-center text-[13px] text-ink-subtle">
              {t("No addons installed yet.")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {addons.map((a) => {
                const key = a.manifest?.id ?? a.curated?.id ?? a.transportUrl;
                return (
                  <AddonHealthRow
                    key={key}
                    addon={a}
                    testState={addonTests.states[key]}
                    onTest={() => addonTests.testOne(a)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Debrid services section */}
        <div className="flex flex-col gap-3">
          <h4 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.16em] text-ink-subtle">
            <Zap size={14} />
            {t("Debrid & streaming accounts")}
          </h4>
          {!aioHealth || aioHealth.services.length === 0 ? (
            <div className="rounded-xl border border-dashed border-edge-soft p-5 text-center text-[13px] text-ink-subtle">
              {t("No Debrid services monitored via AIOStatus yet. Configure tokens in Streaming sources.")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {aioHealth.services.map((s) => (
                <DebridHealthRow key={s.id} service={s} />
              ))}
            </div>
          )}
        </div>

        {/* 3. Media servers section */}
        <div className="flex flex-col gap-3">
          <h4 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.16em] text-ink-subtle">
            <Server size={14} />
            {t("Media servers ({n})", { n: servers.length })}
          </h4>
          {servers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-edge-soft p-5 text-center text-[13px] text-ink-subtle">
              {t("No home media servers (Plex, Jellyfin, Emby) configured yet.")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {servers.map((s) => (
                <MediaServerHealthRow
                  key={s.id}
                  server={s}
                  status={serverHealth[s.id] ?? "checking"}
                  onProbe={() => void probeMediaServerHealth(s)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

function AddonHealthRow({
  addon,
  testState,
  onTest,
}: {
  addon: ResolvedAddon;
  testState?: { running: boolean; result?: { status: string; ms: number } };
  onTest: () => void;
}) {
  const t = useT();
  const id = addon.manifest?.id ?? addon.curated?.id ?? "";
  const name = addon.manifest?.name ?? addon.curated?.name ?? id;
  const status = useAddonStatus(id);
  const score = useAddonScore(id);

  const isFailing = status === "failing" || testState?.result?.status === "fail";
  const isDegraded = status === "degraded" || testState?.result?.status === "slow";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-edge-soft bg-elevated/30 px-3.5 py-2.5 transition-colors hover:border-edge">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            isFailing
              ? "bg-danger"
              : isDegraded
                ? "bg-amber-400"
                : "bg-emerald-400"
          }`}
        />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-ink">
            {name}
          </p>
          <p className="truncate text-[11.5px] text-ink-subtle">
            {isFailing
              ? t("Not responding")
              : isDegraded
                ? t("Slow / Degraded")
                : t("Operational")}
            {score != null && ` · ${score}% ${t("score")}`}
            {testState?.result?.ms != null && ` · ${testState.result.ms}ms`}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onTest}
        disabled={testState?.running}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-subtle ring-1 ring-edge-soft transition-colors hover:text-ink hover:ring-edge disabled:opacity-60"
        title={t("Test addon latency")}
        aria-label={t("Test addon latency")}
      >
        <RefreshCw size={11} strokeWidth={2.4} className={testState?.running ? "animate-spin" : ""} />
      </button>
    </div>
  );
}

function DebridHealthRow({ service }: { service: AioService }) {
  const t = useT();
  const isExpired = service.status === "expired";
  const isExpiring = service.status === "expiring";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-edge-soft bg-elevated/30 px-3.5 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            isExpired ? "bg-danger" : isExpiring ? "bg-amber-400" : "bg-emerald-400"
          }`}
        />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-ink">{service.name}</p>
          <p className="truncate text-[11.5px] text-ink-subtle">
            {isExpired
              ? t("Expired")
              : isExpiring
                ? t("Expiring soon ({n}d left)", { n: service.daysLeft ?? 0 })
                : t("Active ({n}d left)", { n: service.daysLeft ?? 0 })}
            {service.quotaUsedPercent != null && ` · ${service.quotaUsedPercent}% quota`}
          </p>
        </div>
      </div>
      <span
        className={`rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] ${
          isExpired
            ? "bg-danger/15 text-danger ring-1 ring-danger/30"
            : isExpiring
              ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"
              : "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
        }`}
      >
        {isExpired ? t("Expired") : isExpiring ? t("Warning") : t("Healthy")}
      </span>
    </div>
  );
}

function MediaServerHealthRow({
  server,
  status,
  onProbe,
}: {
  server: MediaServerConnection;
  status: "checking" | "active" | "inactive";
  onProbe: () => void;
}) {
  const t = useT();
  const isActive = status === "active";
  const isChecking = status === "checking";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-edge-soft bg-elevated/30 px-3.5 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            isActive ? "bg-emerald-400" : isChecking ? "bg-amber-400 animate-pulse" : "bg-danger"
          }`}
        />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-ink">
            {server.name || server.provider.toUpperCase()}
          </p>
          <p className="truncate text-[11.5px] text-ink-subtle">
            {server.origin || server.provider} ·{" "}
            {isActive
              ? t("Connected")
              : isChecking
                ? t("Checking…")
                : t("Unreachable")}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onProbe}
        disabled={isChecking}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-subtle ring-1 ring-edge-soft transition-colors hover:text-ink hover:ring-edge disabled:opacity-60"
        title={t("Probe server connection")}
        aria-label={t("Probe server connection")}
      >
        <RefreshCw size={11} strokeWidth={2.4} className={isChecking ? "animate-spin" : ""} />
      </button>
    </div>
  );
}

function Zap({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
