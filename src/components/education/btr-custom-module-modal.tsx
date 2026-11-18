import { useState } from "react";
import {
  SlidersHorizontal,
  X,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Check,
  BookOpen,
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
  selectedSubjects?: string[];
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

const ALL_19_SUBJECTS = [
  "Anatomy",
  "Physiology",
  "Biochemistry",
  "Pathology",
  "Pharmacology",
  "Microbiology",
  "Forensic Medicine",
  "Community Medicine (PSM)",
  "General Medicine",
  "General Surgery",
  "Obstetrics & Gynecology",
  "Pediatrics",
  "Orthopedics",
  "Dermatology",
  "Psychiatry",
  "Radiology",
  "ENT",
  "Ophthalmology",
  "Anesthesia",
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
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    subjectName ? [subjectName] : ALL_19_SUBJECTS,
  );

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const toggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub],
    );
  };

  const handleSelectAllSubjects = () => {
    setSelectedSubjects(ALL_19_SUBJECTS);
  };

  const handleClearAllSubjects = () => {
    setSelectedSubjects([]);
  };

  const handleStart = () => {
    onStartModule({
      name: subjectName
        ? `${subjectName} Custom Drill`
        : selectedSubjects.length === 1
        ? `${selectedSubjects[0]} Custom Drill`
        : `CoreBTR Custom Module (${selectedSubjects.length} Subjects)`,
      questionCount,
      pool,
      attemptStatus,
      bookmarksOnly,
      selectedTags,
      selectedSubjects,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-surface border border-edge text-white shadow-2xl flex flex-col p-6 gap-6">
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
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15">
                    {subjectName}
                  </span>
                )}
              </h2>
              <span className="text-xs text-white/60">
                Dr. Zainab Vora High-Yield Targeting & Question Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-ink-muted bg-white/10 px-3 py-1.5 rounded-xl border border-edge">
            <SlidersHorizontal size={14} />
            <span>Target: {questionCount} Qs</span>
          </div>
        </div>

        {/* Previous Custom Module Card (matching official app screenshot) */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-elevated border border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white/70">Your previous custom module</span>
            <span className="flex items-center gap-1 font-mono text-[10.5px] font-bold text-ink-muted bg-white/10 px-2.5 py-0.5 rounded-full border border-edge">
              <CheckCircle2 size={11} /> Completed
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div>
              <span className="text-sm font-bold text-white block">
                Custom Module 05.05.2026
              </span>
              <span className="text-xs text-white/60 flex items-center gap-2 mt-0.5">
                <span>⏱ 50 questions</span>
                <span>•</span>
                <span>📝 TCS iON CBT Mode</span>
              </span>
            </div>
            <span className="text-[11px] text-white/40 flex items-center gap-1">
              <Calendar size={12} /> Created: 5th May, 3:55 PM
            </span>
          </div>
        </div>

        {/* Section 0: Subject Selection Grid */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
              <BookOpen size={13} className="text-ink-muted" />
              <span>Target Subjects ({selectedSubjects.length} of 19 Selected)</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllSubjects}
                className="text-[11px] font-bold text-ink-muted hover:text-white transition"
              >
                Select All 19
              </button>
              <span className="text-white/30">•</span>
              <button
                type="button"
                onClick={handleClearAllSubjects}
                className="text-[11px] font-medium text-white/50 hover:text-white transition"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-3 rounded-2xl bg-elevated border border-white/10 max-h-48 overflow-y-auto">
            {ALL_19_SUBJECTS.map((sub) => {
              const isSelected = selectedSubjects.includes(sub);
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => toggleSubject(sub)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[11.5px] font-medium transition text-start border ${
                    isSelected
                      ? "bg-white text-black font-semibold border-white/20 shadow-xs"
                      : "bg-white/[0.03] text-white/70 border-white/5 hover:bg-white/[0.08]"
                  }`}
                >
                  <span className="truncate">{sub}</span>
                  {isSelected && <Check size={12} className="shrink-0 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 1: Question Pool */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-white/70">
            Question Pool
          </span>
          <div className="flex flex-col gap-2 rounded-2xl bg-elevated border border-white/10 p-3">
            {[
              {
                key: "qbank" as const,
                label: "QBank (including PYQs)",
                val: pool.qbank,
              },
              {
                key: "pyqs" as const,
                label: "PYQs Only (NEET-PG & INI-CET Recalls)",
                val: pool.pyqs,
              },
              {
                key: "attemptedTests" as const,
                label: "Attempted Test Qs (including Grand Tests 1-9)",
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
                  className="h-4 w-4 rounded accent-white cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Section 2: Attempt Status */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-white/70">
            Attempt Status
          </span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "correct" as const, label: "Correct", val: attemptStatus.correct },
              { key: "incorrect" as const, label: "Incorrect (High Priority)", val: attemptStatus.incorrect },
              { key: "notAnswered" as const, label: "Not Answered", val: attemptStatus.notAnswered },
              { key: "notAttemptedYet" as const, label: "Not Attempted Yet", val: attemptStatus.notAttemptedYet },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl bg-elevated border border-white/10 hover:bg-elevated/80 cursor-pointer transition select-none"
              >
                <span className="text-xs font-medium text-white/90">{item.label}</span>
                <input
                  type="checkbox"
                  checked={item.val}
                  onChange={(e) =>
                    setAttemptStatus((prev) => ({ ...prev, [item.key]: e.target.checked }))
                  }
                  className="h-4 w-4 rounded accent-white cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Section 3: Other Filters */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-white/70">
            Other Filters
          </span>
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-elevated border border-white/10 hover:bg-elevated/80 cursor-pointer transition select-none">
            <span className="text-xs font-medium text-white/90">
              Use only Bookmarked Questions (FSRS Spaced Repetition Vault)
            </span>
            <input
              type="checkbox"
              checked={bookmarksOnly}
              onChange={(e) => setBookmarksOnly(e.target.checked)}
              className="h-4 w-4 rounded accent-white cursor-pointer"
            />
          </label>
        </div>

        {/* Section 4: Question Tags */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/70">
              High-Yield Tags & Yield Filters
            </span>
            {selectedTags.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTags([])}
                className="text-[11px] font-semibold text-ink-muted hover:text-white transition"
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
                      ? "bg-white text-black font-semibold border-white/20 shadow-xs"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {isSelected && <Check size={12} className="text-amber-400" />}
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
            {[10, 25, 50, 100, 200].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setQuestionCount(num)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition border ${
                  questionCount === num
                    ? "bg-white text-black font-semibold border-white/20"
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
          className="w-full py-3.5 rounded-2xl bg-white hover:bg-white/90 text-black font-semibold font-extrabold text-sm tracking-wide shadow-lg shadow-black/40 transition flex items-center justify-center gap-2"
        >
          <span>Start Custom Module ({questionCount} Qs)</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
