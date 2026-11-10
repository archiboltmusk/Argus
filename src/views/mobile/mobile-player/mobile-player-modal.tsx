import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  X,
  ExternalLink,
  Volume2,
  VolumeX,
  Maximize,
  AlertTriangle,
} from "lucide-react";
import type { PlayerSrc } from "@/lib/view";
import {
  launchIosExternalPlayer,
  type IosPlayerId,
} from "@/lib/player/ios-external-players";

interface MobilePlayerModalProps {
  src: PlayerSrc;
  onClose: () => void;
}

export function MobilePlayerModal({ src, onClose }: MobilePlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const hudTimerRef = useRef<number | null>(null);

  // Auto hide HUD after 4s of inactivity
  const bumpTimer = () => {
    setShowHud(true);
    if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
    hudTimerRef.current = window.setTimeout(() => {
      setShowHud(false);
    }, 4000);
  };

  useEffect(() => {
    bumpTimer();
    return () => {
      if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
    };
  }, []);

  // Update time and state
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handlePlayPause = () => {
    bumpTimer();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {
        setPlayerError("Playback was blocked or format is not supported.");
      });
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const handleSeek = (seconds: number) => {
    bumpTimer();
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, seconds));
  };

  const handleSkip = (delta: number) => {
    bumpTimer();
    if (!videoRef.current) return;
    handleSeek(videoRef.current.currentTime + delta);
  };

  const formatTime = (sec: number) => {
    if (!isFinite(sec) || sec < 0) return "0:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleExternalHandoff = async (player: IosPlayerId) => {
    await launchIosExternalPlayer(player, src.url, src.title);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none overflow-hidden"
      onClick={bumpTimer}
    >
      {/* Underlying Video Surface */}
      <video
        ref={videoRef}
        src={src.url}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => {
          setPlayerError(
            "iOS WebKit cannot decode this container or audio track (.mkv / DTS / AC3). Open in Outplayer or Infuse for instant hardware playback.",
          );
        }}
      />

      {/* Codec Error Fallback Overlay */}
      {playerError && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-zinc-900/90 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Playback Format Unsupported in Safari</h3>
              <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                {playerError}
              </p>
            </div>

            <div className="w-full flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleExternalHandoff("outplayer")}
                className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
              >
                <span>Open in Outplayer (Recommended)</span>
                <ExternalLink size={16} />
              </button>

              <button
                type="button"
                onClick={() => handleExternalHandoff("infuse")}
                className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all border border-white/5"
              >
                <span>Open in Infuse</span>
                <ExternalLink size={16} />
              </button>

              <button
                type="button"
                onClick={() => handleExternalHandoff("vlc")}
                className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all border border-white/5"
              >
                <span>Open in VLC</span>
                <ExternalLink size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-zinc-400 hover:text-white mt-2"
            >
              Cancel and Return
            </button>
          </div>
        </div>
      )}

      {/* Top HUD Bar */}
      <div
        className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 pt-4 pb-12 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
          showHud ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="p-2.5 rounded-full bg-black/60 text-white border border-white/10 active:scale-90 transition-transform"
        >
          <X size={18} />
        </button>

        <div className="text-center px-4 max-w-[65vw]">
          <h2 className="text-sm font-bold text-white truncate drop-shadow-md">
            {src.title || src.meta.name}
          </h2>
          {src.subtitle && (
            <p className="text-xs text-zinc-300 truncate drop-shadow-md">{src.subtitle}</p>
          )}
        </div>

        {/* Quick External Player Switcher Pill */}
        <button
          type="button"
          onClick={() => handleExternalHandoff("outplayer")}
          className="px-3 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.3)] backdrop-blur-md"
        >
          <span>Outplayer</span>
          <ExternalLink size={12} />
        </button>
      </div>

      {/* Center Controls (Skip 10s, Play/Pause) */}
      <div
        className={`absolute inset-0 z-10 flex items-center justify-center gap-12 transition-opacity duration-300 ${
          showHud ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={() => handleSkip(-10)}
          className="p-3.5 rounded-full bg-black/50 text-white border border-white/10 active:scale-90 transition-transform flex flex-col items-center gap-0.5"
        >
          <RotateCcw size={22} />
          <span className="text-[10px] font-bold">10</span>
        </button>

        <button
          type="button"
          onClick={handlePlayPause}
          className="p-5 rounded-full bg-cyan-500 text-black shadow-[0_0_30px_rgba(6,182,212,0.6)] active:scale-90 transition-transform"
        >
          {playing ? <Pause size={28} /> : <Play size={28} className="translate-x-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => handleSkip(10)}
          className="p-3.5 rounded-full bg-black/50 text-white border border-white/10 active:scale-90 transition-transform flex flex-col items-center gap-0.5"
        >
          <RotateCw size={22} />
          <span className="text-[10px] font-bold">10</span>
        </button>
      </div>

      {/* Bottom HUD Controls */}
      <div
        className={`absolute bottom-0 inset-x-0 z-20 flex flex-col gap-2 px-6 pb-6 pt-12 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity duration-300 ${
          showHud ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        {/* Progress Scrubber */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-300 min-w-[40px] text-right">
            {formatTime(currentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={1}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full bg-white/20 accent-cyan-400 cursor-pointer"
          />

          <span className="text-xs font-mono text-zinc-400 min-w-[40px]">
            {formatTime(duration)}
          </span>
        </div>

        {/* Lower Utility Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !muted;
                  setMuted(!muted);
                }
              }}
              className="p-2 text-zinc-300 hover:text-white"
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (videoRef.current?.requestFullscreen) {
                  videoRef.current.requestFullscreen();
                }
              }}
              className="p-2 text-zinc-300 hover:text-white"
            >
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
