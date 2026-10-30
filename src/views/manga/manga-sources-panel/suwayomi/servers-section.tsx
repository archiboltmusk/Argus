import { Check, FolderOpen, Loader2, Pencil, Play, Plus, Power, RefreshCw, Server, Sparkles, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { CARD } from "../shared";
import { ServerForm } from "./server-form";
import { removeServer, setActiveServer } from "./servers-store";
import { useServers } from "./use-servers";
import { initials, serverHost, type SuwayomiServer } from "./types";
import { useSuwayomiDaemon } from "@/lib/manga/sources/suwayomi/daemon";

function ServerAvatar({ name }: { name: string }) {
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-canvas text-ink-muted ring-1 ring-edge-soft">
      <span className="text-[13px] font-bold">{initials(name)}</span>
    </span>
  );
}

function ServerRow({ server, active }: { server: SuwayomiServer; active: boolean }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);

  const remove = () => {
    setRemoving(true);
    window.setTimeout(() => removeServer(server.id), 240);
  };

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ${
        removing ? "max-h-0 scale-95 opacity-0" : editing ? "max-h-[900px]" : "max-h-28"
      } ${CARD} ${active ? "ring-2 ring-accent/50" : ""}`}
    >
      <div className="flex items-center gap-4 px-5 py-4">
        <button
          type="button"
          onClick={() => setActiveServer(server.id)}
          className="flex min-w-0 flex-1 items-center gap-4 text-start active:scale-[0.99] motion-reduce:active:scale-100"
        >
          <ServerAvatar name={server.name} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-2 truncate text-[16px] font-semibold text-ink">
              {server.name}
              {active && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-accent/15 px-1.5 py-0.5 text-[11px] font-bold text-accent">
                  <Check size={12} strokeWidth={3} /> {t("Active")}
                </span>
              )}
            </span>
            <span className="truncate text-[13px] text-ink-subtle">
              {serverHost(server.baseUrl)}
              {server.auth ? ` · ${t("authenticated")}` : ""}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-label={t("Edit {name}", { name: server.name })}
          aria-expanded={editing}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ring-edge-soft transition-all active:scale-95 motion-reduce:active:scale-100 ${
            editing ? "bg-accent/15 text-accent" : "bg-raised text-ink-subtle hover:text-ink"
          }`}
        >
          <Pencil size={17} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={remove}
          aria-label={t("Remove {name}", { name: server.name })}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-raised text-ink-subtle ring-1 ring-edge-soft transition-all hover:text-danger active:scale-95 motion-reduce:active:scale-100"
        >
          <Trash2 size={18} strokeWidth={2} />
        </button>
      </div>
      {editing && (
        <div className="argus-rise border-t border-edge-soft p-5">
          <ServerForm edit={server} onDone={() => setEditing(false)} />
        </div>
      )}
    </div>
  );
}

