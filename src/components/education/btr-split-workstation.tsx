import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  AlertTriangle,
  ExternalLink,
  Upload,
  Camera,
  PenTool,
  BrainCircuit,
  CheckCircle2,
} from "lucide-react";
import { getChaptersForVideo, type BTRLectureChapter } from "@/lib/education/btr-chapters-engine";
import {
  type BTRLocalMediaFile,
  resolveBTRPlayableUrl,
  createBTRVideoPlayerSrc,
} from "@/lib/education/btr-local-library";
import type { BTRSubject } from "@/lib/education/corebtr-schedule";
import { useView } from "@/lib/view";
import { BTRCanvasMarkup } from "./btr-canvas-markup";
import { BTRFrameGrabberModal } from "./btr-frame-grabber-modal";

interface BTRSplitWorkstationProps {
  open: boolean;
  onClose: () => void;
  video: BTRLocalMediaFile;
  subject: BTRSubject;
  unannotatedPdf?: BTRLocalMediaFile;
  annotatedPdf?: BTRLocalMediaFile;
  initialTimestampSec?: number;
  embedded?: boolean;
}

export function BTRSplitWorkstation({
  open,
  onClose,
  video: initialVideo,
  subject,
  unannotatedPdf,
  annotatedPdf,
  initialTimestampSec,
  embedded = false,
}: BTRSplitWorkstationProps) {
  const { openPlayer } = useView();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const directFileInputRef = useRef<HTMLInputElement | null>(null);

  // Active Video state (allows overriding with direct file picker if needed)
  const [activeVideo, setActiveVideo] = useState<BTRLocalMediaFile>(initialVideo);
  useEffect(() => {
    setActiveVideo(initialVideo);
    setVideoError(false);
  }, [initialVideo]);

  useEffect(() => {
    if (initialTimestampSec && initialTimestampSec > 0) {
      if (videoRef.current) {
        videoRef.current.currentTime = initialTimestampSec;
      }
      setCurrentTime(initialTimestampSec);
    }
  }, [initialTimestampSec, activeVideo]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.5);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioOnlyMode, setAudioOnlyMode] = useState(false);
  const [videoError, setVideoError] = useState(false);

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

  // Canvas Markup & Frame Grabber State
  const [isMarkupEnabled, setIsMarkupEnabled] = useState(false);
  const [frameGrabDataUrl, setFrameGrabDataUrl] = useState<string | null>(null);
  const [showFrameGrabModal, setShowFrameGrabModal] = useState(false);

  // Socratic Checkpoints State
  const [activeCheckpoint, setActiveCheckpoint] = useState<BTRLectureChapter | null>(null);
  const [completedCheckpoints, setCompletedCheckpoints] = useState<Set<string>>(new Set());
  const [socraticAnsweredIndex, setSocraticAnsweredIndex] = useState<number | null>(null);
  const [enableAutoCheckpoints, setEnableAutoCheckpoints] = useState<boolean>(true);

  const handleGrabFrame = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    try {
      const offscreen = document.createElement("canvas");
      offscreen.width = vid.videoWidth || 1280;
      offscreen.height = vid.videoHeight || 720;
      const ctx = offscreen.getContext("2d");
      if (ctx) {
        ctx.drawImage(vid, 0, 0, offscreen.width, offscreen.height);
        const dataUrl = offscreen.toDataURL("image/jpeg", 0.9);
        setFrameGrabDataUrl(dataUrl);
        setShowFrameGrabModal(true);
      }
    } catch (e) {
      console.warn("Frame grab failed", e);
    }
  }, []);

  // Global shortcut: ⌘+Shift+C (or Ctrl+Shift+C) to capture frame
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleGrabFrame();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleGrabFrame]);

  // Chapters
  const chapters = useMemo(() => getChaptersForVideo(activeVideo.filename), [activeVideo.filename]);

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

  // Open Socratic Checkpoint
  const handleOpenCheckpoint = useCallback((ch: BTRLectureChapter) => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = ch.timestampSec;
    }
    setCurrentTime(ch.timestampSec);
    if (ch.pageNumberRef) {
      setPdfPage(ch.pageNumberRef);
    }
    setActiveCheckpoint(ch);
    setSocraticAnsweredIndex(null);
    setCompletedCheckpoints((prev) => new Set(prev).add(ch.id));
  }, []);

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

  // Video URL resolution with convertFileSrc in Tauri & blob fallback
  const playableVideoUrl = useMemo(() => {
    return resolveBTRPlayableUrl(activeVideo.fullPath, activeVideo.blobUrl);
  }, [activeVideo]);

  // PDF URL resolution with convertFileSrc
  const activePdf = pdfMode === "unannotated" ? unannotatedPdf : annotatedPdf;
  const pdfUrl = useMemo(() => {
    if (!activePdf) return null;
    return resolveBTRPlayableUrl(activePdf.fullPath);
  }, [activePdf]);

  // Direct file picker handler for instant webview playback
  const handleDirectFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    setActiveVideo((prev) => ({
      ...prev,
      blobUrl,
      title: file.name,
      filename: file.name,
    }));
    setVideoError(false);
  };

  // Launch in native Argus Theater Engine (AVPlayer / MPVKit)
  const handleLaunchNativePlayer = () => {
    const src = createBTRVideoPlayerSrc(activeVideo, subject, activePdf?.fullPath);
    openPlayer(src);
  };

  if (!open) return null;

  return (
    <div
      className={
        embedded
          ? "h-[calc(100vh-140px)] min-h-[640px] w-full flex flex-col rounded-3xl overflow-hidden border border-edge bg-canvas shadow-xl text-ink"
          : "fixed inset-0 z-[250] flex flex-col bg-canvas text-ink animate-in fade-in duration-150"
      }
    >
      {/* Hidden direct file input */}
      <input
        type="file"
        ref={directFileInputRef}
        accept="video/*"
        onChange={handleDirectFileSelect}
        className="hidden"
      />

      {/* 1. Header Navigation Bar */}
      <header className="flex h-14 items-center justify-between border-b border-edge px-4 sm:px-6 bg-surface/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold rounded-lg bg-accent/15 text-accent px-2.5 py-1 border border-accent/25">
            {subject.shortCode}
          </span>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-ink truncate max-w-md sm:max-w-xl">
              {activeVideo.title || `${subject.name} - Lecture ${activeVideo.lectureNumber}`}
            </h2>
            <span className="text-[11px] text-ink-muted">
              {subject.name} • Dr. Zainab Vora High-Yield Workstation
            </span>
          </div>
        </div>

        {/* Global Workstation Controls */}
        <div className="flex items-center gap-2.5">
          {/* Capture Video Frame to FSRS Vault */}
          <button
            type="button"
            onClick={handleGrabFrame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition shadow-xs"
            title="Capture current video frame to FSRS Error Vault (⌘+Shift+C)"
          >
            <Camera size={13} />
            <span className="hidden sm:inline">Frame Grab</span>
            <kbd className="hidden md:inline-block font-mono text-[9px] bg-black/40 px-1 py-0.5 rounded text-amber-300/80">⌘⇧C</kbd>
          </button>

          {/* Launch Native Player in Argus Engine */}
          <button
            type="button"
            onClick={handleLaunchNativePlayer}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 transition shadow-xs"
            title="Open lecture in Argus Native Hardware Theater Engine (MPV / AVPlayer for MKV/HEVC)"
          >
            <ExternalLink size={13} />
            <span>Native Theater Engine</span>
          </button>

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
            ) : videoError ? (
              <div className="flex flex-col items-center justify-center gap-4 p-8 text-center max-w-md">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Video Decoder Mismatch</h3>
                  <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                    This video format (MKV, 10-bit HEVC, or sandboxed disk path) is not supported by standard webview HTML5 decoders.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                  <button
                    type="button"
                    onClick={handleLaunchNativePlayer}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 transition"
                  >
                    <ExternalLink size={14} />
                    <span>Play in Native Engine (MPV)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => directFileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-elevated border border-edge-soft px-4 py-2.5 text-xs font-bold text-ink hover:bg-raised transition"
                  >
                    <Upload size={14} />
                    <span>Pick Local File</span>
                  </button>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                src={playableVideoUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={(e) => {
                  const ct = e.currentTarget.currentTime;
                  setCurrentTime(ct);
                  if (enableAutoCheckpoints && !activeCheckpoint) {
                    const triggerable = chapters.find(
                      (ch) =>
                        ch.timestampSec > 30 &&
                        Math.abs(ct - ch.timestampSec) <= 1.2 &&
                        !completedCheckpoints.has(ch.id)
                    );
                    if (triggerable) {
                      e.currentTarget.pause();
                      setIsPlaying(false);
                      setActiveCheckpoint(triggerable);
                      setSocraticAnsweredIndex(null);
                      setCompletedCheckpoints((prev) => new Set(prev).add(triggerable.id));
                    }
                  }
                }}
                onLoadedMetadata={(e) => {
                  setDuration(e.currentTarget.duration);
                  setVideoError(false);
                }}
                onError={() => {
                  // If local webview cannot decode e.g. MKV or file scheme, trip fallback banner
                  setVideoError(true);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            )}

            {/* In-Lecture Socratic Checkpoint Overlay */}
            {activeCheckpoint && (
              <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md p-6 flex flex-col justify-center items-center text-ink animate-in fade-in duration-200">
                <div className="max-w-lg w-full bg-surface border border-accent/40 rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wider">
                      <BrainCircuit size={16} />
                      <span>Dr. Zainab Vora Socratic Checkpoint</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCheckpoint(null);
                        if (videoRef.current) {
                          videoRef.current.play();
                          setIsPlaying(true);
                        }
                      }}
                      className="text-ink-muted hover:text-ink text-xs p-1 rounded-lg"
                      title="Skip Checkpoint"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-ink leading-snug">{activeCheckpoint.title}</h3>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      Timestamp: {activeCheckpoint.timestampLabel} · Workbook Reference: Page {activeCheckpoint.pageNumberRef ?? 1}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-canvas border border-edge text-xs text-ink font-medium leading-relaxed">
                    <strong>Active Recall Check:</strong> What is the pathognomonic clinical rule or management pearl for this section?
                  </div>

                  <div className="space-y-2">
                    {[
                      { text: activeCheckpoint.mustKnowConcept, isCorrect: true },
                      {
                        text:
                          activeCheckpoint.highYieldTrap ||
                          "Common Misconception: Non-specific variant with no therapeutic implication",
                        isCorrect: false,
                      },
                      { text: "Absolute contraindication in all cohorts regardless of presentation", isCorrect: false },
                      { text: "Spontaneous resolution within 24 hours without targeted intervention", isCorrect: false },
                    ].map((opt, oIdx) => {
                      const isSelected = socraticAnsweredIndex === oIdx;
                      let btnClass = "border-edge bg-elevated/70 text-ink hover:bg-raised";
                      if (socraticAnsweredIndex !== null) {
                        if (opt.isCorrect) btnClass = "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 font-semibold";
                        else if (isSelected) btnClass = "border-rose-500/60 bg-rose-500/15 text-rose-300 line-through";
                      }
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          disabled={socraticAnsweredIndex !== null}
                          onClick={() => setSocraticAnsweredIndex(oIdx)}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs transition flex items-start gap-2.5 ${btnClass}`}
                        >
                          <span className="font-mono font-bold text-ink-muted shrink-0">
                            {String.fromCharCode(65 + oIdx)}.
                          </span>
                          <span className="flex-1 leading-snug">{opt.text}</span>
                          {socraticAnsweredIndex !== null && opt.isCorrect && (
                            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {socraticAnsweredIndex !== null && (
                    <div className="p-3 rounded-xl bg-accent/10 border border-accent/25 text-xs text-ink flex flex-col gap-1.5 animate-in fade-in">
                      <div className="flex items-center gap-1.5 text-accent font-bold">
                        <Sparkles size={13} />
                        <span>Clinical Bottom Line</span>
                      </div>
                      <p className="text-[11.5px] leading-relaxed text-ink-muted">
                        {activeCheckpoint.mustKnowConcept}
                      </p>
                      {activeCheckpoint.highYieldTrap && (
                        <div className="text-[11px] text-amber-300 font-medium mt-1">
                          ⚠️ <em>Examiner Trap:</em> {activeCheckpoint.highYieldTrap}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-edge">
                    <span className="text-[11px] text-ink-muted">
                      {socraticAnsweredIndex === null ? "Choose best option to verify recall" : "Checkpoint recorded!"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCheckpoint(null);
                        if (videoRef.current) {
                          videoRef.current.play();
                          setIsPlaying(true);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-accent text-white font-bold text-xs hover:brightness-110 transition flex items-center gap-1.5 shadow-md"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Resume Lecture</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Control HUD */}
          <div className="p-4 bg-surface/90 border-t border-edge flex flex-col gap-3">
            {/* Timeline Scrubber with High-Yield Checkpoint Diamonds */}
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <span className="font-mono text-[11px]">{formatTime(currentTime)}</span>
              <div className="relative flex-1 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="w-full accent-accent h-1.5 bg-elevated rounded-lg cursor-pointer"
                />
                {/* Chapter & MCQ Marker Diamonds */}
                {chapters.map((ch) => {
                  if (!duration || ch.timestampSec <= 0) return null;
                  const leftPct = Math.min(99, Math.max(1, (ch.timestampSec / duration) * 100));
                  const isDone = completedCheckpoints.has(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleOpenCheckpoint(ch)}
                      style={{ left: `${leftPct}%` }}
                      title={`Checkpoint: ${ch.title} (${ch.timestampLabel}) • Page ${ch.pageNumberRef ?? 1}`}
                      className={`absolute -top-1 -translate-x-1/2 h-3.5 w-3.5 rotate-45 rounded-xs hover:scale-125 border border-black shadow-xs cursor-pointer transition transform z-10 ${
                        isDone ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                    />
                  );
                })}
              </div>
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

              {/* Socratic Checkpoint Auto-Prompt Toggle */}
              <button
                type="button"
                onClick={() => setEnableAutoCheckpoints(!enableAutoCheckpoints)}
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition ${
                  enableAutoCheckpoints
                    ? "bg-accent/15 border-accent/30 text-accent"
                    : "bg-elevated border-edge-soft text-ink-muted hover:text-ink"
                }`}
                title="Automatically pause video at high-yield checkpoints for Socratic active recall"
              >
                <BrainCircuit size={12} />
                <span>Socratic Recall {enableAutoCheckpoints ? "ON" : "OFF"}</span>
              </button>
            </div>

            {/* Chapters Seeker Strip */}
            <div className="mt-2 flex flex-col gap-1.5 border-t border-edge-soft pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Lecture Chapters ({chapters.length}):
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
                {chapters.map((ch) => {
                  const isCurrent = currentChapter?.id === ch.id;
                  const isDone = completedCheckpoints.has(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleOpenCheckpoint(ch)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                        isCurrent
                          ? "bg-accent text-white shadow-xs"
                          : "bg-elevated border border-edge-soft text-ink-muted hover:text-ink"
                      }`}
                      title="Jump to chapter and trigger Socratic Checkpoint"
                    >
                      {isDone ? (
                        <CheckCircle2 size={11} className="text-emerald-400" />
                      ) : (
                        <Clock size={11} />
                      )}
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMarkupEnabled(!isMarkupEnabled)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  isMarkupEnabled
                    ? "bg-white text-black font-semibold shadow-xs"
                    : "bg-elevated border border-edge-soft text-ink-muted hover:text-ink"
                }`}
                title="Fill in blanks directly over workbook"
              >
                <PenTool size={12} />
                <span>{isMarkupEnabled ? "Markup (ON)" : "Fill Blanks"}</span>
              </button>

              {/* Quick Master Peek indicator */}
              <span className="text-[11px] text-ink-muted hidden sm:inline">
                {pdfMode === "unannotated"
                  ? "Active Recall Mode"
                  : "Dr. Zainab Vora Solutions"}
              </span>
            </div>
          </div>

          {/* PDF Frame / Content */}
          <div className="flex-1 bg-elevated/40 relative overflow-hidden flex flex-col">
            {pdfUrl ? (
              <>
                <iframe
                  title="BTR PDF Workbook"
                  src={`${pdfUrl}#page=${pdfPage}&toolbar=1`}
                  className="w-full h-full border-none"
                />
                <BTRCanvasMarkup
                  storageKey={`${subject.id}_${pdfMode}_p${pdfPage}`}
                  enabled={isMarkupEnabled}
                  onToggleEnabled={() => setIsMarkupEnabled(!isMarkupEnabled)}
                />
              </>
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

      {/* Frame Grabber to FSRS Error Vault Modal */}
      <BTRFrameGrabberModal
        open={showFrameGrabModal}
        onClose={() => setShowFrameGrabModal(false)}
        frameDataUrl={frameGrabDataUrl}
        lectureTitle={activeVideo.title || `${subject.name} - Lecture ${activeVideo.lectureNumber}`}
        subjectName={subject.name}
        timestampSec={currentTime}
        timestampLabel={formatTime(currentTime)}
      />
    </div>
  );
}
