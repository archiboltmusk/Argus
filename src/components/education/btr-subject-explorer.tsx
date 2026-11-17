import { useState } from "react";
import {
  ArrowLeft,
  HelpCircle,
  Play,
  Layers,
  ChevronRight,
  Plus,
  FolderPlus,
} from "lucide-react";
import type { BTRSubject } from "@/lib/education/corebtr-schedule";
import type { BTRLocalMediaFile } from "@/lib/education/btr-local-library";
import {
  BTR_TOPIC_WISE_QBANK,
  BTR_PEARLS_DATABASE,
  type BTRPearlItem,
} from "@/lib/education/btr-pearls-data";

interface BTRSubjectExplorerProps {
  subject: BTRSubject;
  onBack: () => void;
  onStartQBank: (topicName?: string) => void;
  onCreateCustomModule: () => void;
  onPlayVideo: (video: BTRLocalMediaFile) => void;
  onLaunchWorkstation: (video: BTRLocalMediaFile, unannotatedPdf?: BTRLocalMediaFile, annotatedPdf?: BTRLocalMediaFile) => void;
  videos: BTRLocalMediaFile[];
  unannotatedPdf?: BTRLocalMediaFile;
  annotatedPdf?: BTRLocalMediaFile;
  onSelectPearl: (pearl: BTRPearlItem) => void;
  onStudyAllPearls?: (pearls: BTRPearlItem[]) => void;
}

