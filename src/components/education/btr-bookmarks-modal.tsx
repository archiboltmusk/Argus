import { useState } from "react";
import {
  X,
  Bookmark,
  Sparkles,
  Play,
  Trash2,
  ChevronRight,
} from "lucide-react";
import type { BTRPearlItem } from "@/lib/education/btr-pearls-data";
import { BTR_PEARLS_DATABASE } from "@/lib/education/btr-pearls-data";

interface BTRBookmarksModalProps {
  open: boolean;
  onClose: () => void;
  onStartQBankDrill?: (title: string) => void;
  onSelectPearl?: (pearl: BTRPearlItem) => void;
}

export function BTRBookmarksModal({
  open,
  onClose,
  onStartQBankDrill,
  onSelectPearl,
}: BTRBookmarksModalProps) {
  const [activeTab, setActiveTab] = useState<"questions" | "pearls">("questions");

  // Load bookmarked pearls or default to first 4 pearls from database
  const [bookmarkedPearls, setBookmarkedPearls] = useState<BTRPearlItem[]>(() => {
    return Object.values(BTR_PEARLS_DATABASE).flat().slice(0, 4);
  });

  // Mock initial bookmarked questions
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<
    Array<{
      id: string;
      subject: string;
      topic: string;
      stem: string;
      correctAnswer: string;
      code: string;
    }>
  >([
    {
      id: "bm-q1",
      subject: "Orthopedics",
      topic: "Nerve Injuries",
      stem: "A patient presents with inability to extend the wrist and fingers after a humeral shaft fracture. What nerve is injured?",
      correctAnswer: "Radial Nerve (in spiral groove)",
      code: "Q-89412",
    },
    {
      id: "bm-q2",
      subject: "Radiology",
      topic: "Chest HRCT",
      stem: "Crazy paving appearance on HRCT chest is pathognomonic of which condition?",
      correctAnswer: "Pulmonary Alveolar Proteinosis (PAP)",
      code: "Q-17382",
    },
    {
      id: "bm-q3",
      subject: "Psychiatry",
      topic: "Paraphilias",
      stem: "A person derives sexual arousal only from touching non-living objects (shoes/undergarments). Diagnosis?",
      correctAnswer: "Fetishism",
      code: "Q-45920",
    },
  ]);

  if (!open) return null;

  const handleRemoveQuestion = (id: string) => {
    setBookmarkedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleRemovePearl = (id: string) => {
    setBookmarkedPearls((prev) => prev.filter((p) => p.id !== id));
  };

  const handleLaunchSprint = () => {
    onClose();
    onStartQBankDrill?.("Bookmarked Questions Sprint");
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#0d1b4b] border border-[#1767be]/30 shadow-2xl p-6 flex flex-col gap-5 text-white max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1767be]/20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Bookmark size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Your Bookmarked Vault</h3>
              <p className="text-xs text-[#4da2ff]">
                Starred questions & high-yield pearls saved for rapid last-mile revision.
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

        {/* Tabs & Launch Button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#1d204b] border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("questions")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "questions"
                  ? "bg-[#1767be] text-white shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Questions ({bookmarkedQuestions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pearls")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "pearls"
                  ? "bg-[#1767be] text-white shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Pearls ({bookmarkedPearls.length})
            </button>
          </div>

          {activeTab === "questions" && bookmarkedQuestions.length > 0 && (
            <button
              type="button"
              onClick={handleLaunchSprint}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow transition flex items-center gap-1.5"
            >
              <Play size={12} fill="currentColor" />
              <span>Practice Bookmarks Sprint</span>
            </button>
          )}
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {activeTab === "questions" ? (
            bookmarkedQuestions.length > 0 ? (
              bookmarkedQuestions.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl bg-[#1d204b] border border-white/10 hover:border-[#1767be]/40 transition flex flex-col gap-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#1767be]/20 text-[#4da2ff]">
                        {q.code}
                      </span>
                      <span className="text-xs font-bold text-white/80">
                        {q.subject} • {q.topic}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="p-1 rounded-lg text-white/40 hover:text-rose-400 transition"
                      title="Remove Bookmark"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <p className="text-xs text-white/90 leading-relaxed font-medium">
                    {q.stem}
                  </p>

                  <div className="text-[11px] text-emerald-300 font-semibold pt-1 border-t border-white/5 flex items-center justify-between">
                    <span>Key Answer: {q.correctAnswer}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-white/50 gap-2">
                <Bookmark size={24} />
                <span className="text-xs font-semibold">No questions bookmarked yet</span>
                <span className="text-[11px] text-white/40">
                  Tap the bookmark star during any QBank drill to save questions here.
                </span>
              </div>
            )
          ) : bookmarkedPearls.length > 0 ? (
            bookmarkedPearls.map((pearl) => (
              <div
                key={pearl.id}
                onClick={() => {
                  onClose();
                  onSelectPearl?.(pearl);
                }}
                className="p-4 rounded-2xl bg-[#1d204b] border border-white/10 hover:border-[#1767be]/40 hover:bg-[#25285a] transition cursor-pointer select-none flex flex-col gap-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#1767be]/20 text-[#4da2ff]">
                      {pearl.code}
                    </span>
                    <span className="text-xs font-bold text-white/80 uppercase">
                      {pearl.subjectId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePearl(pearl.id);
                      }}
                      className="p-1 rounded-lg text-white/40 hover:text-rose-400 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                    <ChevronRight size={14} className="text-white/40 group-hover:text-[#4da2ff] transition" />
                  </div>
                </div>

                <h4 className="text-xs font-bold text-white group-hover:text-[#4da2ff] transition">
                  {pearl.title}
                </h4>

                <p className="text-[11px] text-white/70 line-clamp-2">
                  {pearl.highYieldSummary}
                </p>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-white/50 gap-2">
              <Sparkles size={24} />
              <span className="text-xs font-semibold">No pearls bookmarked yet</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1767be]/20 text-xs text-white/50">
          <span>Bookmarks sync with FSRS Spaced Repetition queue.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
