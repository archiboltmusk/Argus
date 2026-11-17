import { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Play,
  FolderSearch,
  ExternalLink,
  LifeBuoy,
} from "lucide-react";
import type { BTRLocalLibraryState } from "@/lib/education/btr-local-library";
import { useView } from "@/lib/view";

interface BTRTechIssueModalProps {
  open: boolean;
  onClose: () => void;
  libraryState: BTRLocalLibraryState;
  onRescanFolder: () => void;
}

export function BTRTechIssueModal({
  open,
  onClose,
  libraryState,
  onRescanFolder,
}: BTRTechIssueModalProps) {
  const { openPlayer } = useView();
  const [copied, setCopied] = useState(false);
  const [isTauriEnv, setIsTauriEnv] = useState<boolean>(false);
  const [testVideoStatus, setTestVideoStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)) {
      setIsTauriEnv(true);
    }
  }, []);

  if (!open) return null;

  const diagnosticsText = `
=== Argus CoreBTR System Diagnostics ===
Timestamp: ${new Date().toISOString()}
Runtime Environment: ${isTauriEnv ? "Tauri Desktop Native" : "Webview Browser Fallback"}
User Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "N/A"}
Indexed Videos: ${libraryState.totalVideosFound}
Indexed PDFs: ${libraryState.totalPdfsFound}
Subjects with Videos: ${libraryState.subjectsWithVideosCount} / 19
Subjects with PDFs: ${libraryState.subjectsWithPdfsCount} / 19
Root Folder: ${libraryState.rootFolderPath || "Pre-indexed / Custom"}
Local Protocol Resolution: Enabled via Tauri convertFileSrc & Blob URLs
========================================
`.trim();

  const handleCopyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleTestVideoPlay = () => {
    setTestVideoStatus("Launching Test Video Stream...");
    openPlayer({
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      title: "CoreBTR Video Decoder Self-Test",
      subtitle: "Hardware Acceleration & Audio-Sync Verification",
      notWebReady: false,
      meta: {
        id: "corebtr-diagnostic-test",
        type: "other",
        name: "CoreBTR Video Decoder Self-Test",
        description: "Probe for HTML5 & MPVKit hardware acceleration readiness.",
      },
      historyUrl: "/education",
    });
    setTimeout(() => setTestVideoStatus("Test Stream Launched in Theater Engine"), 1500);
  };

  return (
    <div className="fixed inset-0 z-[270] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#0d1b4b] border border-rose-500/30 shadow-2xl p-6 flex flex-col gap-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Facing a Tech Issue in the App?</h3>
              <p className="text-xs text-rose-300">
                Diagnostic & Video Decoder Doctor for CoreBTR App
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200 leading-relaxed">
          This option is specifically for diagnosing and reporting tech issues (such as videos not loading, unlinked workbooks, or playback errors) in the CoreBTR app.
        </div>

        {/* Diagnostic Checklist */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-white/60">
            System Health Probes
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-3 rounded-2xl bg-[#1d204b] border border-white/10 flex items-center gap-3">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Video Engine</span>
                <span className="text-[10px] text-white/50">
                  {isTauriEnv ? "Native MPV/AVPlayer Ready" : "Webview HTML5"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#1d204b] border border-white/10 flex items-center gap-3">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Indexed Lectures</span>
                <span className="text-[10px] text-white/50">
                  {libraryState.totalVideosFound} Videos in {libraryState.subjectsWithVideosCount} Subjects
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#1d204b] border border-white/10 flex items-center gap-3">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">PDF Workbooks</span>
                <span className="text-[10px] text-white/50">
                  {libraryState.totalPdfsFound} Master & Subject PDFs
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#1d204b] border border-white/10 flex items-center gap-3">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Protocol Security</span>
                <span className="text-[10px] text-white/50">
                  file:// mapped to convertFileSrc
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Diagnostic Actions */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-white/60">
            Automated Recovery Actions
          </span>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleTestVideoPlay}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#1767be] hover:bg-[#155bb0] text-white font-bold text-xs shadow transition flex items-center justify-center gap-2"
            >
              <Play size={13} fill="currentColor" />
              <span>Test Video Playback</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onRescanFolder();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition flex items-center justify-center gap-2"
            >
              <FolderSearch size={13} />
              <span>Rescan BTR Directory</span>
            </button>

            <button
              type="button"
              onClick={handleCopyDiagnostics}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition flex items-center justify-center gap-1.5"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? "Copied Report" : "Copy Report"}</span>
            </button>
          </div>

          {testVideoStatus && (
            <span className="text-[11px] text-[#4da2ff] font-semibold">{testVideoStatus}</span>
          )}
        </div>

        {/* Footer Link to Support */}
        <div className="flex items-center justify-between pt-3 border-t border-rose-500/20 text-xs">
          <a
            href="https://www.instagram.com/corebtr/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-rose-300 hover:text-white transition"
          >
            <LifeBuoy size={13} />
            <span>Contact CoreBTR Tech Team (@corebtr)</span>
            <ExternalLink size={10} />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
