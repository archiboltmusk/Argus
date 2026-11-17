import { useState } from "react";
import { X, Check, Target, ChevronRight } from "lucide-react";

export interface BTRGoalOption {
  id: string;
  name: string;
  badge: string;
  examMonth: string;
  countdownDays: number;
  pattern: string;
  markingScheme: string;
  dailyMcqTarget: number;
  focusMessage: string;
}

export const BTR_GOAL_PRESETS: BTRGoalOption[] = [
  {
    id: "combined",
    name: "NEET, INI-CET & FMGE (Master Integrated)",
    badge: "Official Recommended",
    examMonth: "May 2026 - March 2027",
    countdownDays: 178,
    pattern: "19 Subjects • 200 Questions",
    markingScheme: "Combined High-Yield Core",
    dailyMcqTarget: 100,
    focusMessage: "Master all 19 subjects with 20th Subject Volatiles and Dr. Zainab Vora pyramids.",
  },
  {
    id: "inicet",
    name: "INI-CET May / Nov 2026",
    badge: "AIIMS / JIPMER / PGI Focus",
    examMonth: "17th May 2026",
    countdownDays: 62,
    pattern: "200 Questions • 180 Minutes",
    markingScheme: "+1 Correct, -0.33 Negative",
    dailyMcqTarget: 120,
    focusMessage: "High-yield multi-step clinical reasoning, histopath spotters, and recent AIIMS repeats.",
  },
  {
    id: "neetpg",
    name: "NEET-PG 2027",
    badge: "National Board (NBE)",
    examMonth: "March 2027",
    countdownDays: 295,
    pattern: "200 Questions • 210 Minutes",
    markingScheme: "+4 Correct, -1 Negative",
    dailyMcqTarget: 100,
    focusMessage: "Direct volatile tables, high-yield classification numbers, and standard image spotters.",
  },
  {
    id: "fmge",
    name: "FMGE Screening Examination",
    badge: "NBE Passing Target",
    examMonth: "14th June 2026",
    countdownDays: 90,
    pattern: "300 Questions • 300 Minutes",
    markingScheme: "+1 Correct, No Negative (Pass: 150/300)",
    dailyMcqTarget: 80,
    focusMessage: "High-yield one-liners, must-know drugs of choice, and basic clinical diagnostic signs.",
  },
];

interface BTRGoalSelectorModalProps {
  open: boolean;
  onClose: () => void;
  selectedGoalId: string;
  onSelectGoal: (goal: BTRGoalOption) => void;
}

export function BTRGoalSelectorModal({
  open,
  onClose,
  selectedGoalId,
  onSelectGoal,
}: BTRGoalSelectorModalProps) {
  const [activeId, setActiveId] = useState(selectedGoalId);

  if (!open) return null;

  const handleConfirm = (goal: BTRGoalOption) => {
    setActiveId(goal.id);
    onSelectGoal(goal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#0d1b4b] border border-[#1767be]/30 shadow-2xl p-6 flex flex-col gap-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1767be]/20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#1767be]/20 border border-[#1767be]/30 text-[#4da2ff] flex items-center justify-center">
              <Target size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Select Your Target Goal</h3>
              <p className="text-xs text-[#4da2ff]">
                Customizes countdown timers, QBank marking rules, and daily target pacing.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Goal Preset Cards */}
        <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {BTR_GOAL_PRESETS.map((goal) => {
            const isSelected = activeId === goal.id;
            return (
              <div
                key={goal.id}
                onClick={() => handleConfirm(goal)}
                className={`p-4 rounded-2xl border transition cursor-pointer select-none flex flex-col gap-2.5 ${
                  isSelected
                    ? "bg-[#1767be]/25 border-[#1767be] shadow-md ring-1 ring-[#1767be]/50"
                    : "bg-[#1d204b] border-[#1767be]/15 hover:border-[#1767be]/40 hover:bg-[#25285a]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{goal.name}</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#1767be]/20 text-[#4da2ff] border border-[#1767be]/30">
                        {goal.badge}
                      </span>
                    </div>
                    <span className="text-xs text-[#4da2ff]/80 mt-0.5">
                      {goal.pattern} • {goal.markingScheme}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {goal.countdownDays}d left
                      </span>
                      <span className="text-[10px] text-white/50 block">{goal.examMonth}</span>
                    </div>
                    {isSelected ? (
                      <div className="h-6 w-6 rounded-full bg-[#1767be] text-white flex items-center justify-center shrink-0">
                        <Check size={14} />
                      </div>
                    ) : (
                      <ChevronRight size={16} className="text-white/40" />
                    )}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-xs text-white/70 leading-relaxed">
                  {goal.focusMessage}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1767be]/20 text-xs text-white/50">
          <span>Goals can be updated anytime without losing test history.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
