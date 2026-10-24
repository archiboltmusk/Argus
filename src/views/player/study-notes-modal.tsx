import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { GraduationCap, Copy, Check, X, Camera, Eye, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import { saveStudyNote } from "@/lib/education/notes";
import { getPlaybackPosition } from "@/lib/player/playback-clock";
import type { OcclusionBox } from "@/lib/education/types";
import { ImageOcclusionCanvas } from "./image-occlusion-canvas";

export type StudyNotesModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  sourceId: string;
  onResumePlayback?: () => void;
};

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function StudyNotesModal({
  open,
  onClose,
  title,
  sourceId,
  onResumePlayback,
}: StudyNotesModalProps) {
  const t = useT();
  const [timestamp, setTimestamp] = useState(0);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [fetchingSnapshot, setFetchingSnapshot] = useState(false);
  const [occlusions, setOcclusions] = useState<OcclusionBox[]>([]);
  const [isOcclusionMode, setIsOcclusionMode] = useState(false);
  const [highYield, setHighYield] = useState(false);

  useEffect(() => {
    if (!open) {
      setSnapshot(null);
      setText("");
      setCopied(false);
      setOcclusions([]);
      setIsOcclusionMode(false);
      setHighYield(false);
      return;
    }

    const pos = getPlaybackPosition();
    setTimestamp(pos);

    // Try grabbing frame
    setFetchingSnapshot(true);
    invoke<string>("mpv_screenshot_data_url")
      .then((dataUrl) => {
        setSnapshot(dataUrl);
      })
      .catch(() => {
        // Fallback: no frame grab available (e.g. non-desktop or pure HTML5)
        setSnapshot(null);
      })
      .finally(() => {
        setFetchingSnapshot(false);
      });
  }, [open]);

  const handleSave = useCallback(() => {
    if (!text.trim() && occlusions.length === 0) return;
    saveStudyNote({
      itemId: sourceId || title,
      itemTitle: title || "Lecture",
      timestampSec: timestamp,
      timestampLabel: formatTime(timestamp),
      markdown: text.trim() || (occlusions.length > 0 ? "Image Occlusion Diagram Card" : ""),
      snapshotDataUrl: snapshot ?? undefined,
      occlusions: occlusions.length > 0 ? occlusions : undefined,
      highYield,
    });
    onClose();
    onResumePlayback?.();
  }, [text, occlusions, highYield, sourceId, title, timestamp, snapshot, onClose, onResumePlayback]);

  const handleCopyObsidian = useCallback(() => {
    const label = formatTime(timestamp);
    const md = `### [${label}] ${title}\n${snapshot ? `![](${snapshot})\n\n` : ""}${
      occlusions.length > 0 ? `> 🧠 Contains ${occlusions.length} Image Occlusion regions.\n\n` : ""
    }${text.trim()}\n`;
    void navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [timestamp, title, snapshot, occlusions, text]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, handleSave]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[620px] rounded-2xl bg-surface p-6 shadow-2xl border border-edge flex flex-col gap-4 text-ink">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-edge/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <GraduationCap size={18} strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-ink leading-tight">{t("Study Mode Note")}</h3>
              <p className="text-[12px] text-ink-muted truncate max-w-[360px]">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHighYield(!highYield)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                highYield
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                  : "bg-raised text-ink-subtle hover:text-ink"
              }`}
              title="Tag as Volatile / High-Yield repeat question"
            >
              <Zap size={12} className={highYield ? "fill-amber-500 text-amber-500" : ""} />
              <span>{highYield ? "High-Yield" : "Flag High-Yield"}</span>
            </button>
            <span className="rounded-md bg-raised px-2.5 py-1 text-[12px] font-mono font-medium text-accent">
              {formatTime(timestamp)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink-subtle hover:bg-raised hover:text-ink transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Frame Snapshot preview / Image Occlusion Editor */}
        {snapshot ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink-subtle">
                <Camera size={13} />
                <span>{t("Captured frame")}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOcclusionMode(!isOcclusionMode)}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition ${
                  isOcclusionMode
                    ? "bg-accent text-white"
                    : "bg-raised text-accent hover:bg-accent/10"
                }`}
              >
                <Eye size={12} />
                <span>{isOcclusionMode ? "Finish Masking" : "Mask Labels (Image Occlusion)"}</span>
              </button>
            </div>

            {isOcclusionMode ? (
              <ImageOcclusionCanvas
                imageUrl={snapshot}
                boxes={occlusions}
                onChange={setOcclusions}
                interactive={false}
              />
            ) : (
              <div
                onClick={() => setIsOcclusionMode(true)}
                className="relative rounded-xl overflow-hidden border border-edge/60 max-h-[160px] bg-black/40 flex items-center justify-center group cursor-pointer"
                title="Click to add Image Occlusion masks"
              >
                <img src={snapshot} alt="Frame snapshot" className="w-full h-full object-cover" />
                {occlusions.length > 0 && (
                  <div className="absolute top-2 start-2 flex items-center gap-1 rounded-md bg-sky-500/90 px-2 py-0.5 text-[11px] text-white font-medium shadow">
                    <span>{occlusions.length} mask{occlusions.length > 1 ? "s" : ""}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-xs text-white font-medium gap-1.5 backdrop-blur-[1px]">
                  <Eye size={14} />
                  <span>Click to mask key regions / diagrams</span>
                </div>
              </div>
            )}
          </div>
        ) : fetchingSnapshot ? (
          <div className="h-16 rounded-xl border border-dashed border-edge flex items-center justify-center text-[12px] text-ink-subtle">
            {t("Capturing frame…")}
          </div>
        ) : null}

        {/* Note textarea */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-ink-subtle">
            {t("Notes & Key Takeaways (Markdown supported)")}
          </label>
          <textarea
            autoFocus={!isOcclusionMode}
            rows={isOcclusionMode ? 2 : 3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("e.g. Action potential threshold is -55mV; voltage-gated Na+ channels open rapidly…")}
            className="w-full resize-none rounded-xl bg-canvas/70 p-3 text-[13.5px] text-ink placeholder:text-ink-subtle/60 border border-edge outline-none focus:border-accent focus:ring-1 focus:ring-accent font-sans"
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleCopyObsidian}
            disabled={!text.trim() && occlusions.length === 0}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-ink-muted hover:bg-raised hover:text-ink transition disabled:opacity-40"
            title={t("Copy as Markdown for Obsidian or Anki")}
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copied ? t("Copied!") : t("Copy for Obsidian / Anki")}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3.5 py-1.5 text-[13px] font-medium text-ink-subtle hover:bg-raised hover:text-ink transition"
            >
              {t("Cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!text.trim() && occlusions.length === 0}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-1.5 text-[13px] font-medium text-white shadow-sm hover:opacity-90 active:scale-[0.98] transition disabled:opacity-40"
            >
              <span>{t("Save Note")}</span>
              <kbd className="text-[10px] opacity-75 font-mono">⌘↵</kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
