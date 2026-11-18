import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Headphones,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import type { ClinicalQuestion } from "@/lib/education/qbank-types";

export interface BTRAudioPodModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: ClinicalQuestion[];
  onReviewCard?: (questionId: string, rating: "again" | "hard" | "good" | "easy") => void;
}

export function BTRAudioPodModal({
  isOpen,
  onClose,
  questions,
  onReviewCard,
}: BTRAudioPodModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stage, setStage] = useState<"prompt" | "countdown" | "answer">("prompt");
  const [countdown, setCountdown] = useState(3);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.25);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeQuestion = questions[currentIndex] || questions[0];

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speakText = useCallback(
    (text: string, onEnd?: () => void) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window) || isMuted) {
        onEnd?.();
        return;
      }
      stopSpeech();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = playbackSpeed;
      utterance.pitch = 1.0;
      if (onEnd) {
        utterance.onend = onEnd;
      }
      window.speechSynthesis.speak(utterance);
    },
    [playbackSpeed, isMuted, stopSpeech]
  );

  // Play Question Prompt
  const playPrompt = useCallback(() => {
    if (!activeQuestion) return;
    setStage("prompt");
    setCountdown(3);

    const promptText = `Question ${currentIndex + 1}. In ${activeQuestion.subject}. ${activeQuestion.vignette}`;
    speakText(promptText, () => {
      // Transition to countdown
      setStage("countdown");
    });
  }, [activeQuestion, currentIndex, speakText]);

  // Handle countdown step
  useEffect(() => {
    if (stage === "countdown" && isPlaying) {
      if (countdown > 0) {
        countdownTimerRef.current = setTimeout(() => {
          setCountdown((c) => c - 1);
        }, 1000);
      } else {
        // Countdown done -> reveal answer
        setStage("answer");
        const answerText = `Correct answer is option ${String.fromCharCode(
          65 + activeQuestion.correctIndex
        )}: ${activeQuestion.options[activeQuestion.correctIndex]}. Bottom line: ${
          activeQuestion.explanation?.bottomLine || ""
        }`;
        speakText(answerText, () => {
          if (autoAdvance) {
            autoAdvanceTimerRef.current = setTimeout(() => {
              handleNext();
            }, 3000);
          }
        });
      }
    }
    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [stage, countdown, isPlaying, activeQuestion, speakText, autoAdvance]);

  // Handle Play / Pause Toggle
  const togglePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopSpeech();
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    } else {
      setIsPlaying(true);
      if (stage === "prompt") {
        playPrompt();
      } else if (stage === "answer") {
        handleNext();
      }
    }
  };

  const handleNext = () => {
    stopSpeech();
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setStage("prompt");
      setCountdown(3);
    } else {
      setIsPlaying(false);
      setStage("prompt");
    }
  };

  const handlePrev = () => {
    stopSpeech();
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setStage("prompt");
      setCountdown(3);
    }
  };

  const handleRate = (rating: "again" | "hard" | "good" | "easy") => {
    onReviewCard?.(activeQuestion.id, rating);
    handleNext();
  };

  useEffect(() => {
    if (isOpen && isPlaying) {
      playPrompt();
    }
    return () => stopSpeech();
  }, [currentIndex, isOpen]);

  if (!isOpen || !activeQuestion) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="flex flex-col h-[85vh] max-h-[760px] w-full max-w-2xl bg-surface rounded-3xl border border-edge shadow-2xl overflow-hidden text-white select-none">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-elevated shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center justify-center">
              <Headphones size={20} className="text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">BTR Rapid-Fire Audio Pod</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Hands-Free Active Recall
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                Auditory spaced repetition for commutes, walks &amp; pre-sleep drills
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Center Auditory Pulse Canvas */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-between gap-6 text-center">
          {/* Track metadata */}
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-xs font-bold text-ink-muted">
              TRACK {currentIndex + 1} OF {questions.length}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-edge">
              {activeQuestion.subject} • {activeQuestion.topic}
            </span>
          </div>

          {/* Central Animated Audio Visualizer Hub */}
          <div className="relative flex items-center justify-center">
            {/* Pulsing Concentric Aura */}
            <div
              className={`absolute h-48 w-48 rounded-full border border-purple-500/30 transition-all duration-700 ${
                isPlaying ? "scale-110 opacity-60 animate-ping" : "scale-100 opacity-20"
              }`}
            />
            <div
              className={`absolute h-36 w-36 rounded-full border border-amber-500/30 transition-all duration-500 ${
                isPlaying ? "scale-105 opacity-80 animate-pulse" : "scale-100 opacity-20"
              }`}
            />

            {/* Core Circular Display */}
            <div className="relative h-28 w-28 rounded-full bg-elevated border border-edge flex flex-col items-center justify-center shadow-2xl">
              {stage === "countdown" ? (
                <span className="font-mono text-3xl font-black text-amber-400 animate-bounce">
                  {countdown}
                </span>
              ) : stage === "answer" ? (
                <CheckCircle2 size={36} className="text-emerald-400" />
              ) : (
                <Headphones size={32} className={isPlaying ? "text-purple-400 animate-pulse" : "text-white/40"} />
              )}
            </div>
          </div>

          {/* Spoken Text Display */}
          <div className="max-w-lg flex flex-col gap-3">
            <p className="text-sm font-medium text-white/90 leading-relaxed max-h-32 overflow-y-auto px-2">
              {activeQuestion.vignette}
            </p>

            {stage === "answer" && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-left flex flex-col gap-1.5 animate-in fade-in duration-150">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Correct: Option {String.fromCharCode(65 + activeQuestion.correctIndex)}
                </span>
                <p className="text-xs font-bold text-white">
                  {activeQuestion.options[activeQuestion.correctIndex]}
                </p>
                <p className="text-[11px] text-white/70 leading-snug">
                  {activeQuestion.explanation?.bottomLine}
                </p>
              </div>
            )}
          </div>

          {/* Quick FSRS Spaced Repetition Buttons */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
            <button
              type="button"
              onClick={() => handleRate("again")}
              className="py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-500/30 transition"
            >
              Missed
            </button>
            <button
              type="button"
              onClick={() => handleRate("hard")}
              className="py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition"
            >
              Hard
            </button>
            <button
              type="button"
              onClick={() => handleRate("good")}
              className="py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500/30 transition"
            >
              Mastered
            </button>
          </div>
        </div>

        {/* Bottom Audio Controller Bar */}
        <div className="p-4 border-t border-edge bg-elevated flex items-center justify-between gap-4 shrink-0">
          {/* Speed Toggle */}
          <div className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-1">
            {[1.0, 1.25, 1.5, 2.0].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPlaybackSpeed(s)}
                className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold transition ${
                  playbackSpeed === s ? "bg-white text-black shadow-xs" : "text-white/60 hover:text-white"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Main Playback Center Controls */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition disabled:opacity-30"
              title="Previous Question"
            >
              <RotateCcw size={16} />
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              className="h-11 w-11 rounded-2xl bg-white text-black hover:bg-white/90 flex items-center justify-center shadow-lg transition"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={18} className="fill-black" /> : <Play size={18} className="fill-black ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex >= questions.length - 1}
              className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition disabled:opacity-30"
              title="Next Question"
            >
              <SkipForward size={16} />
            </button>
          </div>

          {/* Auto Advance Toggle */}
          <button
            type="button"
            onClick={() => setAutoAdvance(!autoAdvance)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              autoAdvance
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                : "bg-white/5 text-white/40 border border-white/10"
            }`}
          >
            Auto-Play: {autoAdvance ? "ON" : "OFF"}
          </button>
        </div>
      </div>
    </div>
  );
}
