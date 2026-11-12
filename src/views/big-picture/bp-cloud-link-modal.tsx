import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { Check, Cloud, Loader2, LogIn, QrCode, Smartphone, Sparkles, X } from "lucide-react";
import { QR_DARK, QR_LIGHT } from "@/lib/tv-handoff/handoff-qr";
import { SFX } from "@/lib/sfx";
import { useBpT } from "./bp-i18n";
import { pushBpBack } from "./bp-back";
import {
  startDeviceCodeSession,
  pollDeviceCodeSession,
  signInWithEmailPassword,
} from "@/lib/nuvio/nuvio-auth";
import { useAuth } from "@/lib/auth";
import { syncAllCloudData } from "@/lib/cloud-sync/unified-cloud-sync";

type TabKind = "qr" | "email" | "stremio";

export function BpCloudLinkModal({ onClose }: { onClose: () => void }) {
  const t = useBpT();
  const { signIn: stremioSignIn } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKind>("qr");

  // Device Link QR state
  const [userCode, setUserCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [approved, setApproved] = useState(false);

  // Email form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Stremio form state
  const [stremioEmail, setStremioEmail] = useState("");
  const [stremioPassword, setStremioPassword] = useState("");
  const [stremioBusy, setStremioBusy] = useState(false);
  const [stremioError, setStremioError] = useState<string | null>(null);

  const pollingRef = useRef<boolean>(true);

  // Hardware Back / Remote Escape handling
  useEffect(() => {
    return pushBpBack(() => {
      onClose();
      return true;
    });
  }, [onClose]);

  // Start Device Code Session for TV QR linking
  useEffect(() => {
    pollingRef.current = true;
    let pollTimer: number | null = null;

    async function initSession() {
      try {
        setQrLoading(true);
        const sessionData = await startDeviceCodeSession();
        setUserCode(sessionData.user_code);

        // Generate high-resolution QR
        const qrUrl = sessionData.verification_uri_complete || `https://nuvio.tv/link?code=${sessionData.user_code}`;
        const dataUrl = await QRCode.toDataURL(qrUrl, {
          margin: 1,
          width: 480,
          errorCorrectionLevel: "M",
          color: { dark: QR_DARK, light: QR_LIGHT },
        });
        setQrDataUrl(dataUrl);
        setQrLoading(false);

        // Start polling loop
        const intervalMs = Math.max(2, sessionData.interval || 3) * 1000;
        const checkApproval = async () => {
          if (!pollingRef.current) return;
          try {
            const approvedSession = await pollDeviceCodeSession(
              sessionData.device_code,
              sessionData.nonce,
            );
            if (approvedSession) {
              pollingRef.current = false;
              setApproved(true);
              SFX.open();
              void syncAllCloudData();
              setTimeout(() => {
                onClose();
              }, 1800);
              return;
            }
          } catch {
            /* ignore polling network slips */
          }
          if (pollingRef.current) {
            pollTimer = window.setTimeout(checkApproval, intervalMs);
          }
        };

        pollTimer = window.setTimeout(checkApproval, intervalMs);
      } catch (err) {
        console.warn("[bp-cloud-link] init session failed", err);
        setQrLoading(false);
      }
    }

    void initSession();

    return () => {
      pollingRef.current = false;
      if (pollTimer) window.clearTimeout(pollTimer);
    };
  }, [onClose]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || emailBusy) return;
    setEmailBusy(true);
    setEmailError(null);
    try {
      const res = await signInWithEmailPassword(email.trim(), password, true);
      if (res.ok) {
        setApproved(true);
        SFX.open();
        void syncAllCloudData();
        setTimeout(() => onClose(), 1200);
      } else {
        setEmailError(res.error || t("Sign in failed"));
      }
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : t("Sign in failed"));
    } finally {
      setEmailBusy(false);
    }
  };

  const handleStremioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stremioEmail.trim() || !stremioPassword || stremioBusy) return;
    setStremioBusy(true);
    setStremioError(null);
    try {
      await stremioSignIn(stremioEmail.trim(), stremioPassword, true);
      setApproved(true);
      SFX.open();
      void syncAllCloudData();
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setStremioError(err instanceof Error ? err.message : t("Sign in failed"));
    } finally {
      setStremioBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9950] flex items-center justify-center bg-black/85 backdrop-blur-md p-6 select-none animate-in fade-in duration-200 motion-reduce:animate-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-zinc-950 border border-white/15 rounded-3xl p-8 shadow-[0_25px_80px_rgba(0,0,0,0.8)] flex flex-col gap-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
              <Cloud size={24} />
            </span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {t("Connect Cloud Account & Sync")}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t("Log in once to access your Continue Watching, Library, and Addons on any device.")}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-bp-focusable
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Banner */}
        {approved ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <span className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/40 animate-pulse motion-reduce:animate-none">
              <Check size={36} strokeWidth={3} />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-white">{t("Account Connected Successfully!")}</h3>
              <p className="text-sm text-zinc-400">
                {t("Syncing all your profiles, continue watching, and streaming addons...")}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Picker */}
            <div data-bp-row className="flex items-center gap-2 p-1 rounded-2xl bg-zinc-900 border border-white/10">
              <button
                type="button"
                data-bp-focusable
                onClick={() => {
                  SFX.click();
                  setActiveTab("qr");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "qr"
                    ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <QrCode size={16} />
                <span>{t("Fast QR / Code Link")}</span>
              </button>

              <button
                type="button"
                data-bp-focusable
                onClick={() => {
                  SFX.click();
                  setActiveTab("email");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "email"
                    ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <LogIn size={16} />
                <span>{t("Nuvio Email Login")}</span>
              </button>

              <button
                type="button"
                data-bp-focusable
                onClick={() => {
                  SFX.click();
                  setActiveTab("stremio");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "stremio"
                    ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Cloud size={16} />
                <span>{t("Stremio Login")}</span>
              </button>
            </div>

            {/* TAB 1: Fast QR / Device Code Link */}
            {activeTab === "qr" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-2">
                <div className="flex flex-col items-center justify-center bg-zinc-900/90 rounded-2xl p-6 border border-white/10 shadow-inner">
                  {qrLoading ? (
                    <div className="h-[220px] w-[220px] flex flex-col items-center justify-center gap-3">
                      <Loader2 size={32} className="animate-spin motion-reduce:animate-none text-cyan-400" />
                      <span className="text-xs text-zinc-400">{t("Generating link code...")}</span>
                    </div>
                  ) : qrDataUrl ? (
                    <div className="relative p-3 bg-white rounded-2xl shadow-xl">
                      <img
                        src={qrDataUrl}
                        alt="QR Code"
                        className="w-[200px] h-[200px] object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-danger">{t("Failed to load QR code")}</span>
                  )}
                  <span className="text-[11px] text-zinc-400 mt-3 flex items-center gap-1">
                    <Smartphone size={13} className="text-cyan-400" />
                    {t("Scan with your phone's camera")}
                  </span>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Sparkles size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {t("Zero Remote Typing Required")}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-zinc-400">{t("Or visit on phone / PC:")}</span>
                    <span className="text-lg font-mono font-semibold text-white tracking-wide">
                      nuvio.tv/link
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-zinc-400">{t("And enter this 6-character code:")}</span>
                    <div className="px-5 py-3 rounded-2xl bg-zinc-900 border border-cyan-400/40 text-cyan-300 font-mono text-3xl font-extrabold tracking-widest text-center shadow-lg">
                      {userCode || "••••••"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Loader2 size={13} className="animate-spin motion-reduce:animate-none text-cyan-400 shrink-0" />
                    <span>{t("Waiting for authorization on your device...")}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Nuvio Email Login */}
            {activeTab === "email" && (
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4 py-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-300">{t("Email")}</label>
                  <input
                    type="email"
                    data-bp-focusable
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-300">{t("Password")}</label>
                  <input
                    type="password"
                    data-bp-focusable
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {emailError && (
                  <p className="text-xs text-danger bg-danger/10 px-3.5 py-2 rounded-xl">{emailError}</p>
                )}

                <button
                  type="submit"
                  data-bp-focusable
                  disabled={emailBusy || !email || !password}
                  className="mt-2 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-40 transition-all"
                >
                  {emailBusy ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> : <LogIn size={16} />}
                  <span>{emailBusy ? t("Signing in...") : t("Sign In with Nuvio")}</span>
                </button>
              </form>
            )}

            {/* TAB 3: Stremio Login */}
            {activeTab === "stremio" && (
              <form onSubmit={handleStremioSubmit} className="flex flex-col gap-4 py-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-300">{t("Stremio Email")}</label>
                  <input
                    type="email"
                    data-bp-focusable
                    value={stremioEmail}
                    onChange={(e) => setStremioEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-300">{t("Password")}</label>
                  <input
                    type="password"
                    data-bp-focusable
                    value={stremioPassword}
                    onChange={(e) => setStremioPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {stremioError && (
                  <p className="text-xs text-danger bg-danger/10 px-3.5 py-2 rounded-xl">{stremioError}</p>
                )}

                <button
                  type="submit"
                  data-bp-focusable
                  disabled={stremioBusy || !stremioEmail || !stremioPassword}
                  className="mt-2 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-40 transition-all"
                >
                  {stremioBusy ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" /> : <LogIn size={16} />}
                  <span>{stremioBusy ? t("Signing in...") : t("Sign In with Stremio")}</span>
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
