import { useState } from "react";
import {
  X,
  Play,
  Clock,
  ExternalLink,
  BookOpen,
  Sparkles,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useView } from "@/lib/view";

export interface BTRLiveSessionData {
  id: string;
  title: string;
  instructor: string;
  date: string;
  time: string;
  badge: string;
  topic: string;
  youtubeId?: string;
  streamUrl?: string;
  duration?: string;
  keyTimestamps?: Array<{ time: string; label: string; seconds: number }>;
  takeaways?: string[];
}

interface BTRLiveStreamModalProps {
  open: boolean;
  onClose: () => void;
  session: BTRLiveSessionData | null;
  onStartQBankDrill?: (title: string) => void;
}

export function BTRLiveStreamModal({
  open,
  onClose,
  session,
  onStartQBankDrill,
}: BTRLiveStreamModalProps) {
  const { openPlayer } = useView();
  const [activePlaybackSpeed, setActivePlaybackSpeed] = useState<number>(1.25);
  const [selectedTimestampSec, setSelectedTimestampSec] = useState<number>(0);

  if (!open || !session) return null;

  // Use session youtubeId or a robust default high-yield medical stream
  const ytId = session.youtubeId || "M7lc1UVf-VE";
  const embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&start=${selectedTimestampSec}&rel=0`;

  const handleLaunchArgusNative = () => {
    openPlayer({
      url: session.streamUrl || `https://www.youtube.com/watch?v=${ytId}`,
      title: session.title,
      subtitle: `${session.instructor} • CoreBTR Live Discussion`,
      notWebReady: false,
      meta: {
        id: session.id,
        type: "other",
        name: session.title,
        description: `Official CoreBTR Live Discussion with ${session.instructor}. Topic: ${session.topic}`,
      },
      historyUrl: "/education",
    });
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-surface border border-edge shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <header className="h-14 shrink-0 px-5 flex items-center justify-between border-b border-edge bg-elevated">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="flex flex-col min-w-0">
              <h3 className="text-sm font-bold text-white truncate max-w-md">
                {session.title}
              </h3>
              <span className="text-[11px] text-ink-muted">
                {session.instructor} • {session.date} ({session.time})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLaunchArgusNative}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/20 text-white/90 text-xs font-bold border border-edge transition shadow-xs"
              title="Launch in Argus Native Player"
            >
              <ExternalLink size={13} />
              <span>Native Theater</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Video Player Area */}
        <div className="relative w-full bg-black aspect-video flex items-center justify-center overflow-hidden border-b border-edge">
          <iframe
            title={session.title}
            src={embedUrl}
            className="w-full h-full border-none"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* HUD Toolbar & Speed Selectors */}
        <div className="px-5 py-3 bg-elevated flex flex-wrap items-center justify-between gap-3 border-b border-edge">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-ink-muted font-semibold flex items-center gap-1">
              <Clock size={13} /> Speed:
            </span>
            {[1.0, 1.25, 1.5, 2.0].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setActivePlaybackSpeed(rate)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition ${
                  activePlaybackSpeed === rate
                    ? "bg-white text-black font-semibold shadow-xs"
                    : "bg-white/5 hover:bg-white/10 text-white/70"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {onStartQBankDrill && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartQBankDrill(session.title);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-white/90 text-black font-semibold text-xs font-bold shadow-md transition"
            >
              <BookOpen size={13} />
              <span>Practice Session Recall Qs</span>
            </button>
          )}
        </div>

        {/* Chapters & High Yield Takeaways */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface">
          {/* Key Timestamps */}
          {session.keyTimestamps && session.keyTimestamps.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2 flex items-center gap-1.5">
                <Layers size={13} /> High-Yield Discussion Timestamps
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {session.keyTimestamps.map((ts) => (
                  <button
                    key={ts.time}
                    type="button"
                    onClick={() => setSelectedTimestampSec(ts.seconds)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-left border transition text-xs ${
                      selectedTimestampSec === ts.seconds
                        ? "bg-white/15 border-indigo-400 text-white font-semibold"
                        : "bg-white/5 border-white/10 hover:border-edge text-white/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Play size={11} className="text-ink-muted shrink-0" fill="currentColor" />
                      <span className="truncate">{ts.label}</span>
                    </div>
                    <span className="font-mono text-[10px] text-ink-muted ml-2 shrink-0">
                      {ts.time}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Key Takeaways */}
          {session.takeaways && session.takeaways.length > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-edge">
              <h4 className="text-xs font-bold text-ink-muted mb-2 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" /> Dr. Zainab Vora High-Yield Takeaways
              </h4>
              <ul className="space-y-1.5">
                {session.takeaways.map((point, idx) => (
                  <li key={idx} className="text-xs text-white/80 flex items-start gap-2">
                    <ChevronRight size={13} className="text-ink-muted shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
