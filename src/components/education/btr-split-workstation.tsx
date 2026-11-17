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
  Video,
  Link,
  Search,
  FolderOpen,
  Eye,
  EyeOff,
} from "lucide-react";
import { getChaptersForVideo, type BTRLectureChapter } from "@/lib/education/btr-chapters-engine";
import {
  type BTRLocalMediaFile,
  resolveBTRPlayableUrl,
  createBTRVideoPlayerSrc,
} from "@/lib/education/btr-local-library";
import {
  extractYouTubeId,
  buildYouTubeEmbedUrl,
  createYouTubeMediaFile,
  getSubjectYouTubeLecture,
} from "@/lib/education/btr-youtube-bridge";
import {
  getDigitalNotesForSubject,
} from "@/lib/education/btr-digital-notes";
import { CORE_BTR_BROADCASTS } from "@/lib/education/btr-broadcasts";
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
  const [pdfMode, setPdfMode] = useState<"unannotated" | "annotated" | "digital_summary">(
    annotatedPdf ? "annotated" : unannotatedPdf ? "unannotated" : "digital_summary"
  );
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [customAnnotatedBlob, setCustomAnnotatedBlob] = useState<string | null>(null);
  const [customUnannotatedBlob, setCustomUnannotatedBlob] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const directPdfInputRef = useRef<HTMLInputElement | null>(null);

  // Digital Notes Reader State
  const [notesSearchQuery, setNotesSearchQuery] = useState("");
  const [revealedClozeIds, setRevealedClozeIds] = useState<Set<string>>(new Set());
  const [activeNoteCategory, setActiveNoteCategory] = useState<string>("All");

  const digitalNotes = useMemo(() => {
    return getDigitalNotesForSubject(subject.id);
  }, [subject.id]);

  const filteredNotes = useMemo(() => {
    return digitalNotes.filter((sec) => {
      const matchesCat = activeNoteCategory === "All" || sec.category === activeNoteCategory;
      if (!matchesCat) return false;
      if (!notesSearchQuery.trim()) return true;
      const q = notesSearchQuery.toLowerCase();
      return (
        sec.title.toLowerCase().includes(q) ||
        sec.summary.toLowerCase().includes(q) ||
        sec.pearls.some((p) => p.toLowerCase().includes(q)) ||
        Boolean(sec.table?.rows.some((row) => row.some((c) => c.toLowerCase().includes(q))))
      );
    });
  }, [digitalNotes, activeNoteCategory, notesSearchQuery]);

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

  // YouTube Bridge State
  const [showYouTubeModal, setShowYouTubeModal] = useState<boolean>(false);
  const [customYouTubeInput, setCustomYouTubeInput] = useState<string>("");
  const activeYouTubeId = useMemo(
    () => extractYouTubeId(activeVideo.fullPath || activeVideo.streamUrl || ""),
    [activeVideo]
  );

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

  // PDF URL resolution with convertFileSrc and blob fallback
  const activePdf = pdfMode === "unannotated" ? unannotatedPdf : annotatedPdf;
  const activeCustomBlob = pdfMode === "unannotated" ? customUnannotatedBlob : customAnnotatedBlob;
  const pdfUrl = useMemo(() => {
    if (activeCustomBlob) return activeCustomBlob;
    if (!activePdf) return null;
    return resolveBTRPlayableUrl(activePdf.fullPath, activePdf.blobUrl);
  }, [activeCustomBlob, activePdf]);

  // Direct PDF file picker handler
  const handleDirectPdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    if (pdfMode === "unannotated") {
      setCustomUnannotatedBlob(blobUrl);
    } else {
      setCustomAnnotatedBlob(blobUrl);
    }
    setPdfLoadError(false);
  };

  // Open PDF in Native macOS Viewer / Preview
  const handleOpenPdfInSystemViewer = async () => {
    const targetPath = activePdf?.fullPath?.replace(/^file:\/\//, "");
    if (!targetPath) return;
    try {
      const { openPath } = await import("@tauri-apps/plugin-opener");
      await openPath(targetPath);
    } catch (e) {
      console.warn("Failed to open PDF in system viewer:", e);
      if (pdfUrl) {
        window.open(pdfUrl, "_blank");
      }
    }
  };

  // Instant switch to high-yield YouTube lecture when local video is unplayable
  const handleStreamSubjectYouTube = () => {
    const ytVideo = getSubjectYouTubeLecture(subject.id);
    setActiveVideo(ytVideo);
    setVideoError(false);
  };

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
      {/* Hidden direct file input for video */}
      <input
        type="file"
        ref={directFileInputRef}
        accept="video/*"
        onChange={handleDirectFileSelect}
        className="hidden"
      />

      {/* Hidden direct file input for PDF workbook */}
      <input
        type="file"
        ref={directPdfInputRef}
        accept="application/pdf"
        onChange={handleDirectPdfSelect}
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
          {/* Connect / Paste YouTube Lecture Link */}
          <button
            type="button"
            onClick={() => setShowYouTubeModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
              activeYouTubeId
                ? "bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30"
                : "bg-red-600/10 border border-red-500/25 text-red-400 hover:bg-red-600/20"
            }`}
            title="Connect YouTube Lecture or Paste YouTube Video Link"
          >
            <Video size={13} />
            <span>{activeYouTubeId ? "YouTube HD" : "Connect YouTube"}</span>
          </button>

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
              <div className="flex flex-col items-center justify-center gap-4 p-8 text-center max-w-lg">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Video Decoder Mismatch</h3>
                  <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                    This video format (MKV, 10-bit HEVC, or sandboxed disk path) is not supported by standard webview HTML5 decoders. Select a playback option below:
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={handleLaunchNativePlayer}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 transition"
                    title="Play with zero-lag hardware decoding via Argus MPV engine"
                  >
                    <ExternalLink size={13} />
                    <span>Native MPV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => directFileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-elevated border border-edge-soft px-3 py-2.5 text-xs font-bold text-ink hover:bg-raised transition"
                    title="Pick video from disk for immediate in-webview playback"
                  >
                    <Upload size={13} />
                    <span>Pick File</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleStreamSubjectYouTube}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-red-600/25 border border-red-500/50 px-3 py-2.5 text-xs font-bold text-red-200 hover:bg-red-600/40 transition shadow-sm"
                    title={`Stream Dr. Zainab Vora high-yield ${subject.name} lecture`}
                  >
                    <Video size={13} />
                    <span>Stream YouTube</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowYouTubeModal(true)}
                  className="text-[11px] text-ink-muted hover:text-ink underline transition mt-1"
                >
                  Or paste a custom YouTube link or video ID
                </button>
              </div>
            ) : activeYouTubeId ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
                <iframe
                  key={`${activeYouTubeId}-${Math.floor(currentTime)}`}
                  title={activeVideo.title || "YouTube Medical Lecture"}
                  src={buildYouTubeEmbedUrl(activeYouTubeId, {
                    startSec: currentTime,
                    autoplay: true,
                  })}
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/90 text-white font-bold text-[10px] tracking-wider uppercase shadow-lg backdrop-blur-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  <span>YouTube Connected</span>
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
          {/* PDF & Digital Notes Toolbar */}
          <div className="h-12 border-b border-edge px-3 sm:px-4 flex items-center justify-between gap-2 bg-surface/90">
            {/* Unannotated vs Annotated vs Digital Notes Toggle */}
            <div className="flex items-center gap-1 rounded-xl bg-elevated border border-edge-soft p-1">
              <button
                type="button"
                onClick={() => {
                  setPdfMode("unannotated");
                  setPdfLoadError(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  pdfMode === "unannotated"
                    ? "bg-accent text-white shadow-xs"
                    : unannotatedPdf || customUnannotatedBlob
                    ? "text-ink-muted hover:text-ink"
                    : "opacity-60 text-ink-muted"
                }`}
                title="Unannotated active recall workbook"
              >
                <BookOpen size={12} />
                <span className="hidden sm:inline">Workbook</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPdfMode("annotated");
                  setPdfLoadError(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  pdfMode === "annotated"
                    ? "bg-blue-600 text-white shadow-xs"
                    : annotatedPdf || customAnnotatedBlob
                    ? "text-ink-muted hover:text-ink"
                    : "opacity-60 text-ink-muted"
                }`}
                title="Dr. Zainab Vora Annotated Solutions"
              >
                <FileText size={12} />
                <span>Annotated</span>
              </button>

              <button
                type="button"
                onClick={() => setPdfMode("digital_summary")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  pdfMode === "digital_summary"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-ink-muted hover:text-ink"
                }`}
                title="Offline High-Yield Digital Summary & Tables"
              >
                <Sparkles size={12} />
                <span>Digital Notes</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => directPdfInputRef.current?.click()}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-elevated border border-edge-soft text-ink-muted hover:text-ink hover:bg-raised transition"
                title="Pick local PDF file directly from disk"
              >
                <FolderOpen size={12} />
                <span className="hidden md:inline">Pick PDF</span>
              </button>

              {activePdf?.fullPath && (
                <button
                  type="button"
                  onClick={handleOpenPdfInSystemViewer}
                  className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-elevated border border-edge-soft text-ink-muted hover:text-ink hover:bg-raised transition"
                  title="Open PDF in macOS Preview app"
                >
                  <ExternalLink size={12} />
                  <span>Preview</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsMarkupEnabled(!isMarkupEnabled)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition ${
                  isMarkupEnabled
                    ? "bg-white text-black font-semibold shadow-xs"
                    : "bg-elevated border border-edge-soft text-ink-muted hover:text-ink"
                }`}
                title="Fill in blanks or highlight directly"
              >
                <PenTool size={12} />
                <span className="hidden sm:inline">{isMarkupEnabled ? "Markup ON" : "Markup"}</span>
              </button>
            </div>
          </div>

          {/* PDF Frame / Digital Notes Content */}
          <div className="flex-1 bg-canvas relative overflow-hidden flex flex-col">
            {pdfMode === "digital_summary" || !pdfUrl || pdfLoadError ? (
              <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4 no-scrollbar">
                {/* Fallback Notice Strip if switched automatically from PDF */}
                {pdfLoadError && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} className="shrink-0 text-amber-400" />
                      <span>PDF loading blocked by webview sandbox. Showing Digital High-Yield Notes below.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => directPdfInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/25 border border-amber-500/40 font-bold hover:bg-amber-500/35 transition shrink-0"
                    >
                      Pick Local PDF
                    </button>
                  </div>
                )}

                {/* Digital Notes Header & Search Strip */}
                <div className="flex flex-col gap-2.5 bg-surface/60 border border-edge rounded-2xl p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                        <Sparkles size={14} className="text-purple-400" />
                        <span>{subject.name} High-Yield Master Deck</span>
                      </h3>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        High-yield tables, clinical lesions, and NEET-PG / INI-CET must-know pearls.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => directPdfInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/25 transition"
                    >
                      <Upload size={12} />
                      <span>Link Local PDF</span>
                    </button>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-2.5 text-ink-muted" />
                    <input
                      type="text"
                      value={notesSearchQuery}
                      onChange={(e) => setNotesSearchQuery(e.target.value)}
                      placeholder={`Search ${subject.name} pearls, nerves, tables, or foramina...`}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-canvas border border-edge text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                    {["All", "High-Yield Tables", "Nerve & Lesion Matrix", "Anatomical Landmarks", "Embryology & Derivations", "20th Subject Traps"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveNoteCategory(cat)}
                        className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold shrink-0 transition ${
                          activeNoteCategory === cat
                            ? "bg-purple-600 text-white shadow-xs"
                            : "bg-canvas border border-edge text-ink-muted hover:text-ink hover:bg-elevated"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Digital Note Sections */}
                {filteredNotes.map((section) => (
                  <div
                    key={section.id}
                    className="flex flex-col gap-3 p-4 rounded-2xl bg-surface border border-edge shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-edge pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/25">
                          {section.category}
                        </span>
                        <h4 className="text-xs font-bold text-ink">{section.title}</h4>
                      </div>
                    </div>

                    <p className="text-xs text-ink-muted leading-relaxed">{section.summary}</p>

                    {/* Pearls Bullets */}
                    <div className="space-y-1.5">
                      {section.pearls.map((pearl, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-2 text-xs text-ink leading-snug">
                          <span className="text-purple-400 shrink-0 font-bold">•</span>
                          <span>{pearl}</span>
                        </div>
                      ))}
                    </div>

                    {/* High Yield Table */}
                    {section.table && (
                      <div className="overflow-x-auto rounded-xl border border-edge bg-canvas/60 mt-2">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-edge bg-elevated/70 text-ink font-bold">
                              {section.table.headers.map((h, hIdx) => (
                                <th key={hIdx} className="p-2 sm:px-3 sm:py-2 border-r last:border-r-0 border-edge font-mono text-[11px]">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {section.table.rows.map((row, rIdx) => (
                              <tr
                                key={rIdx}
                                className="border-b last:border-b-0 border-edge-soft hover:bg-surface/50 transition"
                              >
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className={`p-2 sm:px-3 sm:py-2 text-[11.5px] border-r last:border-r-0 border-edge-soft leading-snug ${
                                      cIdx === 0 ? "font-semibold text-accent" : "text-ink"
                                    }`}
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Cloze Active Recall Cards */}
                    {section.clozeItems && section.clozeItems.length > 0 && (
                      <div className="space-y-2 mt-2 pt-2 border-t border-edge-soft">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                          Active Recall Cloze Self-Test:
                        </span>
                        {section.clozeItems.map((item) => {
                          const isRevealed = revealedClozeIds.has(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                setRevealedClozeIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                });
                              }}
                              className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 text-xs text-ink cursor-pointer hover:bg-purple-500/15 transition flex items-start justify-between gap-3"
                            >
                              <span className="leading-relaxed">
                                {isRevealed
                                  ? item.textWithBlanks.replace(/\{([^}]+)\}/g, "$1")
                                  : item.textWithBlanks.replace(/\{([^}]+)\}/g, "[ ___ ? ___ ]")}
                              </span>
                              <span className="shrink-0 text-purple-400 font-bold text-[10px] flex items-center gap-1 mt-0.5">
                                {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                                {isRevealed ? "Hide" : "Reveal"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative w-full h-full flex flex-col">
                <iframe
                  key={`${pdfUrl}-${pdfPage}`}
                  title="BTR PDF Workbook"
                  src={`${pdfUrl}#page=${pdfPage}&toolbar=1`}
                  className="w-full flex-1 border-none bg-canvas"
                  onError={() => setPdfLoadError(true)}
                />
                {/* PDF Footer Quick Bar */}
                <div className="h-7 border-t border-edge-soft px-3 flex items-center justify-between bg-surface/90 text-[11px] text-ink-muted shrink-0">
                  <span className="truncate max-w-[200px] font-mono text-[10.5px]">
                    {activePdf?.filename || "Workbook PDF"}
                  </span>
                  <div className="flex items-center gap-2 font-medium">
                    <button
                      type="button"
                      onClick={() => directPdfInputRef.current?.click()}
                      className="hover:text-accent transition"
                    >
                      Re-link PDF
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={handleOpenPdfInSystemViewer}
                      className="hover:text-accent transition flex items-center gap-1"
                    >
                      <ExternalLink size={10} /> Preview
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setPdfMode("digital_summary")}
                      className="text-purple-400 hover:text-purple-300 font-semibold transition"
                    >
                      Digital Deck
                    </button>
                  </div>
                </div>
                <BTRCanvasMarkup
                  storageKey={`${subject.id}_${pdfMode}_p${pdfPage}`}
                  enabled={isMarkupEnabled}
                  onToggleEnabled={() => setIsMarkupEnabled(!isMarkupEnabled)}
                />
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

      {/* Connect YouTube Lecture Modal */}
      {showYouTubeModal && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-3xl bg-surface border border-edge p-6 shadow-2xl flex flex-col gap-4 text-ink">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/20 text-red-500 border border-red-500/30">
                  <Video size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Connect YouTube Medical Lecture</h3>
                  <p className="text-xs text-ink-muted">
                    Watch any YouTube lecture side-by-side with your active PDF workbook.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowYouTubeModal(false)}
                className="p-1.5 rounded-xl bg-elevated border border-edge text-ink-muted hover:text-ink transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Custom URL Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!customYouTubeInput.trim()) return;
                const ytMedia = createYouTubeMediaFile(
                  customYouTubeInput.trim(),
                  `YouTube: ${subject.name} Lecture`,
                  subject.id
                );
                setActiveVideo(ytMedia);
                setVideoError(false);
                setShowYouTubeModal(false);
                setCustomYouTubeInput("");
              }}
              className="flex flex-col gap-2.5"
            >
              <label className="text-xs font-bold text-ink-muted">
                Paste YouTube Video Link or Video ID:
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link size={14} className="absolute left-3 top-3 text-ink-muted" />
                  <input
                    type="text"
                    value={customYouTubeInput}
                    onChange={(e) => setCustomYouTubeInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                    className="w-full rounded-xl bg-canvas border border-edge pl-9 pr-3 py-2 text-xs text-ink focus:outline-none focus:border-red-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customYouTubeInput.trim()}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs transition shadow-xs"
                >
                  Load Lecture
                </button>
              </div>
            </form>

            {/* Quick Pick: Official Dr. Zainab Core Drops */}
            <div className="flex flex-col gap-2 pt-2 border-t border-edge-soft">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Or Quick-Load Official Dr. Zainab Core Drops:
              </span>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {CORE_BTR_BROADCASTS.map((broadcast) => (
                  <button
                    key={broadcast.id}
                    type="button"
                    onClick={() => {
                      const ytMedia = createYouTubeMediaFile(
                        broadcast.youtubeId,
                        broadcast.title,
                        subject.id
                      );
                      setActiveVideo(ytMedia);
                      setVideoError(false);
                      setShowYouTubeModal(false);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl bg-canvas hover:bg-elevated border border-edge-soft text-left text-xs transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                      <span className="font-semibold text-ink truncate">{broadcast.title}</span>
                    </div>
                    <span className="text-[10px] text-ink-muted font-mono shrink-0 ml-2">
                      {broadcast.durationLabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
