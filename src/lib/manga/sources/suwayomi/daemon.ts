import { useEffect, useState } from "react";
import { addServer, listServers, setActiveServer } from "./servers-store";
import { testConnection } from "./api";

const AUTOSTART_KEY = "argus.manga.suwayomi.autostart.v1";
const DEFAULT_URL = "http://127.0.0.1:4567";

export type DaemonState = "offline" | "starting" | "online" | "not_installed";

export interface DaemonStatus {
  state: DaemonState;
  baseUrl: string;
  isInstalled: boolean;
  installedPath?: string;
  autoStart: boolean;
  lastError?: string;
}

const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

let currentStatus: DaemonStatus = {
  state: "offline",
  baseUrl: DEFAULT_URL,
  isInstalled: true,
  autoStart: getAutoStartSetting(),
};

function getAutoStartSetting(): boolean {
  try {
    const v = localStorage.getItem(AUTOSTART_KEY);
    return v === null ? true : v === "true"; // Default: true for frictionless UX
  } catch {
    return true;
  }
}

export function setAutoStartSetting(enabled: boolean): void {
  try {
    localStorage.setItem(AUTOSTART_KEY, String(enabled));
    currentStatus.autoStart = enabled;
    notify();
  } catch {
    /* noop */
  }
}

export function subscribeSuwayomiDaemon(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getSuwayomiDaemonStatus(): DaemonStatus {
  return currentStatus;
}

/** Check whether local Suwayomi server is responding on http://127.0.0.1:4567 */
export async function probeLocalSuwayomi(): Promise<boolean> {
  try {
    const res = await testConnection({ baseUrl: DEFAULT_URL });
    if (res.ok) {
      currentStatus.state = "online";
      currentStatus.isInstalled = true;
      // Auto-register and activate in servers-store if missing
      const existing = listServers().find((s) => s.baseUrl.includes("127.0.0.1:4567") || s.baseUrl.includes("localhost:4567"));
      if (!existing) {
        addServer("Local Suwayomi", DEFAULT_URL);
      } else {
        setActiveServer(existing.id);
      }
      notify();
      return true;
    }
  } catch {
    /* offline */
  }
  if (currentStatus.state !== "starting") {
    currentStatus.state = "offline";
    notify();
  }
  return false;
}

/** Launch Suwayomi daemon in background and poll until port 4567 responds */
export async function startSuwayomiDaemon(): Promise<boolean> {
  currentStatus.state = "starting";
  currentStatus.lastError = undefined;
  notify();

  try {
    // Attempt native Tauri invocation if running in desktop app
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("suwayomi_daemon_start").catch((e: unknown) => {
        console.warn("[suwayomi-daemon] native start error:", e);
      });
    }
  } catch (err) {
    console.warn("[suwayomi-daemon] could not invoke native start:", err);
  }

  // Poll for up to 20 seconds (Suwayomi/Java takes ~3 to 8s to boot)
  for (let attempt = 1; attempt <= 12; attempt++) {
    await new Promise((r) => setTimeout(r, 1500));
    const online = await probeLocalSuwayomi();
    if (online) {
      return true;
    }
  }

  currentStatus.state = "offline";
  currentStatus.lastError = "Server start timed out. Make sure Suwayomi-Server or Tachidesk is installed.";
  notify();
  return false;
}

/** Stop local Suwayomi daemon */
export async function stopSuwayomiDaemon(): Promise<boolean> {
  try {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("suwayomi_daemon_stop");
    }
  } catch {
    /* fallback to HTTP stop */
    try {
      await fetch(`${DEFAULT_URL}/api/v1/settings/server/stop`, { method: "POST" });
    } catch {
      /* ignore */
    }
  }
  currentStatus.state = "offline";
  notify();
  return true;
}

/** Checks and auto-launches Suwayomi if auto-start is enabled and server is offline */
export async function ensureSuwayomiFrictionless(): Promise<void> {
  const isOnline = await probeLocalSuwayomi();
  if (isOnline) return;

  if (getAutoStartSetting()) {
    console.log("[suwayomi] Server offline, auto-starting background daemon...");
    void startSuwayomiDaemon();
  }
}

/** React hook for Suwayomi background daemon supervisor */
export function useSuwayomiDaemon(): {
  status: DaemonStatus;
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  setAutoStart: (enabled: boolean) => void;
  probe: () => Promise<boolean>;
} {
  const [status, setStatus] = useState<DaemonStatus>(getSuwayomiDaemonStatus());

  useEffect(() => {
    return subscribeSuwayomiDaemon(() => setStatus({ ...getSuwayomiDaemonStatus() }));
  }, []);

  return {
    status,
    start: startSuwayomiDaemon,
    stop: stopSuwayomiDaemon,
    setAutoStart: setAutoStartSetting,
    probe: probeLocalSuwayomi,
  };
}
