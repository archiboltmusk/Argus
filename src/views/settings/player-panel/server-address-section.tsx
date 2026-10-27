import {
  Check,
  Copy,
   Cpu,
  ExternalLink,
  FolderOpen,
  Gauge,
  Globe,
  HardDrive,
  Link2,
  Loader2,
  Play,
  Plus,
  RotateCw,
  Server,
  Shield,
  Square,
  Trash2,
  X,
} from "../icons";
import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { appCacheDir, join } from "@tauri-apps/api/path";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { Dropdown } from "@/components/dropdown";
import { APP_VERSION, BUILD_ID } from "@/lib/build-info";
import { useSettings } from "@/lib/settings";
import {
  buildRemoteStreamingUrl,
  bundledServerPort,
  bundledServerUrl,
  DEFAULT_BUNDLED_PORT,
  fetchStremioServerSettings,
  formatTrailingSlashUrl,
  getCastServerStatus,
  inferTorrentProfileFromServer,
  isLoopbackServerUrl,
  probeStremioServer,
  restartCastServer,
  TORRENT_PROFILE_PRESETS,
  type TorrentProfileId,
  updateStremioServerSettings,
} from "@/lib/stremio-server";
import {
  torrentEngineSetOptions,
  torrentEngineSetProfile,
} from "@/lib/torrent/local-engine";
import { openUrl } from "@/lib/window";
import { Section } from "../shared";
import { SettingGroup, SettingRow, ROW_ACTION, ROW_ACTION_PRIMARY, ROW_DESC } from "../kit";
import { BADGE_BASE } from "./choice";
import { isTauri } from "./internals";
import { useT } from "@/lib/i18n";

type EngineState = "checking" | "running" | "starting" | "stopped";
type UrlProbeState = "checking" | "online" | "offline";

const PORT_TAKEN_RE = /unavailable|in use|EADDRINUSE|10048/i;

const PILL: Record<EngineState, { dot: string; chip: string }> = {
  checking: { dot: "bg-ink-subtle", chip: "bg-elevated text-ink-subtle" },
  running: { dot: "bg-success", chip: "bg-elevated text-success" },
  starting: { dot: "bg-accent", chip: "bg-accent-soft text-accent" },
  stopped: { dot: "bg-danger", chip: "bg-elevated text-danger" },
};

const CACHE_SIZE_OPTIONS: Array<{ gb: number; bytes: number | null; label: string }> = [
  { gb: -1, bytes: 0, label: "No caching" },
  { gb: 2, bytes: 2 * 1024 * 1024 * 1024, label: "2GiB" },
  { gb: 5, bytes: 5 * 1024 * 1024 * 1024, label: "5GiB" },
  { gb: 10, bytes: 10 * 1024 * 1024 * 1024, label: "10GiB" },
  { gb: 20, bytes: 20 * 1024 * 1024 * 1024, label: "20GiB" },
  { gb: 50, bytes: 50 * 1024 * 1024 * 1024, label: "50GiB" },
  { gb: 100, bytes: 100 * 1024 * 1024 * 1024, label: "100GiB" },
  { gb: 0, bytes: null, label: "Infinite" },
];

const TORRENT_PROFILES: Array<{ value: TorrentProfileId; label: string }> = [
  { value: "default", label: "Default" },
  { value: "soft", label: "Soft" },
  { value: "fast", label: "Fast" },
  { value: "ultra-fast", label: "Ultra Fast" },
];

const DEFAULT_TRANSCODE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Disabled" },
  { value: "videotoolbox", label: "videotoolbox" },
  { value: "nvenc", label: "nvenc" },
  { value: "qsv", label: "qsv" },
  { value: "vaapi", label: "vaapi" },
  { value: "amf", label: "amf" },
  { value: "software", label: "software" },
];

const BUILTIN_URLS = [
  `http://127.0.0.1:${DEFAULT_BUNDLED_PORT}/`,
  `http://localhost:${DEFAULT_BUNDLED_PORT}/`,
];

async function probeBundled(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`${bundledServerUrl()}/settings`, {
      method: "GET",
      signal: ctrl.signal,
    });
    window.clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function readEngineState(): Promise<EngineState> {
  const s = await getCastServerStatus();
  if (s?.ready) return "running";
  if (s?.running) return "starting";
  if (s) return "stopped";
  return (await probeBundled()) ? "running" : "stopped";
}

