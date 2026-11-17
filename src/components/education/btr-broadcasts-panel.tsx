import { useState, useEffect } from "react";
import {
  X,
  Play,
  ExternalLink,
  Sparkles,
  Flame,
  Radio,
  Clock,
  Check,
  BookOpen,
  Maximize2,
  Zap,
  Loader2,
} from "lucide-react";
import {
  CORE_BTR_OFFICIAL_CHANNEL,
  CORE_BTR_BROADCASTS,
  type BTRBroadcastVideo,
} from "@/lib/education/btr-broadcasts";
import { buildYouTubeEmbedUrl } from "@/lib/education/btr-youtube-bridge";
import { fetchTrailer, trailerSrc } from "@/lib/trailer";

interface BTRBroadcastsModalProps {
  open: boolean;
  onClose: () => void;
  onOpenInWorkstation?: (video: BTRBroadcastVideo) => void;
}

export function BTRBroadcastsModal({
  open,
  onClose,
  onOpenInWorkstation,
}: BTRBroadcastsModalProps) {
  const [activeVideo, setActiveVideo] = useState<BTRBroadcastVideo>(CORE_BTR_BROADCASTS[0]);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [copiedPearl, setCopiedPearl] = useState<string | null>(null);
  const [nativeSrc, setNativeSrc] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  useEffect(() => {
    setNativeSrc(null);
    setIsExtracting(false);
  }, [activeVideo.youtubeId]);

  if (!open) return null;

  const filtered = CORE_BTR_BROADCASTS.filter((v) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "core_drop") return v.isDailyCoreDrop;
    return v.category === activeFilter;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedPearl(text);
    setTimeout(() => setCopiedPearl(null), 2000);
  };

  const startNativeStream = async (youtubeId: string) => {
    setIsExtracting(true);
    try {
      const info = await fetchTrailer(youtubeId, "720p");
      if (info) {
        setNativeSrc(trailerSrc(info));
      }
    } catch {
      // Fallback remains in embed mode
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl h-[90vh] max-h-[850px] rounded-3xl bg-surface border border-edge flex flex-col shadow-2xl overflow-hidden text-ink">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-edge px-5 sm:px-6 bg-surface/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30">
              <Radio size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">{CORE_BTR_OFFICIAL_CHANNEL.name}</h2>
                <a
                  href={CORE_BTR_OFFICIAL_CHANNEL.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-mono text-[11px] text-accent hover:underline"
                >
                  {CORE_BTR_OFFICIAL_CHANNEL.handle}
                  <ExternalLink size={10} />
                </a>
              </div>
              <p className="text-xs text-ink-muted">
                {CORE_BTR_OFFICIAL_CHANNEL.tagline}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-elevated hover:bg-raised text-ink-muted hover:text-ink transition border border-edge"
          >
            <X size={16} />
          </button>
        </header>

        {/* Daily 3 PM Video Banner */}
        <div className="shrink-0 bg-gradient-to-r from-accent/20 via-emerald-600/15 to-transparent border-b border-edge-soft px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-ink">
            <Flame size={14} className="text-amber-400" />
            <span className="font-bold">Daily 3:00 PM Video:</span>
            <span className="text-ink-muted hidden sm:inline">
              New short study sessions and quizzes posted daily at 3 PM.
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-accent">Latest Videos</span>
        </div>

        {/* Content Body: Split between active player and playlist */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT: Player & Key Points (60%) */}
          <div className="w-full lg:w-[60%] flex flex-col border-b lg:border-b-0 lg:border-r border-edge bg-black/60 overflow-y-auto p-4 sm:p-5 gap-4">
            {/* Embed Frame with Error 153 mitigation & Native HD Playback */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-edge-soft shadow-lg group">
              {nativeSrc ? (
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                  <video
                    src={nativeSrc}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : isExtracting ? (
                <div className="relative w-full h-full bg-black flex flex-col items-center justify-center gap-3 text-white">
                  <Loader2 size={32} className="animate-spin text-accent" />
                  <span className="text-xs font-medium text-white/80">
                    Extracting High-Definition Stream via Argus Engine...
                  </span>
                </div>
              ) : (
                <iframe
                  key={activeVideo.youtubeId}
                  title={activeVideo.title}
                  src={buildYouTubeEmbedUrl(activeVideo.youtubeId, { autoplay: false, enableJsApi: false })}
                  className="w-full h-full border-none"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}

              {/* Quick Watch Controls: Native HD, Popout Window & YouTube */}
              <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (nativeSrc) {
                      setNativeSrc(null);
                    } else {
                      void startNativeStream(activeVideo.youtubeId);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs backdrop-blur-md border transition shadow-lg opacity-90 hover:opacity-100 ${
                    nativeSrc
                      ? "bg-accent text-white border-accent/40"
                      : "bg-black/85 hover:bg-black text-amber-300 border-amber-400/30"
                  }`}
                  title="Stream directly with zero restrictions using the Argus native engine"
                >
                  <Zap size={12} className={nativeSrc ? "fill-current" : "text-amber-400"} />
                  <span>{nativeSrc ? "Embed Mode" : "Native HD"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const popout = window.open(
                      `https://www.youtube.com/watch?v=${activeVideo.youtubeId}`,
                      "_blank",
                      "width=1000,height=560,menubar=no,toolbar=no,location=no,status=no"
                    );
                    popout?.focus();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/85 hover:bg-black text-white font-bold text-xs backdrop-blur-md border border-white/20 transition shadow-lg opacity-90 hover:opacity-100"
                  title="Open in a new window"
                >
                  <Maximize2 size={12} />
                  <span>Popout Player</span>
                </button>
                <a
                  href={`https://www.youtube.com/watch?v=${activeVideo.youtubeId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs backdrop-blur-md border border-red-400/30 transition shadow-lg opacity-90 hover:opacity-100"
                  title="Watch directly on YouTube"
                >
                  <ExternalLink size={12} />
                  <span>YouTube</span>
                </a>
              </div>

              {/* In-player smart fallback hint with Error 153 quick resolution */}
              {!nativeSrc && !isExtracting && (
                <div className="absolute bottom-2 left-3 right-3 z-10 flex items-center justify-between text-[11px] text-white/90 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>Seeing Error 153?</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void startNativeStream(activeVideo.youtubeId)}
                      className="font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Zap size={11} /> Stream in Native HD
                    </button>
                    <span className="text-white/30">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const popout = window.open(
                          `https://www.youtube.com/watch?v=${activeVideo.youtubeId}`,
                          "_blank",
                          "width=1000,height=560,menubar=no,toolbar=no,location=no,status=no"
                        );
                        popout?.focus();
                      }}
                      className="text-white/70 hover:text-white hover:underline cursor-pointer"
                    >
                      Popout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Video Meta */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/25">
                  {activeVideo.categoryLabel}
                </span>
                <span className="text-xs text-ink-muted flex items-center gap-1 font-mono">
                  <Clock size={12} /> {activeVideo.durationLabel}
                </span>
              </div>
              <h3 className="text-base font-bold text-ink leading-snug">{activeVideo.title}</h3>
              <p className="text-xs text-ink-muted leading-relaxed">{activeVideo.description}</p>
              {onOpenInWorkstation && (
                <button
                  type="button"
                  onClick={() => onOpenInWorkstation(activeVideo)}
                  className="mt-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-accent text-white font-bold text-xs hover:brightness-110 shadow-xs transition"
                >
                  <BookOpen size={13} />
                  <span>Open with Side-by-Side Notes</span>
                </button>
              )}
            </div>

            {/* Key Pearls from this Drop */}
            <div className="rounded-2xl bg-surface/80 border border-edge p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-ink flex items-center gap-1.5">
                  <Sparkles size={13} className="text-accent" /> Key Study Points:
                </span>
                <span className="text-[10px] text-ink-muted">Click to copy</span>
              </div>
              <div className="flex flex-col gap-2">
                {activeVideo.keyPearls.map((pearl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleCopy(pearl)}
                    className="text-left text-xs p-2.5 rounded-xl bg-canvas border border-edge-soft hover:border-accent/40 text-ink/90 flex items-start justify-between gap-2 transition"
                  >
                    <span>• {pearl}</span>
                    {copiedPearl === pearl ? (
                      <span className="text-emerald-400 shrink-0 text-[10px] flex items-center gap-1 font-bold">
                        <Check size={11} /> Copied
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Curated Channel Stream & Playlist (40%) */}
          <div className="w-full lg:w-[40%] flex flex-col bg-surface overflow-hidden">
            {/* Filter Tabs */}
            <div className="p-3 border-b border-edge flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {[
                { id: "ALL", label: "All Drops" },
                { id: "core_drop", label: "3 PM Drops" },
                { id: "inicet_recall", label: "INI-CET Recall" },
                { id: "neetpg_strategy", label: "Strategy" },
                { id: "topper_blueprint", label: "Toppers" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    activeFilter === tab.id
                      ? "bg-accent text-white shadow-xs"
                      : "bg-elevated border border-edge-soft text-ink-muted hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Video List */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
              {filtered.map((vid) => {
                const isSelected = activeVideo.id === vid.id;
                return (
                  <button
                    key={vid.id}
                    type="button"
                    onClick={() => setActiveVideo(vid)}
                    className={`text-left p-3 rounded-2xl border transition flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-accent/10 border-accent text-ink"
                        : "bg-canvas border-edge-soft hover:bg-elevated text-ink-muted hover:text-ink"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                        {vid.categoryLabel}
                      </span>
                      <span className="text-[10px] font-mono text-ink-muted">{vid.durationLabel}</span>
                    </div>
                    <h4 className="text-xs font-bold text-ink leading-snug line-clamp-2">
                      {vid.title}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] pt-1 text-ink-muted">
                      <span>{vid.publishedDate}</span>
                      <span className="text-accent flex items-center gap-1 font-bold text-[10.5px]">
                        <Play size={10} fill="currentColor" /> Watch
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
