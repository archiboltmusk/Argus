import { useState, useEffect, useRef } from "react";
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Play,
  Mic,
  MicOff,
  AlertTriangle,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import type { LectureCheckpoint, CheckpointEvaluation } from "@/lib/education/interactive-checkpoints";
import {
  evaluateStudentExplanation,
  recordCheckpointAttempt,
} from "@/lib/education/interactive-checkpoints";
import { diagnoseRootCause, recordConceptAttempt, type RootCauseDiagnostic } from "@/lib/education/prerequisite-graph";

export type InteractiveCheckpointOverlayProps = {
  checkpoint: LectureCheckpoint;
  onContinue: () => void;
  onRewind: (seconds: number) => void;
};

export function InteractiveCheckpointOverlay({
  checkpoint,
  onContinue,
  onRewind,
}: InteractiveCheckpointOverlayProps) {
  const t = useT();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [plainText, setPlainText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [evaluation, setEvaluation] = useState<CheckpointEvaluation | null>(null);
  const [diagnostic, setDiagnostic] = useState<RootCauseDiagnostic | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize browser speech recognition if supported
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setPlainText((prev) => `${prev} ${transcript}`.trim());
          }
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      } catch {}
    }

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, []);

  const toggleVoiceDictation = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  // Keyboard shortcut listener (1-4 for options, Enter to continue)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

      if (!isSubmitted) {
        if (checkpoint.type === "multiple-choice" && checkpoint.options) {
          const num = parseInt(e.key, 10);
          if (num >= 1 && num <= checkpoint.options.length) {
            handleSelectOption(num - 1);
          }
        }
      } else {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isCorrect) onContinue();
          else onRewind(checkpoint.rewindOnFailSec);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [checkpoint, isSubmitted, isCorrect, onContinue, onRewind]);

  const handleSelectOption = (index: number) => {
    if (isSubmitted) return;
    setSelectedOption(index);
    const correct = index === checkpoint.correctIndex;
    setIsCorrect(correct);
    setIsSubmitted(true);

    recordCheckpointAttempt(checkpoint, correct);
    if (checkpoint.prerequisiteId) {
      recordConceptAttempt(checkpoint.prerequisiteId, correct);
      if (!correct) {
        const diag = diagnoseRootCause(checkpoint.prerequisiteId);
        setDiagnostic(diag);
      }
    }
  };

  const handleSubmitExplanation = () => {
    if (!plainText.trim() || isSubmitted) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const evalResult = evaluateStudentExplanation(
      plainText,
      checkpoint.expectedKeywords,
      2,
    );
    setEvaluation(evalResult);
    setIsCorrect(evalResult.passed);
    setIsSubmitted(true);

    recordCheckpointAttempt(checkpoint, evalResult.passed);
    if (checkpoint.prerequisiteId) {
      recordConceptAttempt(checkpoint.prerequisiteId, evalResult.passed);
      if (!evalResult.passed) {
        const diag = diagnoseRootCause(checkpoint.prerequisiteId);
        setDiagnostic(diag);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#121316] p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
              <GraduationCap size={18} />
            </span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                {checkpoint.conceptLabel || t("Interactive Checkpoint")}
              </div>
              <h2 className="text-base font-bold leading-tight">{checkpoint.title}</h2>
            </div>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/70">
            {Math.floor(checkpoint.timestampSec / 60)}:
            {String(checkpoint.timestampSec % 60).padStart(2, "0")}
          </span>
        </div>

        {/* Question Prompt */}
        <div className="my-5">
          <p className="text-lg font-medium text-white/95 leading-relaxed">
            {checkpoint.question}
          </p>
        </div>

        {/* Multiple Choice Mode */}
        {checkpoint.type === "multiple-choice" && checkpoint.options && (
          <div className="space-y-2.5 my-4">
            {checkpoint.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isRight = checkpoint.correctIndex === idx;

              let btnStyle = "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10 text-white/90";
              if (isSubmitted) {
                if (isRight) {
                  btnStyle = "border-emerald-500/80 bg-emerald-500/20 text-emerald-200 font-medium";
                } else if (isSelected) {
                  btnStyle = "border-rose-500/80 bg-rose-500/20 text-rose-200";
                } else {
                  btnStyle = "border-white/5 bg-white/[0.02] text-white/40 opacity-50";
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => handleSelectOption(idx)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-start text-sm transition ${btnStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-xs font-bold text-white/70">
                      {idx + 1}
                    </span>
                    <span>{option}</span>
                  </div>
                  {isSubmitted && isRight && <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />}
                  {isSubmitted && isSelected && !isRight && <XCircle size={18} className="text-rose-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Plain-English / Voice Explain Mode */}
        {checkpoint.type === "explain-it" && (
          <div className="space-y-3 my-4">
            <div className="relative">
              <textarea
                rows={3}
                disabled={isSubmitted}
                value={plainText}
                onChange={(e) => setPlainText(e.target.value)}
                placeholder={t("Explain the mechanism in plain English (or tap mic to speak)...")}
                className="w-full rounded-xl border border-white/15 bg-white/5 p-3.5 text-sm text-white placeholder-white/40 outline-none focus:border-accent"
              />
              {recognitionRef.current && !isSubmitted && (
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  className={`absolute end-3 bottom-3 flex h-8 w-8 items-center justify-center rounded-lg transition ${
                    isListening ? "bg-rose-500 text-white animate-pulse" : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                  title={isListening ? t("Stop recording") : t("Voice dictation")}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
            </div>

            {!isSubmitted && (
              <button
                type="button"
                disabled={plainText.trim().length < 8}
                onClick={handleSubmitExplanation}
                className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-40 transition"
              >
                <Sparkles size={16} />
                <span>{t("Evaluate My Explanation")}</span>
              </button>
            )}

            {evaluation && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs">
                <div className="mb-2 font-medium">{evaluation.feedback}</div>
                {evaluation.matchedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-white/50">{t("Covered")}:</span>
                    {evaluation.matchedKeywords.map((kw) => (
                      <span key={kw} className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300 font-mono">
                        ✓ {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Post-Submission Feedback and Root-Cause Diagnostic */}
        {isSubmitted && (
          <div className="mt-4 space-y-3 animate-in fade-in duration-200">
            {/* Explanation box */}
            <div
              className={`rounded-xl border p-4 text-xs ${
                isCorrect
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-100"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold mb-1">
                {isCorrect ? <CheckCircle2 size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-rose-400" />}
                <span>{isCorrect ? t("Correct Insight") : t("Key Takeaway")}</span>
              </div>
              <p className="leading-relaxed opacity-90">{checkpoint.explanation}</p>
            </div>

            {/* Root cause prerequisite alert */}
            {!isCorrect && diagnostic?.rootCauseConcept && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <AlertTriangle size={15} className="text-amber-400" />
                  <span>{t("Root-Cause Prerequisite Refresher")}</span>
                </div>
                <p className="leading-relaxed text-amber-100/90">{diagnostic.recommendation}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              {!isCorrect && (
                <button
                  type="button"
                  onClick={() => onRewind(checkpoint.rewindOnFailSec)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white/90 hover:bg-white/10 transition"
                >
                  <RotateCcw size={14} />
                  <span>{t("Rewind {sec}s to review", { sec: checkpoint.rewindOnFailSec })}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onContinue}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-black hover:brightness-110 transition shadow-lg"
              >
                <Play size={14} fill="currentColor" />
                <span>{isCorrect ? t("Continue Lecture") : t("I Got It, Continue")}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