export function AddressRow({
  label,
  url,
  openable,
}: {
  label: string;
  url: string;
  openable?: boolean;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  };
  return (
    <SettingRow
      icon={<Globe size={18} strokeWidth={1.9} />}
      label={label}
      desc={
        <span className="block break-all font-mono text-[15.5px] leading-[22px] text-ink">
          {url}
        </span>
      }
    >
      <button
        type="button"
        onClick={copy}
        aria-label={t("Copy {label} address", { label })}
        className={ROW_ACTION}
      >
        {copied ? (
          <Check size={16} strokeWidth={2.4} className="text-success" />
        ) : (
          <Copy size={16} strokeWidth={1.9} />
        )}
        {copied ? t("Copied") : t("Copy")}
      </button>
      {openable && (
        <button
          type="button"
          onClick={() => openUrl(url)}
          aria-label={t("Open {label} address", { label })}
          className={ROW_ACTION}
        >
          <ExternalLink size={16} strokeWidth={1.9} />
          {t("Open")}
        </button>
      )}
    </SettingRow>
  );
}

function ControlButton({
  icon,
  label,
  busy,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={busy ? undefined : onClick}
      aria-disabled={busy}
      className={`${ROW_ACTION}${busy ? " pointer-events-none opacity-45" : ""}`}
    >
      {busy ? <Loader2 size={16} strokeWidth={1.9} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

function shortenPath(path: string, maxLen = 30): string {
  if (!path) return "";
  if (path.length <= maxLen) return path;
  return `${path.slice(0, maxLen - 3)}...`;
}

export function ServerAddressSection() {
  const t = useT();
  const { settings, update } = useSettings();
  const [lanIp, setLanIp] = useState<string | null>(null);
  const [lanIps, setLanIps] = useState<string[]>([]);
  const [engine, setEngine] = useState<EngineState>("checking");
  const [port, setPort] = useState(bundledServerPort());
  const [acting, setActing] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [urlStatuses, setUrlStatuses] = useState<Record<string, UrlProbeState>>({});
  const [addingUrl, setAddingUrl] = useState(false);
  const [newUrlDraft, setNewUrlDraft] = useState("");
  const [remoteCopied, setRemoteCopied] = useState(false);
  const [defaultCacheDir, setDefaultCacheDir] = useState("");
  const [serverVersion, setServerVersion] = useState("4.22.4");
  const [serverBaseUrl, setServerBaseUrl] = useState<string | null>(null);
  const [hwOptions, setHwOptions] = useState<Array<{ value: string; label: string }>>(
    DEFAULT_TRANSCODE_OPTIONS,
  );
  const aliveRef = useRef(true);

  const configuredUrls = (() => {
    const seen = new Set<string>();
    const list: string[] = [];
    const add = (u: string | undefined) => {
      if (!u) return;
      const formatted = formatTrailingSlashUrl(u);
      if (!formatted || seen.has(formatted)) return;
      seen.add(formatted);
      list.push(formatted);
    };
    for (const b of BUILTIN_URLS) add(b);
    for (const u of settings.streamServerUrls) add(u);
    if (settings.remoteStreamServerUrl) add(settings.remoteStreamServerUrl);
    if (settings.selectedStreamServerUrl) add(settings.selectedStreamServerUrl);
    return list;
  })();

  const selectedUrl = formatTrailingSlashUrl(
    settings.selectedStreamServerUrl ||
      settings.remoteStreamServerUrl ||
      `http://localhost:${port}/`,
  );

  const probeAllUrls = async (urls: string[], activeUrl: string, force = false) => {
    const nextStatuses: Record<string, UrlProbeState> = {};
    for (const u of urls) {
      nextStatuses[u] = "checking";
    }
    if (aliveRef.current && force) {
      setUrlStatuses((prev) => ({ ...prev, ...nextStatuses }));
    }

    await Promise.all(
      urls.map(async (u) => {
        const ok = await probeStremioServer(force, u.replace(/\/+$/, ""));
        nextStatuses[u] = ok ? "online" : "offline";
      }),
    );

    if (!aliveRef.current) return;
    setUrlStatuses(nextStatuses);

    const serverCfg = await fetchStremioServerSettings(activeUrl.replace(/\/+$/, ""));
    if (!aliveRef.current || !serverCfg) return;

    if (serverCfg.baseUrl) {
      setServerBaseUrl(serverCfg.baseUrl);
    }
    if (serverCfg.values?.serverVersion) {
      setServerVersion(serverCfg.values.serverVersion);
    }
    const tpOpt = serverCfg.options?.find((o) => o.id === "transcodeProfile");
    if (tpOpt?.selections && tpOpt.selections.length > 0) {
      const mapped = tpOpt.selections.map((s) => ({
        value: s.val == null ? "" : String(s.val),
        label: s.name || (s.val == null ? "Disabled" : String(s.val)),
      }));
      for (const fallback of DEFAULT_TRANSCODE_OPTIONS) {
        if (!mapped.some((m) => m.value === fallback.value)) {
          mapped.push(fallback);
        }
      }
      setHwOptions(mapped);
    }
    const inferredProfile = inferTorrentProfileFromServer(serverCfg.values);
    if (inferredProfile && inferredProfile !== settings.torrentProfile && force) {
      update({ torrentProfile: inferredProfile });
    }
  };

  const refresh = async (force = false) => {
    const next = await readEngineState();
    const s = await getCastServerStatus();
    if (aliveRef.current) {
      setEngine(next);
      setPort(bundledServerPort());
      setLastError(next === "stopped" ? s?.last_error ?? null : null);
    }
    await probeAllUrls(configuredUrls, selectedUrl, force);
  };

  useEffect(() => {
    aliveRef.current = true;
    if (isTauri) {
      void invoke<string | null>("lan_ip")
        .then((ip) => {
          if (aliveRef.current && ip) setLanIp(ip);
        })
        .catch(() => {});
      void invoke<string[]>("lan_ips")
        .then((ips) => {
          if (aliveRef.current && Array.isArray(ips)) setLanIps(ips);
        })
        .catch(() => {});
      void appCacheDir()
        .then((dir) => join(dir, "engine"))
        .then((enginePath) => {
          if (aliveRef.current) setDefaultCacheDir(enginePath);
        })
        .catch(() => {});
    }
    void refresh(false);
    const timer = window.setInterval(() => void refresh(false), 5000);
    return () => {
      aliveRef.current = false;
      window.clearInterval(timer);
    };
  }, [selectedUrl, settings.streamServerUrls.length]);

  const selectServerUrl = (url: string) => {
    const formatted = formatTrailingSlashUrl(url);
    const isLocal = isLoopbackServerUrl(formatted);
    update({
      selectedStreamServerUrl: formatted,
      remoteStreamServerUrl: isLocal ? "" : formatted.replace(/\/+$/, ""),
    });
    void probeAllUrls(configuredUrls, formatted, true);
  };

  const handleAddUrl = () => {
    const formatted = formatTrailingSlashUrl(newUrlDraft);
    if (!formatted) return;
    const nextList = configuredUrls.includes(formatted)
      ? configuredUrls
      : [...configuredUrls, formatted];
    const isLocal = isLoopbackServerUrl(formatted);
    update({
      streamServerUrls: nextList,
      selectedStreamServerUrl: formatted,
      remoteStreamServerUrl: isLocal ? "" : formatted.replace(/\/+$/, ""),
    });
    setNewUrlDraft("");
    setAddingUrl(false);
    void probeAllUrls(nextList, formatted, true);
  };

  const handleRemoveUrl = (urlToRemove: string) => {
    if (BUILTIN_URLS.includes(urlToRemove)) return;
    const nextList = configuredUrls.filter((u) => u !== urlToRemove);
    const nextSelected =
      selectedUrl === urlToRemove ? `http://localhost:${port}/` : selectedUrl;
    const isLocal = isLoopbackServerUrl(nextSelected);
    update({
      streamServerUrls: nextList,
      selectedStreamServerUrl: nextSelected,
      remoteStreamServerUrl: isLocal ? "" : nextSelected.replace(/\/+$/, ""),
    });
  };

  const handleReload = async () => {
    setReloading(true);
    try {
      if (isTauri && isLoopbackServerUrl(selectedUrl)) {
        const st = await getCastServerStatus();
        if (!st?.ready) {
          await restartCastServer();
        }
      }
      await refresh(true);
    } finally {
      if (aliveRef.current) setReloading(false);
    }
  };

  const start = async () => {
    setActing(true);
    setEngine("starting");
    setLastError(null);
    const failure = await restartCastServer();
    if (failure) {
      if (aliveRef.current) {
        setEngine("stopped");
        setLastError(failure);
        setActing(false);
      }
      return;
    }
    window.setTimeout(() => {
      void refresh(true).then(() => setActing(false));
    }, 1200);
  };

  const stop = async () => {
    setActing(true);
    await invoke("cast_server_stop").catch(() => {});
    window.setTimeout(() => {
      void refresh(true).then(() => setActing(false));
    }, 600);
  };

  const allIps = Array.from(
    new Set([
      ...(lanIp ? [lanIp] : []),
      ...lanIps,
      ...(settings.streamingHttpsEndpoint ? [settings.streamingHttpsEndpoint] : []),
    ]),
  );

  const httpsEndpointOptions = [
    { value: "", label: t("Disabled") },
    ...allIps.map((ip) => ({ value: ip, label: ip })),
  ];

  const remoteUrlDisplay = buildRemoteStreamingUrl({
    selectedUrl,
    httpsEndpoint: settings.streamingHttpsEndpoint,
    lanIp,
    serverBaseUrl,
  });

  const copyRemoteUrl = () => {
    if (!remoteUrlDisplay) return;
    void navigator.clipboard.writeText(remoteUrlDisplay).then(() => {
      setRemoteCopied(true);
      window.setTimeout(() => setRemoteCopied(false), 1600);
    });
  };

  const handleHttpsEndpointChange = (ip: string) => {
    update({ streamingHttpsEndpoint: ip });
    void updateStremioServerSettings(
      { remoteHttps: ip, httpsEndpoint: ip },
      selectedUrl.replace(/\/+$/, ""),
    );
    if (isTauri && ip && engine === "stopped") {
      void restartCastServer().then(() => refresh(true));
    }
  };

  const currentCacheGb = settings.streamCacheMaxGb;
  const matchedCacheOption = CACHE_SIZE_OPTIONS.some((o) => o.gb === currentCacheGb)
    ? String(currentCacheGb)
    : String(currentCacheGb);

  const handleCacheSizeChange = (val: string) => {
    const gb = Number(val);
    const normalizedGb = gb < 0 ? 0 : gb;
    update({ streamCacheMaxGb: gb });
    void torrentEngineSetOptions(
      settings.streamCacheDir || null,
      settings.streamCacheRetentionHours,
      normalizedGb,
      false,
    );
    const opt = CACHE_SIZE_OPTIONS.find((o) => o.gb === gb);
    const bytes = opt ? opt.bytes : normalizedGb > 0 ? normalizedGb * 1024 * 1024 * 1024 : null;
    void updateStremioServerSettings({ cacheSize: bytes }, selectedUrl.replace(/\/+$/, ""));
  };

  const effectiveCachePath = settings.streamCacheDir
    ? `${settings.streamCacheDir}/argus-stream-cache`
    : defaultCacheDir || "/Users/Shared/argus-stream-cache";

  const handleCachingDriveAction = async (val: string) => {
    if (val === "__pick__") {
      if (!isTauri) return;
      const picked = await openDialog({
        directory: true,
        defaultPath: settings.streamCacheDir || defaultCacheDir || undefined,
      });
      if (typeof picked === "string" && picked.trim()) {
        update({ streamCacheDir: picked });
        void torrentEngineSetOptions(
          picked,
          settings.streamCacheRetentionHours,
          Math.max(0, settings.streamCacheMaxGb),
          true,
        );
        void updateStremioServerSettings({ cacheRoot: picked }, selectedUrl.replace(/\/+$/, ""));
      }
      return;
    }
    if (val === "__default__") {
      update({ streamCacheDir: "" });
      void torrentEngineSetOptions(
        null,
        settings.streamCacheRetentionHours,
        Math.max(0, settings.streamCacheMaxGb),
        true,
      );
      void updateStremioServerSettings(
        { cacheRoot: defaultCacheDir },
        selectedUrl.replace(/\/+$/, ""),
      );
    }
  };

  const handleTorrentProfileChange = (val: string) => {
    const profile = (
      val === "soft" || val === "fast" || val === "ultra-fast" ? val : "default"
    ) as TorrentProfileId;
    update({ torrentProfile: profile });
    void torrentEngineSetProfile(profile, settings.transcodeProfile || null);
    const preset = TORRENT_PROFILE_PRESETS[profile];
    void updateStremioServerSettings({ ...preset }, selectedUrl.replace(/\/+$/, ""));
  };

  const handleTranscodeProfileChange = (val: string) => {
    update({ transcodeProfile: val });
    void torrentEngineSetProfile(settings.torrentProfile, val || null);
    void updateStremioServerSettings(
      { transcodeProfile: val || null },
      selectedUrl.replace(/\/+$/, ""),
    );
  };

  const pill = PILL[engine];
  const running = engine === "running" || engine === "starting";

  const pillLabel =
    engine === "checking"
      ? t("Checking")
      : engine === "running"
        ? t("Running")
        : engine === "starting"
          ? t("Starting")
          : t("Not running");

  return (
    <Section
      title={t("Your streaming server address")}
      subtitle={t(
        "To stream from this computer on another device, copy its local network address and enter it in Remote streaming server on that device.",
      )}
    >
      <SettingGroup label={t("Streaming")}>
        <div className="flex flex-col gap-3 px-4 py-4">
          <div className="grid grid-cols-[1fr_auto] items-center px-3 text-[13.5px] font-medium text-ink-subtle">
            <span>{t("URL")}</span>
            <span className="pe-6">{t("Status")}</span>
          </div>

          <div role="radiogroup" aria-label={t("Streaming server URL")} className="flex flex-col gap-2.5">
            {configuredUrls.map((u) => {
              const isSelected = u === selectedUrl;
              const status = urlStatuses[u] ?? "checking";
              const isBuiltin = BUILTIN_URLS.includes(u);
              return (
                <div
                  key={u}
                  onClick={() => selectServerUrl(u)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectServerUrl(u);
                    }
                  }}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  className={`group flex min-h-[54px] cursor-pointer items-center justify-between gap-4 rounded-full border px-5 py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    isSelected
                      ? "border-accent/50 bg-elevated text-ink"
                      : "border-edge-soft bg-elevated/65 text-ink-muted hover:border-edge hover:bg-elevated hover:text-ink"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3.5">
                    <span
                      aria-hidden
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                        isSelected ? "border-accent bg-accent/20" : "border-ink-subtle/50"
                      }`}
                    >
                      {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                    </span>
                    <span className="truncate font-mono text-[15.5px] text-ink">{u}</span>
                  </span>

                  <span className="flex shrink-0 items-center gap-3">
                    {status === "online" ? (
                      <span className="inline-flex items-center gap-2 text-[14.5px] font-medium text-ink">
                        <span className="h-2.5 w-2.5 rounded-full bg-success" />
                        {t("Online")}
                      </span>
                    ) : status === "offline" ? (
                      <span className="inline-flex items-center gap-2 text-[14.5px] font-medium text-ink-subtle">
                        <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                        {t("Offline")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-[14.5px] text-ink-subtle">
                        <Loader2 size={14} className="animate-spin" />
                        {t("Checking")}
                      </span>
                    )}
                    {!isBuiltin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveUrl(u);
                        }}
                        aria-label={t("Remove {url}", { url: u })}
                        className="grid h-8 w-8 place-items-center rounded-full text-ink-subtle transition-colors hover:bg-raised hover:text-danger"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {addingUrl && (
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                value={newUrlDraft}
                onChange={(e) => setNewUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddUrl();
                  if (e.key === "Escape") {
                    setAddingUrl(false);
                    setNewUrlDraft("");
                  }
                }}
                placeholder="http://192.168.1.50:11470/"
                spellCheck={false}
                autoComplete="off"
                aria-label={t("New streaming server URL")}
                className="h-11 min-w-[240px] flex-1 rounded-full border border-edge-soft bg-elevated px-4 font-mono text-[15.5px] text-ink outline-none placeholder:text-ink-subtle/55 focus-visible:border-edge focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
              <button type="button" onClick={handleAddUrl} className={ROW_ACTION_PRIMARY}>
                <Check size={16} strokeWidth={2.4} />
                {t("Save")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingUrl(false);
                  setNewUrlDraft("");
                }}
                className={ROW_ACTION}
              >
                <X size={16} strokeWidth={2.2} />
                {t("Cancel")}
              </button>
            </div>
          )}

          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setAddingUrl((v) => !v)}
              className="argus-press-pop inline-flex h-11 items-center gap-2 rounded-full bg-success px-5 text-[15px] font-semibold text-canvas transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Plus size={17} strokeWidth={2.5} />
              {t("Add URL")}
            </button>

            <button
              type="button"
              onClick={reloading ? undefined : () => void handleReload()}
              disabled={reloading}
              className="argus-press-pop inline-flex h-11 items-center gap-2 rounded-full border border-edge-soft bg-elevated px-5 text-[15px] font-semibold text-ink transition-colors hover:border-edge hover:bg-raised disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <RotateCw size={16} strokeWidth={2.2} className={reloading ? "animate-spin" : ""} />
              {t("Reload")}
            </button>
          </div>
        </div>

        <SettingRow
          icon={<Link2 size={18} strokeWidth={1.9} />}
          label={t("Remote URL")}
          desc={t("Shareable streaming endpoint for other devices on your network.")}
        >
          <span className="flex items-center gap-3">
            <span
              title={remoteUrlDisplay}
              className="max-w-[220px] truncate font-mono text-[15px] text-ink-muted"
            >
              {remoteUrlDisplay}
            </span>
            <button
              type="button"
              onClick={copyRemoteUrl}
              aria-label={t("Copy remote URL")}
              title={remoteCopied ? t("Copied") : t("Copy remote URL")}
              className="argus-press-pop grid h-11 w-11 shrink-0 place-items-center rounded-full border border-edge-soft bg-elevated text-ink transition-colors hover:border-edge hover:bg-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {remoteCopied ? (
                <Check size={17} strokeWidth={2.4} className="text-success" />
              ) : (
                <Link2 size={17} strokeWidth={2} />
              )}
            </button>
          </span>
        </SettingRow>

        <SettingRow
          icon={<Shield size={18} strokeWidth={1.9} />}
          label={t("Streaming HTTPS endpoint")}
          desc={t("Network interface used to serve HTTPS streams on your local network.")}
        >
          <Dropdown
            value={settings.streamingHttpsEndpoint}
            onChange={handleHttpsEndpointChange}
            ariaLabel={t("Streaming HTTPS endpoint")}
            className="w-[240px] max-w-full"
            options={httpsEndpointOptions}
          />
        </SettingRow>

        <SettingRow
          icon={<HardDrive size={18} strokeWidth={1.9} />}
          label={t("Cache size")}
          desc={t("Maximum disk space allocated to temporary streaming cache files.")}
        >
          <Dropdown
            value={matchedCacheOption}
            onChange={handleCacheSizeChange}
            ariaLabel={t("Cache size")}
            className="w-[240px] max-w-full"
            options={[
              ...CACHE_SIZE_OPTIONS.map((c) => ({ value: String(c.gb), label: t(c.label) })),
              ...(CACHE_SIZE_OPTIONS.some((c) => c.gb === currentCacheGb)
                ? []
                : [{ value: String(currentCacheGb), label: `${currentCacheGb}GiB` }]),
            ]}
          />
        </SettingRow>

        <SettingRow
          icon={<FolderOpen size={18} strokeWidth={1.9} />}
          label={t("Caching drive")}
          desc={t("Directory where active peer-to-peer stream cache data is stored.")}
        >
          <Dropdown
            value="current"
            onChange={(v) => void handleCachingDriveAction(v)}
            ariaLabel={t("Caching drive")}
            className="w-[240px] max-w-full"
            options={[
              {
                value: "current",
                label: shortenPath(effectiveCachePath, 28),
                dir: "ltr",
              },
              ...(isTauri ? [{ value: "__pick__", label: t("Choose folder…") }] : []),
              ...(settings.streamCacheDir
                ? [{ value: "__default__", label: t("Reset to default folder") }]
                : []),
            ]}
          />
        </SettingRow>

        <SettingRow
          icon={<Gauge size={18} strokeWidth={1.9} />}
          label={t("Torrent profile")}
          desc={t("Connection limits and peer discovery aggressiveness for BitTorrent streams.")}
        >
          <Dropdown
            value={settings.torrentProfile}
            onChange={handleTorrentProfileChange}
            ariaLabel={t("Torrent profile")}
            className="w-[240px] max-w-full"
            options={TORRENT_PROFILES.map((p) => ({
              value: p.value,
              label: t(p.label),
            }))}
          />
        </SettingRow>

        <SettingRow
          icon={<Cpu size={18} strokeWidth={1.9} />}
          label={t("Transcode profile")}
          desc={t("Hardware acceleration backend used when transcoding streams.")}
        >
          <Dropdown
            value={settings.transcodeProfile}
            onChange={handleTranscodeProfileChange}
            ariaLabel={t("Transcode profile")}
            className="w-[240px] max-w-full"
            options={hwOptions.map((o) => ({
              value: o.value,
              label: o.value === "" ? t(o.label) : o.label,
            }))}
          />
        </SettingRow>
      </SettingGroup>

      {isTauri && (
        <SettingGroup label={t("Server")}>
          <SettingRow
            icon={<Server size={18} strokeWidth={1.9} />}
            label={
              <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
                <span className="min-w-0">{t("Streaming server")}</span>
                <span className={`${BADGE_BASE} gap-1.5 ${pill.chip}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
                  {pillLabel}
                </span>
              </span>
            }
            desc={t("Handles P2P playback and transcoding for this machine.")}
          >
            {running ? (
              <>
                <ControlButton
                  icon={<Square size={16} strokeWidth={2} />}
                  label={t("Stop")}
                  busy={acting}
                  onClick={() => void stop()}
                />
                <ControlButton
                  icon={<RotateCw size={16} strokeWidth={2} />}
                  label={t("Restart")}
                  busy={acting}
                  onClick={() => void start()}
                />
              </>
            ) : (
              <ControlButton
                icon={<Play size={16} strokeWidth={2} />}
                label={t("Start server")}
                busy={acting || engine === "checking"}
                onClick={() => void start()}
              />
            )}
          </SettingRow>

          {engine === "stopped" && lastError && (
            <div className="flex flex-col gap-1.5 rounded-[10px] bg-elevated px-4 py-3">
              <span className="max-w-[66ch] text-[15.5px] leading-[22px] text-danger">
                <span className="font-semibold">{t("Server couldn't start:")}</span> {lastError}
              </span>
              {PORT_TAKEN_RE.test(lastError) && (
                <span className={`max-w-[66ch] ${ROW_DESC}`}>
                  {t(
                    "Another program already holds this port, usually a Stremio server that is running on this machine. Argus tried its spare ports too. Stop that server, or leave it running and point Argus at it in Remote streaming server below.",
                  )}
                </span>
              )}
              {/not bundled/i.test(lastError) && (
                <span className={`max-w-[66ch] ${ROW_DESC}`}>
                  {t(
                    "This usually means antivirus removed the server file (stremio-server.exe). Add Argus's install folder to your antivirus exclusions, then reinstall.",
                  )}
                </span>
              )}
            </div>
          )}
        </SettingGroup>
      )}

      {isTauri && (
        <SettingGroup label={t("Addresses")}>
          <AddressRow
            label={t("On this computer")}
            url={`http://127.0.0.1:${port}`}
            openable={running}
          />
          {lanIp && <AddressRow label={t("On your local network")} url={`http://${lanIp}:${port}`} />}
        </SettingGroup>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1.5 px-1 text-[13.5px] tabular-nums text-ink-subtle">
        <span>
          {t("App Version")}: <span className="font-mono">{APP_VERSION}</span>
        </span>
        <span>
          {t("Build Version")}: <span className="font-mono">{BUILD_ID}</span>
        </span>
        <span>
          {t("Server Version")}: <span className="font-mono">{serverVersion}</span>
        </span>
        <span>
          {t("Shell Version")}: <span className="font-mono">{isTauri ? "2.12.0" : "web"}</span>
        </span>
      </div>

      <p className={`max-w-[70ch] ${ROW_DESC}`}>
        {t(
          "Looking for Argus in your browser, the phone remote, or the manga reader remote? They moved to the Remotes page.",
        )}
      </p>
    </Section>
  );
}