function LocalDaemonSupervisorCard() {
  const t = useT();
  const { status, start, stop, setAutoStart, probe } = useSuwayomiDaemon();
  const [busy, setBusy] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [customPath, setCustomPath] = useState(status.installedPath || "");

  const handleToggleStart = async () => {
    setBusy(true);
    try {
      if (status.state === "online") {
        await stop();
      } else {
        await start();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLocateFolder = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      let selected = await open({
        directory: true,
        multiple: false,
        title: t("Select Suwayomi Folder or App"),
      });
      if (!selected) {
        selected = await open({
          directory: false,
          multiple: false,
          title: t("Select Suwayomi App Bundle or Binary"),
        });
      }
      if (typeof selected === "string") {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("suwayomi_set_custom_path", { path: selected });
        await start();
      }
    } catch {
      setShowInput(true);
    }
  };

  const handleSaveCustomPath = async () => {
    if (!customPath.trim()) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("suwayomi_set_custom_path", { path: customPath.trim() });
      setShowInput(false);
      await start();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`overflow-hidden p-5 transition-all ${CARD}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ring-edge-soft ${
              status.state === "online" ? "bg-emerald-500/15 text-emerald-400" : status.state === "starting" ? "bg-accent/15 text-accent" : "bg-canvas text-ink-subtle"
            }`}>
              <Zap size={20} className={status.state === "starting" ? "animate-pulse" : ""} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-[15.5px] font-bold text-ink">{t("Local Suwayomi Engine")}</h4>
                {status.state === "online" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> {t("Online (4567)")}
                  </span>
                ) : status.state === "starting" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold text-accent border border-accent/20">
                    <Loader2 size={11} className="animate-spin" /> {t("Starting...")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-0.5 text-[11px] font-bold text-ink-subtle border border-edge-soft">
                    {t("Optional Local Server")}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-ink-muted">
                {t("Zero-friction background daemon. Starts automatically with Argus so manga is ready instantly.")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowInput((v) => !v)}
              title={t("Type path manually")}
              className={`grid h-9 w-9 place-items-center rounded-lg ring-1 ring-edge-soft transition-all ${
                showInput ? "bg-accent/15 text-accent" : "bg-raised text-ink-subtle hover:text-ink"
              }`}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={handleLocateFolder}
              title={t("Locate Suwayomi folder manually")}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-raised px-2.5 text-xs font-semibold text-ink-subtle hover:text-ink ring-1 ring-edge-soft transition-all"
            >
              <FolderOpen size={14} />
              <span className="hidden sm:inline">{t("Locate Folder")}</span>
            </button>
            <button
              type="button"
              onClick={() => probe()}
              title={t("Refresh status")}
              className="grid h-9 w-9 place-items-center rounded-lg bg-raised text-ink-subtle hover:text-ink ring-1 ring-edge-soft transition-all"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              disabled={busy || status.state === "starting"}
              onClick={handleToggleStart}
              className={`flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-bold transition-all shadow-sm ${
                status.state === "online"
                  ? "bg-raised text-ink hover:text-danger border border-edge-soft"
                  : "bg-accent text-canvas hover:opacity-90 active:scale-95"
              }`}
            >
              {busy || status.state === "starting" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : status.state === "online" ? (
                <Power size={13} />
              ) : (
                <Play size={13} fill="currentColor" />
              )}
              {status.state === "online" ? t("Stop Server") : t("Start Server")}
            </button>
          </div>
        </div>

        {showInput && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="/Applications/Suwayomi-Server..."
              className="flex-1 h-9 rounded-lg border border-edge-soft bg-canvas px-3 text-xs text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveCustomPath}
              className="h-9 rounded-lg bg-accent px-3.5 text-xs font-bold text-canvas hover:opacity-90 active:scale-95"
            >
              {t("Save & Start")}
            </button>
          </div>
        )}

        {status.lastError && (
          <p className="rounded-lg bg-danger/10 border border-danger/20 p-2.5 text-xs text-danger font-medium">
            {status.lastError}
          </p>
        )}

        {status.state !== "online" && (
          <div className="flex items-center justify-between rounded-lg bg-raised/70 px-3.5 py-2.5 text-xs text-ink-muted ring-1 ring-edge-soft">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-accent" />
              {t("No server required! Use Universal In-App Extensions below for zero-server reading.")}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-edge-soft pt-3">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={status.autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="h-4 w-4 rounded border-edge text-accent focus:ring-accent"
            />
            <span className="text-xs font-semibold text-ink">
              {t("Auto-start Suwayomi daemon when Argus launches")}
            </span>
          </label>
          <span className="text-[11px] text-ink-subtle font-mono">127.0.0.1:4567</span>
        </div>
      </div>
    </div>
  );
}

function AddServerCard() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className={`transition-all ${open ? "ring-edge" : "hover:ring-edge"} ${CARD}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-start active:scale-[0.99] motion-reduce:active:scale-100"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-canvas text-ink-muted ring-1 ring-edge-soft">
          <Server size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[16px] font-semibold text-ink">{t("Connect a Suwayomi server")}</span>
          <span className="truncate text-[13px] text-ink-muted">
            {t("Point Argus at your self-hosted library to browse and install sources")}
          </span>
        </span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-raised text-ink-muted ring-1 ring-edge-soft">
          <Plus size={18} strokeWidth={2.4} className={`transition-transform ${open ? "rotate-45" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="argus-rise border-t border-edge-soft p-5">
          <ServerForm onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

export function ServersSection() {
  const t = useT();
  const { servers, active } = useServers();
  return (
    <div className="flex flex-col gap-3">
      <LocalDaemonSupervisorCard />

      <p className="mt-2 px-1 text-[12.5px] font-bold uppercase tracking-[0.12em] text-ink-subtle">
        {t("Configured Servers")}
      </p>
      {servers.map((s) => (
        <ServerRow key={s.id} server={s} active={active?.id === s.id} />
      ))}
      <AddServerCard />
    </div>
  );
}
