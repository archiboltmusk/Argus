import { useState } from "react";
import {
  SlidersHorizontal,
  X,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Check,
} from "lucide-react";

export interface CustomModuleConfig {
  name: string;
  questionCount: number;
  pool: {
    qbank: boolean;
    pyqs: boolean;
    attemptedTests: boolean;
  };
  attemptStatus: {
    correct: boolean;
    incorrect: boolean;
    notAnswered: boolean;
    notAttemptedYet: boolean;
  };
  bookmarksOnly: boolean;
  selectedTags: string[];
}

interface BTRCustomModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartModule: (config: CustomModuleConfig) => void;
  subjectName?: string;
}

const AVAILABLE_TAGS = [
  "Path_Images",
  "Rad_Images",
  "Formulae_Numbers",
  "Syndromes",
  "Scores_Classifications",
  "Controversial",
  "Instruments",
  "Investigation_Based",
  "#2VRecommended",
  "Investigation",
];

export function BTRCustomModuleModal({
  isOpen,
  onClose,
  onStartModule,
  subjectName,
}: BTRCustomModuleModalProps) {
  const [questionCount, setQuestionCount] = useState(50);
  const [pool, setPool] = useState({
    qbank: true,
    pyqs: true,
    attemptedTests: true,
  });
  const [attemptStatus, setAttemptStatus] = useState({
    correct: true,
    incorrect: true,
    notAnswered: true,
    notAttemptedYet: true,
  });
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "Path_Images",
    "Rad_Images",
    "Formulae_Numbers",
    "#2VRecommended",
  ]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleStart = () => {
    onStartModule({
      name: subjectName ? `${subjectName} Custom Drill` : "CoreBTR Custom Module",
      questionCount,
      pool,
      attemptStatus,
      bookmarksOnly,
      selectedTags,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0e0f1a] border border-indigo-500/30 text-white shadow-2xl flex flex-col p-6 gap-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              <X size={18} />
            </button>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Create Custom Module
                {subjectName && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {subjectName}
                  </span>
                )}
              </h2>
              <span className="text-xs text-white/50">
                Dr. Zainab Vora High-Yield Targeting & Question Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/25">
            <SlidersHorizontal size={14} />
            <span>Target: {questionCount} Qs</span>
          </div>
        </div>

        {/* Previous Custom Module Card (matching official app screenshot) */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white/70">Your previous custom module</span>
            <span className="flex items-center gap-1 font-mono text-[10.5px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <CheckCircle2 size={11} /> Completed
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div>
              <span className="text-sm font-bold text-white block">
                Custom Module 05.05.2026
              </span>
              <span className="text-xs text-white/50 flex items-center gap-2 mt-0.5">
                <span>⏱ 50 questions</span>
                <span>•</span>
                <span>📝 Exam Mode</span>
              </span>
            </div>
            <span className="text-[11px] text-white/40 flex items-center gap-1">
              <Calendar size={12} /> Created: 5th May, 3:55 PM
            </span>
          </div>
        </div>

        {/* Section 1: Question Pool */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-white/60">
            Question Pool
          </span>
          <div className="flex flex-col gap-2 rounded-2xl bg-white/5 border border-white/10 p-3">
            {[
              {
                key: "qbank" as const,
                label: "QBank (including PYQs)",
                val: pool.qbank,
              },
              {
                key: "pyqs" as const,
                label: "PYQs Only",
                val: pool.pyqs,
              },
              {
                key: "attemptedTests" as const,
                label: "Attempted Test Qs (including GTs)",
                val: pool.attemptedTests,
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition select-none"
              >
                <span className="text-xs font-medium text-white/90">{item.label}</span>
                <input
                  type="checkbox"
                  checked={item.val}
                  onChange={(e) =>
                    setPool((prev) => ({ ...prev, [item.key]: e.target.checked }))
                  }
                  className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Section 2: Attempt Status */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-white/60">
            Attempt Status
          </span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "correct" as const, label: "Correct", val: attemptStatus.correct },
              { key: "incorrect" as const, label: "Incorrect", val: attemptStatus.incorrect },
              { key: "notAnswered" as const, label: "Not Answered", val: attemptStatus.notAnswered },
              { key: "notAttemptedYet" as const, label: "Not Attempted Yet", val: attemptStatus.notAttemptedYet },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition select-none"
              >
                <span className="text-xs font-medium text-white/90">{item.label}</span>
                <input
                  type="checkbox"
                  checked={item.val}
                  onChange={(e) =>
                    setAttemptStatus((prev) => ({ ...prev, [item.key]: e.target.checked }))
                  }
                  className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Section 3: Other Filters */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-white/60">
            Other Filters
          </span>
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition select-none">
            <span className="text-xs font-medium text-white/90">
              Use only Bookmarked Questions (FSRS Vault)
            </span>
            <input
              type="checkbox"
              checked={bookmarksOnly}
              onChange={(e) => setBookmarksOnly(e.target.checked)}
              className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
            />
          </label>
        </div>

        {/* Section 4: Question Tags */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">
              Question Tags
            </span>
            {selectedTags.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTags([])}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-sm"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {isSelected && <Check size={12} />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Count Selector */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-medium text-white/70">Number of Questions:</span>
          <div className="flex items-center gap-2">
            {[25, 50, 100].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setQuestionCount(num)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition border ${
                  questionCount === num
                    ? "bg-indigo-600 text-white border-indigo-400"
                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                }`}
              >
                {num} Qs
              </button>
            ))}
          </div>
        </div>

        {/* Bottom CTA Button */}
        <button
          type="button"
          onClick={handleStart}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
