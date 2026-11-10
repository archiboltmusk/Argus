import { Loader2, Mic, X, Globe } from "lucide-react";
import { useLiveTranscriptionSession } from "@/lib/subtitles/live-transcription-service";
import { useT } from "@/lib/i18n";

export function LiveTranscriptionPill({ visible }: { visible: boolean }) {
  const tr = useT();
  const session = useLiveTranscriptionSession();

  if (!session.isActive && session.status !== "transcribing" && session.status !== "preparing") {
    return null;
  }

  const mins = Math.floor(session.currentSec / 60);
  const totalMins = Math.floor(session.totalSec / 60);

  return (
    <div
      className={`fixed top-16 right-6 z-[9900] flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-cyan-400/60 text-cyan-200 text-xs font-medium shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md transition-opacity duration-200 motion-reduce:transition-none ${
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-1.5 text-cyan-400">
        <Loader2 size={13} className="animate-spin motion-reduce:[animation-duration:2.4s]" />
        {session.translate ? <Globe size={13} /> : <Mic size={13} />}
      </div>

      <span className="font-semibold text-white">
        {session.translate ? tr("Live EN") : tr("Whisper")}
      </span>

      <span className="text-zinc-400">·</span>

      <span className="font-mono text-cyan-300 font-bold">
        {session.progressPct}%
      </span>

      {totalMins > 0 && (
        <span className="text-zinc-400 font-mono text-[11px]">
          ({mins}m / {totalMins}m)
        </span>
      )}

      {session.cueCount > 0 && (
        <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
          {session.cueCount} cues
        </span>
      )}

      <button
        type="button"
        onClick={() => void session.stop()}
        title={tr("Stop live subtitle transcription")}
        aria-label={tr("Stop")}
        className="ml-1 p-0.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  );
}