export function BTRSubjectExplorer({
  subject,
  onBack,
  onStartQBank,
  onCreateCustomModule,
  onPlayVideo,
  onLaunchWorkstation,
  videos,
  unannotatedPdf,
  annotatedPdf,
  onSelectPearl,
  onStudyAllPearls,
}: BTRSubjectExplorerProps) {
  const [activeTab, setActiveTab] = useState<"Videos" | "Questions" | "Pearls">("Questions");
  const [pearlsFilter, setPearlsFilter] = useState<"All" | "Completed" | "In Progress" | "Not Viewed">("All");

  // Topic-wise QBank topics for this subject
  const topics = BTR_TOPIC_WISE_QBANK[subject.id] || subject.mustKnowTopics.map((t, i) => ({
    id: `topic_${i}`,
    name: t,
    totalQuestions: 25 + (i * 5),
    completedQuestions: Math.min(25, i * 2),
  }));

  // Pearls for this subject
  const pearls = BTR_PEARLS_DATABASE[subject.id] || subject.pyramidTiers.tier1MustKnow.map((t, i) => ({
    id: `pearl_${i}`,
    code: `P-${80000000 + i * 111111}`,
    subjectId: subject.id,
    title: t,
    highYieldSummary: `High-yield BTR recall pearl for ${t}. High predictive accuracy for INI-CET and NEET-PG.`,
    status: (i === 0 ? "Completed" : i === 1 ? "In Progress" : "Not Viewed") as "Completed" | "In Progress" | "Not Viewed",
    is2VRecommended: true,
  }));

  const filteredPearls = pearls.filter((p) => {
    if (pearlsFilter === "All") return true;
    return p.status === pearlsFilter;
  });

  const totalItems = 170 + subject.highYieldPytCount;
  const completedItems = Math.min(totalItems, Math.round(totalItems * 0.04));

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Header (Matching screenshot media_1794864389389) */}
      <div className="flex flex-col gap-3 pb-4 border-b border-edge-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-elevated text-ink-muted hover:text-ink transition flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft size={16} />
              <span>Library</span>
            </button>
            <h2 className="text-xl font-black text-ink">{subject.name}</h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-muted font-medium">
              <strong className="text-ink font-bold">{completedItems}</strong> out of {totalItems} items
            </span>
            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/15 px-2.5 py-0.5 rounded-full border border-indigo-500/25">
              4% completed
            </span>
            <button
              type="button"
              className="p-1 text-ink-muted hover:text-ink transition"
              title="Subject High-Yield Guide"
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-elevated rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full w-[4%] transition-all duration-500" />
        </div>

        {/* Segmented Sub-Tabs: Videos | Questions | Pearls */}
        <div className="flex items-center gap-2 pt-2">
          {(["Videos", "Questions", "Pearls"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-2xl text-xs font-bold transition ${
                activeTab === tab
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-surface hover:bg-elevated text-ink-muted hover:text-ink border border-edge-soft"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: QUESTIONS (Topic-wise QBank & Smart Modules) */}
      {activeTab === "Questions" && (
        <div className="flex flex-col gap-6">
          {/* Explore Topic-wise QBank */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Explore Topic-wise QBank
            </span>

            <div className="flex flex-col gap-2">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => onStartQBank(topic.name)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-edge-soft hover:border-indigo-500/40 hover:bg-elevated transition cursor-pointer select-none group"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-ink group-hover:text-indigo-400 transition">
                      {topic.name}
                    </span>
                    <span className="text-xs text-ink-muted mt-0.5">
                      {topic.completedQuestions}/{topic.totalQuestions} questions
                    </span>
                  </div>

                  <ChevronRight size={16} className="text-ink-muted group-hover:text-indigo-400 transition" />
                </div>
              ))}
            </div>
          </div>

          {/* Explore Smart Modules */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Explore Smart Modules
            </span>

            <div className="flex flex-col gap-2">
              {[
                { title: "PYQs", count: "3/67 questions", action: () => onStartQBank("PYQs") },
                { title: "#2VRecommended Qs", count: "2/30 questions", action: () => onStartQBank("#2VRecommended Qs") },
                { title: "Your Attempted Test Qs", count: "4/4 questions", action: () => onStartQBank("Attempted Test Qs") },
              ].map((mod) => (
                <div
                  key={mod.title}
                  onClick={mod.action}
                  className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-edge-soft hover:border-indigo-500/40 hover:bg-elevated transition cursor-pointer select-none group"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-ink group-hover:text-indigo-400 transition">
                      {mod.title}
                    </span>
                    <span className="text-xs text-ink-muted mt-0.5">{mod.count}</span>
                  </div>
                  <ChevronRight size={16} className="text-ink-muted group-hover:text-indigo-400 transition" />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Floating CTA Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onCreateCustomModule}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span>+ Create Custom Module</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: PEARLS (2-Column Grid of High-Yield Pearls) */}
      {activeTab === "Pearls" && (
        <div className="flex flex-col gap-6">
          {/* Sub-Filters: All | Completed | In Progress | Not Viewed */}
          <div className="flex flex-wrap items-center gap-2">
            {(["All", "Completed", "In Progress", "Not Viewed"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setPearlsFilter(filter)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                  pearlsFilter === filter
                    ? "bg-indigo-600 text-white border-indigo-400"
                    : "bg-surface hover:bg-elevated text-ink-muted hover:text-ink border-edge-soft"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* 2-Column Responsive Grid of Pearl Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredPearls.map((pearl) => (
              <div
                key={pearl.id}
                onClick={() => onSelectPearl(pearl)}
                className="flex flex-col justify-between gap-3 p-4 rounded-2xl bg-surface border border-edge-soft hover:border-indigo-500/40 hover:bg-elevated transition cursor-pointer select-none group"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10.5px] font-bold text-ink-muted">
                      {pearl.code}
                    </span>
                    <span
                      className={`text-[9.5px] font-bold px-2 py-0.2 rounded-full border ${
                        pearl.status === "Completed"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                          : pearl.status === "In Progress"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                            : "bg-elevated text-ink-muted border-edge-soft"
                      }`}
                    >
                      {pearl.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-ink group-hover:text-indigo-400 transition leading-snug">
                    {pearl.title}
                  </h4>
                  <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                    {pearl.highYieldSummary}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-edge-soft text-[11px] text-ink-muted">
                  <span className="text-indigo-400 font-semibold">BTR 2V-Yield Pearl</span>
                  <span className="group-hover:translate-x-0.5 transition">View & Study →</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Floating CTA Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (filteredPearls.length > 0) {
                  if (onStudyAllPearls) {
                    onStudyAllPearls(filteredPearls);
                  } else {
                    onSelectPearl(filteredPearls[0]);
                  }
                }
              }}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              <Play size={14} fill="currentColor" />
              <span>Study all Pearls</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: VIDEOS (Matched Local Video Lectures) */}
      {activeTab === "Videos" && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              {subject.name} Lectures ({videos.length} Videos)
            </span>

            <div className="flex items-center gap-2">
              {unannotatedPdf && (
                <span className="text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-2.5 py-1 rounded-xl border border-indigo-500/20">
                  Workbook Available
                </span>
              )}
            </div>
          </div>

          {videos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {videos.map((vid) => (
                <div
                  key={vid.id}
                  className="rounded-2xl bg-surface border border-edge-soft p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-indigo-500/40 transition group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/25">
                      <Play size={15} fill="currentColor" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-ink truncate group-hover:text-indigo-400 transition">
                        {vid.title}
                      </h4>
                      <span className="text-[10px] text-ink-muted mt-0.5 block">
                        {(((vid.sizeBytes ?? 0) / (1024 * 1024))).toFixed(0)} MB • Lecture
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-edge-soft">
                    <button
                      type="button"
                      onClick={() => onLaunchWorkstation(vid, unannotatedPdf, annotatedPdf)}
                      className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Layers size={12} />
                      <span>Workstation</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPlayVideo(vid)}
                      className="flex-1 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Play</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-surface border border-edge-soft text-center gap-2">
              <FolderPlus size={24} className="text-ink-muted" />
              <span className="text-xs font-bold text-ink">No local video files linked yet for {subject.name}</span>
              <span className="text-[11px] text-ink-muted max-w-sm">
                Click &quot;Switch / Rescan Folder&quot; in the left dock to match your local CoreBTR video folders.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
