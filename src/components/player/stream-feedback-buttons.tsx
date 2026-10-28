import { AlertTriangle, Check, Film, Skull, ThumbsUp, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import {
  isStreamTargetVerified,
  markStreamAsCorrect,
  markStreamAsDead,
  unmarkStreamCorrect,
} from "@/lib/streams/dead-links";
import {
  rateStream,
  useStreamRating,
  type DownvoteReason,
} from "@/lib/streams/stream-ratings";
import type { Stream } from "@/lib/streams/types";

export function StreamFeedbackButtons({
  stream,
  compact = false,
}: {
  stream: Stream;
  compact?: boolean;
}) {
  const t = useT();
  const rating = useStreamRating(stream);
  const [reportOpen, setReportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isVerified = isStreamTargetVerified(stream);
  const isCorrect = isVerified || rating.userVote === "upvote";

  useEffect(() => {
    if (!reportOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setReportOpen(false);
      }
    };
    window.addEventListener("pointerdown", onClickOutside);
    return () => window.removeEventListener("pointerdown", onClickOutside);
  }, [reportOpen]);

  const handleToggleCorrect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCorrect) {
      unmarkStreamCorrect(stream);
      if (rating.userVote === "upvote") {
        rateStream(stream, "upvote"); // toggles off
      }
    } else {
      markStreamAsCorrect(stream);
      if (rating.userVote !== "upvote") {
        rateStream(stream, "upvote");
      }
    }
  };

  const handleReport = (reason: DownvoteReason, e: React.MouseEvent) => {
    e.stopPropagation();
    rateStream(stream, "downvote", reason);
    markStreamAsDead(stream);
    setReportOpen(false);
  };

  const reportReasons: Array<{ id: DownvoteReason; label: string; icon: typeof Film }> = [
    { id: "bad-audio-sync", label: t("Audio out of sync"), icon: Volume2 },
    { id: "wrong-movie", label: t("Wrong movie / episode"), icon: Film },
    { id: "hardcoded-ads-or-subs", label: t("Hardcoded ads / watermarks"), icon: AlertTriangle },
    { id: "cam-rip-fake", label: t("CAM / Fake resolution"), icon: Film },
    { id: "dead-or-buffering", label: t("Stalled / Dead host"), icon: Skull },
  ];

  return (
    <div className="relative flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {/* Upvote button */}
      <button
        type="button"
        onClick={handleToggleCorrect}
        title={isCorrect ? t("Unmark verified link") : t("Upvote as working link (+150 score)")}
        aria-label={isCorrect ? t("Unmark verified link") : t("Upvote as working link")}
        className={`group relative flex items-center justify-center rounded-full transition-all ring-1 ${
          compact ? "h-7 px-2 text-[11px] gap-1" : "h-9 w-9"
        } ${
          isCorrect
            ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/40 opacity-100 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            : "opacity-60 hover:opacity-100 bg-canvas/40 text-ink-subtle ring-edge-soft/60 hover:text-emerald-400 hover:ring-emerald-500/40"
        }`}
      >
        <ThumbsUp
          size={compact ? 12 : 14}
          strokeWidth={isCorrect ? 2.6 : 2}
          fill={isCorrect ? "currentColor" : "none"}
        />
        {rating.upvotes > 0 && (
          <span className="font-mono text-[10.5px] font-bold tabular-nums">
            {rating.upvotes}
          </span>
        )}
      </button>

      {/* Report / Dead button */}
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setReportOpen((v) => !v);
          }}
          title={t("Report issue or mark link broken")}
          aria-label={t("Report issue or mark link broken")}
          className={`flex items-center justify-center rounded-full transition-all ring-1 ${
            compact ? "h-7 w-7" : "h-9 w-9"
          } ${
            rating.userVote === "downvote"
              ? "bg-red-500/15 text-red-400 ring-red-500/40 opacity-100"
              : "opacity-50 hover:opacity-100 bg-canvas/40 text-ink-subtle ring-edge-soft/60 hover:text-red-400 hover:ring-red-500/40"
          }`}
        >
          <Skull size={compact ? 12 : 14} strokeWidth={2} />
        </button>

        {/* Report Menu Popover */}
        {reportOpen && (
          <div
            ref={menuRef}
            className="absolute end-0 top-full z-[80] mt-1.5 w-60 overflow-hidden rounded-xl border border-edge-soft bg-elevated/95 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.65)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-edge-soft/50 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-subtle">
              <span>{t("Report stream issue")}</span>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="text-ink-subtle hover:text-ink"
              >
                <X size={12} strokeWidth={2.4} />
              </button>
            </div>
            <div className="flex flex-col gap-0.5 pt-1">
              {reportReasons.map((r) => {
                const Icon = r.icon;
                const active = rating.userReason === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={(e) => handleReport(r.id, e)}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-start text-[12.5px] font-medium transition-colors ${
                      active
                        ? "bg-red-500/15 text-red-400"
                        : "text-ink-muted hover:bg-raised hover:text-ink"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={13} className="shrink-0 text-ink-subtle" />
                      <span>{r.label}</span>
                    </span>
                    {active && <Check size={12} strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
