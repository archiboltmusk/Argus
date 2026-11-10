import {
  Check,
  ChevronRight,
  Cloud,
  FileText,
  HelpCircle,
  LogIn,
  LogOut,
  MonitorSmartphone,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useProfiles } from "@/lib/profiles";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { useCloudSync } from "@/lib/cloud-sync/unified-cloud-sync";
import { NuvioAuthModal } from "@/components/nuvio-auth-modal";
import { AuthModal } from "@/components/auth-modal";
import { MobileWhosWatching } from "./mobile-whos-watching";
import { useMobileRemote } from "./mobile-remote";
import { setMobileRemoteStyle, useMobileRemoteStyle, type MobileRemoteStyle } from "./remote-style";
import { ARGUS_BUGS_BASE } from "@/lib/config/endpoints";
import { openUrl } from "@/lib/window";

export function MobileProfile({ onOpenRemote }: { onOpenRemote: () => void }) {
  const t = useT();
  const { user, signOut: signOutStremio } = useAuth();
  const { activeProfile } = useProfiles();
  const { settings, update } = useSettings();
  const { snapshot } = useMobileRemote();
  const {
    isConnected,
    provider,
    userEmail,
    lastSyncedAt,
    isSyncing,
    syncNow,
    signOutCloud,
  } = useCloudSync();

  const remote = snapshot.profile;
  const name =
    remote?.name ||
    activeProfile?.name ||
    userEmail?.split("@")[0] ||
    user?.email?.split("@")[0] ||
    t("Guest");
  const avatar = remote?.avatar ?? activeProfile?.avatar ?? null;
  const color = remote?.color ?? activeProfile?.color ?? "oklch(0.78 0.13 60)";

  const [switching, setSwitching] = useState(false);
  const [showNuvioAuth, setShowNuvioAuth] = useState(false);
  const [showStremioAuth, setShowStremioAuth] = useState(false);
  const [rdKeyInput, setRdKeyInput] = useState(settings.rdKey || "");
  const [rdSaved, setRdSaved] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSyncClick = async () => {
    setSyncFeedback(null);
    const res = await syncNow();
    if (res.ok) {
      setSyncFeedback(t("Synced!"));
      setTimeout(() => setSyncFeedback(null), 3000);
    } else {
      setSyncFeedback(t("Sync failed"));
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  const handleSignOut = async () => {
    if (provider === "nuvio") {
      await signOutCloud();
    }
    if (user) {
      signOutStremio();
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 px-5 pt-4 pb-12 overflow-y-auto">
      <header className="flex items-center justify-center">
        <h1 className="font-display text-[22px] font-medium text-ink">{t("Profile & Accounts")}</h1>
      </header>

      {/* Profile Header Card */}
      <button
        type="button"
        onClick={() => setSwitching(true)}
        className="flex flex-col items-center gap-3 transition-transform active:scale-[0.98]"
      >
        <span
          className="flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-full text-[30px] font-bold text-white shadow-[0_10px_28px_-10px_rgba(0,0,0,0.6)] ring-2 ring-edge-soft"
          style={{ background: avatar ? undefined : color }}
        >
          {avatar ? (
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            name.slice(0, 1).toUpperCase()
          )}
        </span>
        <span className="text-[18px] font-semibold text-ink">{name}</span>
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-accent">
          <Users size={14} strokeWidth={2.4} />
          {t("Switch profile")}
        </span>
      </button>

      {/* SECTION: Cloud Account & Data Portability Sync */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-ink-subtle flex items-center gap-1.5">
            <Cloud size={14} className="text-cyan-400" />
            <span>{t("Cloud Account & Sync")}</span>
          </h2>
          {isConnected && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {provider === "nuvio" ? "Nuvio Cloud" : "Stremio Cloud"}
            </span>
          )}
        </div>

        {isConnected ? (
          <div className="rounded-2xl border border-edge-soft/80 bg-elevated/50 p-4 flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-ink truncate max-w-[220px]">
                  {userEmail}
                </span>
                <span className="text-[11px] text-ink-subtle">
                  {lastSyncedAt
                    ? t("Last synced {time}", {
                        time: new Date(lastSyncedAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        }),
                      })
                    : t("Cloud Sync Active")}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSyncClick}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-semibold hover:bg-cyan-500/30 active:scale-95 transition-all"
              >
                <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
                <span>{isSyncing ? t("Syncing...") : syncFeedback || t("Sync Now")}</span>
              </button>
            </div>
            <div className="h-px bg-edge-soft/60" />
            <div className="flex items-center justify-between text-[11px] text-ink-subtle">
              <span>{t("Watch progress, library & addons stay in sync everywhere")}</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-danger hover:underline font-medium ml-2"
              >
                {t("Sign out")}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-elevated/40 to-surface p-4 flex flex-col gap-3.5 shadow-lg">
            <div className="flex items-start gap-2.5">
              <Sparkles size={18} className="text-cyan-400 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <h3 className="text-[14px] font-semibold text-ink">
                  {t("Sync Across All Your Devices")}
                </h3>
                <p className="text-[12px] text-ink-subtle leading-relaxed mt-0.5">
                  {t(
                    "Sign in with your account so your Continue Watching, Library, and Addons follow you seamlessly between this iPhone, your Android Projector, and Mac.",
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNuvioAuth(true)}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all active:scale-95 shadow-md shadow-cyan-500/20"
              >
                <LogIn size={14} />
                <span>{t("Nuvio Sign In")}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowStremioAuth(true)}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-surface/80 border border-edge-soft/80 hover:bg-elevated text-ink text-xs font-semibold transition-all active:scale-95"
              >
                <LogIn size={14} />
                <span>{t("Stremio Sign In")}</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* SECTION: Remote Style */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-[12px] font-bold uppercase tracking-[0.16em] text-ink-subtle">
          {t("Remote style")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StylePreview kind="dpad" label={t("D-pad")} />
          <StylePreview kind="minimal" label={t("Touchpad")} />
        </div>
      </section>

      {/* SECTION: Media Player on iOS */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-[12px] font-bold uppercase tracking-[0.16em] text-ink-subtle">
          {t("Media Player on iOS")}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "ask", label: "Ask Every Time" },
            { id: "outplayer", label: "Outplayer" },
            { id: "infuse", label: "Infuse" },
            { id: "vlc", label: "VLC" },
            { id: "vidhub", label: "VidHub" },
            { id: "in-app", label: "In-App" },
          ].map((opt) => {
            const active = (settings.iosExternalPlayer || "ask") === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => update({ iosExternalPlayer: opt.id as any })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                  active
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                    : "bg-surface/50 border-edge-soft/70 text-ink-muted hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* SECTION: Debrid & Streaming Accounts */}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-[12px] font-bold uppercase tracking-[0.16em] text-ink-subtle flex items-center justify-between">
          <span>{t("Debrid & Streaming Accounts")}</span>
          <span className="text-[10px] text-cyan-400 font-normal">Real-Debrid / TorBox</span>
        </h2>
        <div className="rounded-2xl border border-edge-soft/70 bg-elevated/40 p-3.5 flex flex-col gap-2.5">
          <label className="text-xs font-medium text-ink-muted">
            Real-Debrid API Key:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="password"
              placeholder="Paste Real-Debrid API key here"
              value={rdKeyInput}
              onChange={(e) => {
                setRdKeyInput(e.target.value);
                setRdSaved(false);
              }}
              className="flex-1 px-3 py-2 rounded-xl bg-surface border border-edge-soft/70 text-ink text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
            <button
              type="button"
              onClick={() => {
                update({ rdKey: rdKeyInput.trim() });
                setRdSaved(true);
                setTimeout(() => setRdSaved(false), 2500);
              }}
              className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shrink-0 active:scale-95"
            >
              {rdSaved ? "Saved!" : "Save"}
            </button>
          </div>
          <p className="text-[11px] text-ink-subtle">
            Enables instant 4K &amp; 1080p cached streams for all movies and shows on your iPhone.
          </p>
        </div>
      </section>

      {/* Utility Actions */}
      <section className="overflow-hidden rounded-2xl border border-edge-soft/70 bg-elevated/40">
        <Row
          icon={<MonitorSmartphone size={20} strokeWidth={2} />}
          label={t("Remote")}
          onClick={onOpenRemote}
        />
        <Divider />
        <Row
          icon={<HelpCircle size={20} strokeWidth={2} />}
          label={t("Help & feedback")}
          href={ARGUS_BUGS_BASE}
        />
        <Divider />
        <Row icon={<FileText size={20} strokeWidth={2} />} label={t("Legal")} onClick={() => {}} />
        {(isConnected || user) && (
          <>
            <Divider />
            <Row
              icon={<LogOut size={20} strokeWidth={2} />}
              label={t("Sign out")}
              danger
              onClick={handleSignOut}
            />
          </>
        )}
      </section>

      {switching && <MobileWhosWatching onClose={() => setSwitching(false)} />}
      {showNuvioAuth && (
        <NuvioAuthModal
          onClose={() => setShowNuvioAuth(false)}
          onSuccess={() => void syncNow()}
        />
      )}
      {showStremioAuth && <AuthModal onClose={() => setShowStremioAuth(false)} />}
    </div>
  );
}

function StylePreview({ kind, label }: { kind: MobileRemoteStyle; label: string }) {
  const active = useMobileRemoteStyle() === kind;
  return (
    <button
      type="button"
      onClick={() => setMobileRemoteStyle(kind)}
      className={`relative flex flex-col items-center gap-3 rounded-2xl border bg-surface/50 p-4 transition-colors ${
        active ? "border-accent ring-1 ring-accent" : "border-edge-soft/70"
      }`}
    >
      {active && (
        <span className="absolute end-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-canvas">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
      <span className="flex h-[104px] w-full items-center justify-center rounded-xl bg-canvas/60">
        {kind === "dpad" ? <DpadGlyph /> : <TouchpadGlyph />}
      </span>
      <span className={`text-[13.5px] font-semibold ${active ? "text-ink" : "text-ink-muted"}`}>
        {label}
      </span>
    </button>
  );
}

function DpadGlyph() {
  return (
    <span className="relative grid h-[74px] w-[74px] place-items-center rounded-full bg-elevated/70 ring-1 ring-edge-soft/70">
      <span className="absolute top-1.5 h-0 w-0 border-x-[5px] border-b-[7px] border-x-transparent border-b-ink-muted" />
      <span className="absolute bottom-1.5 h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-ink-muted" />
      <span className="absolute start-1.5 h-0 w-0 border-y-[5px] border-e-[7px] border-y-transparent border-e-ink-muted" />
      <span className="absolute end-1.5 h-0 w-0 border-y-[5px] border-s-[7px] border-y-transparent border-s-ink-muted" />
      <span className="h-7 w-7 rounded-full bg-raised" />
    </span>
  );
}

function TouchpadGlyph() {
  return (
    <span className="relative flex h-[62px] w-[74px] items-center justify-center rounded-2xl bg-elevated/70 ring-1 ring-edge-soft/70">
      <span className="h-2 w-2 rounded-full bg-ink-muted" />
      <span className="absolute h-[3px] w-8 -rotate-[18deg] rounded-full bg-ink-subtle/50" />
    </span>
  );
}

function Row({
  icon,
  label,
  onClick,
  href,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const skin =
    "flex w-full items-center gap-3.5 px-4 py-3.5 text-start transition-colors active:bg-raised/60";
  const inner = (
    <>
      <span className={danger ? "text-danger" : "text-ink-muted"}>{icon}</span>
      <span className={`flex-1 text-[15px] font-medium ${danger ? "text-danger" : "text-ink"}`}>
        {label}
      </span>
      {!danger && <ChevronRight size={18} strokeWidth={2.2} className="text-ink-subtle" />}
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          if (!("__TAURI_INTERNALS__" in window)) return;
          e.preventDefault();
          openUrl(href);
        }}
        className={skin}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={skin}>
      {inner}
    </button>
  );
}

function Divider() {
  return <span className="mx-4 block h-px bg-edge-soft/60" />;
}
