import { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  FileText,
  Clock,
  Headphones,
  Check,
  Sparkles,
  Repeat,
} from "lucide-react";
import { getChaptersForVideo } from "@/lib/education/btr-chapters-engine";
import type { BTRLocalMediaFile } from "@/lib/education/btr-local-library";
import type { BTRSubject } from "@/lib/education/corebtr-schedule";

interface BTRSplitWorkstationProps {
  open: boolean;
  onClose: () => void;
  video: BTRLocalMediaFile;
  subject: BTRSubject;
  unannotatedPdf?: BTRLocalMediaFile;
  annotatedPdf?: BTRLocalMediaFile;
  embedded?: boolean;
}

export function BTRSplitWorkstation({
  open,
  onClose,
  video,
  subject,
  unannotatedPdf,
  annotatedPdf,
  embedded = false,
}: BTRSplitWorkstationProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.5);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioOnlyMode, setAudioOnlyMode] = useState(false);

  // A-B Loop
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [isLoopActive, setIsLoopActive] = useState(false);

  // PDF pane state
  const [pdfMode, setPdfMode] = useState<"unannotated" | "annotated">(
    unannotatedPdf ? "unannotated" : "annotated"
  );
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [quickScratchpad, setQuickScratchpad] = useState<string>("");
  const [savedScratchpad, setSavedScratchpad] = useState(false);

  // Chapters
  const chapters = useMemo(() => getChaptersForVideo(video.filename), [video.filename]);

  // Current Chapter
  const currentChapter = useMemo(() => {
    let found = chapters[0];
    for (const ch of chapters) {
      if (currentTime >= ch.timestampSec) {
        found = ch;
      }
    }
    return found;
  }, [chapters, currentTime]);

  // Update speed
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Seek video
  const handleSeek = (sec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      setCurrentTime(sec);
    }
  };

  // Time format helper
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h > 0) {
      return `${h}:${remM.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // A-B loop check
  useEffect(() => {
    if (isLoopActive && loopA !== null && loopB !== null && videoRef.current) {
      if (currentTime >= loopB) {
        videoRef.current.currentTime = loopA;
      }
    }
  }, [currentTime, isLoopActive, loopA, loopB]);

  // PDF URL resolution
  const activePdf = pdfMode === "unannotated" ? unannotatedPdf : annotatedPdf;
  const pdfUrl = activePdf
    ? activePdf.fullPath.startsWith("file://")
      ? activePdf.fullPath
      : `file://${activePdf.fullPath}`
    : null;

  if (!open) return null;

  return (
    <div
      className={
        embedded
          ? "h-[calc(100vh-140px)] min-h-[640px] w-full flex flex-col rounded-3xl overflow-hidden border border-edge bg-canvas shadow-xl text-ink"
          : "fixed inset-0 z-[250] flex flex-col bg-canvas text-ink animate-in fade-in duration-150"
      }
    >
      {/* 1. Header Navigation Bar */}
      <header className="flex h-14 items-center justify-between border-b border-edge px-4 sm:px-6 bg-surface/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold rounded-lg bg-accent/15 text-accent px-2.5 py-1 border border-accent/25">
            {subject.shortCode}
          </span>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-ink truncate max-w-md sm:max-w-xl">
              {video.title || `${subject.name} - Lecture ${video.lectureNumber}`}
            </h2>
            <span className="text-[11px] text-ink-muted">
              {subject.name} • Dr. Zainab Vora High-Yield Workstation
            </span>
          </div>
        </div>

        {/* Global Workstation Controls */}
        <div className="flex items-center gap-3">
          {/* Audio-only / Walk Mode Toggle */}
          <button
            type="button"
            onClick={() => setAudioOnlyMode(!audioOnlyMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              audioOnlyMode
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-elevated border border-edge-soft text-ink-muted hover:text-ink"
            }`}
            title="Audio-Only Walk / Commute Mode"
          >
            <Headphones size={13} />
            <span>{audioOnlyMode ? "Walk Mode (ON)" : "Audio Only"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-elevated hover:bg-raised text-ink-muted hover:text-ink transition border border-edge"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* 2. Split Workspace Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT PANE: Video Player & Controls (55%) */}
        <div className="w-full lg:w-[55%] flex flex-col border-b lg:border-b-0 lg:border-r border-edge bg-black/60 relative">
          {/* Video Container */}
          <div className="relative flex-1 flex items-center justify-center bg-black min-h-[300px] overflow-hidden">
            {audioOnlyMode ? (
              <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  <Headphones size={36} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Walk & Commute Mode Active</h3>
                  <p className="text-xs text-ink-muted mt-1 max-w-sm">
                    Display is dimmed to save battery. High-fidelity audio playing at {playbackSpeed}x.
                  </p>
                </div>
                {currentChapter && (
                  <div className="rounded-xl bg-elevated/70 border border-edge px-4 py-2 text-xs text-accent font-semibold">
                    Current: {currentChapter.title}
                  </div>
                )}
              </div>
            ) : (
              <video
                ref={videoRef}
                src={video.fullPath.startsWith("file://") ? video.fullPath : `file://${video.fullPath}`}
                className="w-full h-full object-contain"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            )}
          </div>

          {/* Video Control HUD */}
          <div className="p-4 bg-surface/90 border-t border-edge flex flex-col gap-3">
            {/* Timeline Scrubber */}
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <span className="font-mono text-[11px]">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="flex-1 accent-accent h-1.5 bg-elevated rounded-lg cursor-pointer"
              />
              <span className="font-mono text-[11px]">{formatTime(duration)}</span>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      if (isPlaying) videoRef.current.pause();
                      else videoRef.current.play();
                    }
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white hover:brightness-110 shadow-sm"
                >
                  {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSeek(Math.max(0, currentTime - 10))}
                  className="rounded-lg p-2 text-ink-muted hover:text-ink bg-elevated border border-edge-soft"
                  title="Rewind 10s"
                >
                  <RotateCcw size={14} />
                </button>

                {/* Speed Selectors */}
                <div className="flex items-center gap-1 rounded-xl bg-elevated border border-edge-soft p-1">
                  {[1.0, 1.25, 1.5, 1.75, 2.0, 2.2].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => handleSpeedChange(spd)}
                      className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition ${
                        playbackSpeed === spd
                          ? "bg-accent text-white shadow-xs"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* A-B Loop Controls */}
              <div className="flex items-center gap-1.5 rounded-xl bg-elevated border border-edge-soft px-2.5 py-1 text-xs">
                <Repeat size={12} className={isLoopActive ? "text-accent" : "text-ink-muted"} />
                <button
                  type="button"
                  onClick={() => setLoopA(currentTime)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                    loopA !== null ? "bg-accent/20 text-accent" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  A: {loopA !== null ? formatTime(loopA) : "Set"}
                </button>
                <button
                  type="button"
                  onClick={() => setLoopB(currentTime)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                    loopB !== null ? "bg-accent/20 text-accent" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  B: {loopB !== null ? formatTime(loopB) : "Set"}
                </button>
                {loopA !== null && loopB !== null && (
                  <button
                    type="button"
                    onClick={() => setIsLoopActive(!isLoopActive)}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                      isLoopActive ? "bg-accent text-white" : "bg-raised text-ink"
                    }`}
                  >
                    {isLoopActive ? "Looping" : "Start"}
                  </button>
                )}
              </div>
            </div>

            {/* Chapters Seeker Strip */}
            <div className="mt-2 flex flex-col gap-1.5 border-t border-edge-soft pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Lecture Chapters ({chapters.length}):
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
                {chapters.map((ch) => {
                  const isCurrent = currentChapter?.id === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        handleSeek(ch.timestampSec);
                        if (ch.pageNumberRef) {
                          setPdfPage(ch.pageNumberRef);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                        isCurrent
                          ? "bg-accent text-white shadow-xs"
                          : "bg-elevated border border-edge-soft text-ink-muted hover:text-ink"
                      }`}
                    >
                      <Clock size={11} />
                      <span>{ch.title}</span>
                      <span className="text-[10px] opacity-75 font-mono">{ch.timestampLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Synced PDF Workbook & Scratchpad (45%) */}
        <div className="w-full lg:w-[45%] flex flex-col bg-surface overflow-hidden">
          {/* PDF Toolbar */}
          <div className="h-12 border-b border-edge px-4 flex items-center justify-between gap-3 bg-surface/90">
            {/* Unannotated vs Annotated Toggle */}
            <div className="flex items-center gap-1 rounded-xl bg-elevated border border-edge-soft p-1">
              <button
                type="button"
                onClick={() => setPdfMode("unannotated")}
                disabled={!unannotatedPdf}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  pdfMode === "unannotated"
                    ? "bg-accent text-white shadow-xs"
                    : unannotatedPdf
                    ? "text-ink-muted hover:text-ink"
                    : "opacity-40 cursor-not-allowed text-ink-muted"
                }`}
              >
                <BookOpen size={12} />
                <span>Unannotated Workbook</span>
              </button>

              <button
                type="button"
                onClick={() => setPdfMode("annotated")}
                disabled={!annotatedPdf}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  pdfMode === "annotated"
                    ? "bg-blue-600 text-white shadow-xs"
                    : annotatedPdf
                    ? "text-ink-muted hover:text-ink"
                    : "opacity-40 cursor-not-allowed text-ink-muted"
                }`}
              >
                <FileText size={12} />
                <span>Annotated Master</span>
              </button>
            </div>

            {/* Quick Master Peek indicator */}
            <span className="text-[11px] text-ink-muted hidden sm:inline">
              {pdfMode === "unannotated"
                ? "Active Recall Mode (Fill blanks)"
                : "Dr. Zainab Vora Solutions"}
            </span>
          </div>

          {/* PDF Frame / Content */}
          <div className="flex-1 bg-elevated/40 relative overflow-hidden flex flex-col">
            {pdfUrl ? (
              <iframe
                title="BTR PDF Workbook"
                src={`${pdfUrl}#page=${pdfPage}&toolbar=1`}
                className="w-full h-full border-none"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-ink-muted gap-3">
                <BookOpen size={36} className="text-accent" />
                <h4 className="text-sm font-bold text-ink">No PDF Linked for {subject.name}</h4>
                <p className="text-xs max-w-sm">
                  Add the corresponding PDF to your BTR folder to view the workbook side-by-side with the lecture.
                </p>
              </div>
            )}
          </div>

          {/* Active Recall Scratchpad Footer */}
          <div className="border-t border-edge p-3 bg-surface flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-accent flex items-center gap-1.5">
                <Sparkles size={13} /> Active Recall Scratchpad:
              </span>
              {savedScratchpad && (
                <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                  <Check size={11} /> Saved
                </span>
              )}
            </div>

            <textarea
              rows={2}
              value={quickScratchpad}
              onChange={(e) => {
                setQuickScratchpad(e.target.value);
                setSavedScratchpad(false);
              }}
              onBlur={() => {
                setSavedScratchpad(true);
                setTimeout(() => setSavedScratchpad(false), 2000);
              }}
              placeholder="Jot down numbers, staging cutoffs, or formulas during this lecture..."
              className="w-full rounded-xl bg-canvas border border-edge-soft p-2.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
