import { useState } from "react";
import {
  ArrowLeft,
  HelpCircle,
  Play,
  Layers,
  ChevronRight,
  Plus,
  FolderPlus,
  FileText,
  BookOpen,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import type { BTRSubject } from "@/lib/education/corebtr-schedule";
import { resolveBTRPlayableUrl, type BTRLocalMediaFile } from "@/lib/education/btr-local-library";
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
  const [activeTab, setActiveTab] = useState<"Videos" | "Questions" | "Pearls" | "Workbooks">("Questions");
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

  const handleOpenPdf = (pdf: BTRLocalMediaFile) => {
    const url = resolveBTRPlayableUrl(pdf.fullPath);
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Header (Matching official CoreBTR App standard) */}
      <div className="flex flex-col gap-3 pb-4 border-b border-edge">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft size={16} />
              <span>Library</span>
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">{subject.name}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white/10 text-white/90 border border-white/15">
                Block {subject.blockNumber} • {subject.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-white/70 font-medium">
              <strong className="text-white font-bold">{completedItems}</strong> out of {totalItems} items
            </span>
            <span className="text-xs font-bold text-ink-muted bg-white/10 px-2.5 py-0.5 rounded-full border border-edge">
              {Math.round((completedItems / totalItems) * 100)}% completed
            </span>
            <button
              type="button"
              className="p-1 text-white/60 hover:text-white transition"
              title="Subject High-Yield Guide"
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-elevated rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent to-emerald-400 rounded-full w-[12%] transition-all duration-500" />
        </div>

        {/* Segmented Sub-Tabs: Videos | Questions | Pearls | Workbooks */}
        <div className="flex items-center gap-2 pt-2">
          {(["Videos", "Questions", "Pearls", "Workbooks"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-2xl text-xs font-bold transition ${
                activeTab === tab
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "bg-elevated/70 hover:bg-elevated text-white/70 hover:text-white border border-edge"
              }`}
            >
              {tab === "Workbooks" ? "Workbooks & Notes" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: QUESTIONS (Topic-wise QBank & Smart Modules) */}
      {activeTab === "Questions" && (
        <div className="flex flex-col gap-6">
          {/* Explore Topic-wise QBank */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">
              Explore Topic-wise QBank
            </span>

            <div className="flex flex-col gap-2">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => onStartQBank(topic.name)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-elevated/70 border border-edge hover:border-white/20 hover:bg-elevated transition cursor-pointer select-none group"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-ink-muted transition">
                      {topic.name}
                    </span>
                    <span className="text-xs text-white/60 mt-0.5">
                      {topic.completedQuestions}/{topic.totalQuestions} questions
                    </span>
                  </div>

                  <ChevronRight size={16} className="text-white/40 group-hover:text-ink-muted transition" />
                </div>
              ))}
            </div>
          </div>

          {/* Explore Smart Modules */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">
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
                  className="flex items-center justify-between p-4 rounded-2xl bg-elevated/70 border border-edge hover:border-white/20 hover:bg-elevated transition cursor-pointer select-none group"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-ink-muted transition">
                      {mod.title}
                    </span>
                    <span className="text-xs text-white/60 mt-0.5">{mod.count}</span>
                  </div>
                  <ChevronRight size={16} className="text-white/40 group-hover:text-ink-muted transition" />
                </div>
              ))}
            </div>
          </div>

          {/* Create Custom Module Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onCreateCustomModule}
              className="w-full py-3.5 rounded-2xl bg-white hover:bg-white/90 text-black font-semibold font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span>+ Create Custom Module for {subject.name}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: PEARLS (High-Yield Active Recall Flashcards) */}
      {activeTab === "Pearls" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 rounded-xl bg-elevated/70 p-1 border border-edge text-xs">
              {(["All", "Completed", "In Progress", "Not Viewed"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setPearlsFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                    pearlsFilter === filter
                      ? "bg-white text-black font-semibold shadow-xs"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onStudyAllPearls?.(filteredPearls)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-white/90 text-black font-semibold font-bold text-xs shadow-xs transition flex items-center gap-1.5"
            >
              <Play size={13} fill="currentColor" />
              <span>Study All {filteredPearls.length} Pearls</span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {filteredPearls.map((pearl) => (
              <div
                key={pearl.id}
                onClick={() => onSelectPearl(pearl)}
                className="flex items-center justify-between p-4 rounded-2xl bg-elevated/70 border border-edge hover:border-white/20 hover:bg-elevated transition cursor-pointer select-none group"
              >
                <div className="flex flex-col gap-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-ink-muted">
                      {pearl.code}
                    </span>
                    {pearl.is2VRecommended && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Sparkles size={10} /> #2VRecommended
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-ink-muted transition truncate">
                    {pearl.title}
                  </h4>
                  <p className="text-xs text-white/60 line-clamp-1">
                    {pearl.highYieldSummary}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                      pearl.status === "Completed"
                        ? "bg-white/15 text-white border-edge"
                        : pearl.status === "In Progress"
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-white/5 text-white/50 border-white/10"
                    }`}
                  >
                    {pearl.status}
                  </span>
                  <ChevronRight size={16} className="text-white/40 group-hover:text-ink-muted transition" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: VIDEOS (Matched Local Video Lectures) */}
      {activeTab === "Videos" && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">
              {subject.name} Lectures ({videos.length} Videos)
            </span>

            <div className="flex items-center gap-2">
              {unannotatedPdf && (
                <span className="text-xs text-ink-muted font-semibold bg-white/10 px-2.5 py-1 rounded-xl border border-edge">
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
                  className="rounded-2xl bg-elevated/70 border border-edge p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-white/20 hover:bg-elevated transition group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/90 border border-white/15">
                      <Play size={15} fill="currentColor" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-ink-muted transition">
                        {vid.title}
                      </h4>
                      <span className="text-[10px] text-white/60 mt-0.5 block">
                        {(((vid.sizeBytes ?? 0) / (1024 * 1024))).toFixed(0)} MB • Lecture
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-edge">
                    <button
                      type="button"
                      onClick={() => onLaunchWorkstation(vid, unannotatedPdf, annotatedPdf)}
                      className="flex-1 py-1.5 rounded-xl bg-white hover:bg-white/90 text-black font-semibold font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Layers size={12} />
                      <span>Workstation</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPlayVideo(vid)}
                      className="flex-1 py-1.5 rounded-xl bg-elevated hover:bg-raised border border-edge text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Play</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-elevated border border-edge text-center gap-2">
              <FolderPlus size={24} className="text-white/40" />
              <span className="text-xs font-bold text-white">No local video files linked yet for {subject.name}</span>
              <span className="text-[11px] text-white/60 max-w-sm">
                Click &quot;Switch / Rescan Folder&quot; in the left dock to match your local CoreBTR video folders.
              </span>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: WORKBOOKS & NOTES (1-Click Local PDF Integration) */}
      {activeTab === "Workbooks" && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">
              {subject.name} Workbooks & Annotated Lecture Notes
            </span>
            <span className="text-xs text-ink-muted font-semibold bg-white/10 px-2.5 py-1 rounded-xl border border-edge">
              Offline PDF Engine
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unannotated Workbook Card */}
            <div className="p-5 rounded-2xl bg-elevated/70 border border-edge flex flex-col justify-between gap-4 shadow-sm hover:border-white/20 transition">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-ink-muted bg-white/10 px-2.5 py-0.5 rounded-full border border-edge">
                    <BookOpen size={13} />
                    <span>Unannotated Workbook</span>
                  </span>
                  {unannotatedPdf ? (
                    <span className="text-[10px] font-bold text-white/80 bg-white/10 px-2 py-0.5 rounded border border-white/15">
                      {((unannotatedPdf.sizeBytes ?? 0) / (1024 * 1024)).toFixed(0)} MB
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/50">Auto-linking</span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white">
                  {subject.name} Blank Active-Recall Workbook
                </h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  Fill-in-the-blank clinical tables and diagrams. Designed to be annotated side-by-side with Dr. Zainab Vora's lecture video.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-edge">
                {unannotatedPdf ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenPdf(unannotatedPdf)}
                      className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink size={13} />
                      <span>Open PDF</span>
                    </button>
                    {videos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onLaunchWorkstation(videos[0], unannotatedPdf, annotatedPdf)}
                        className="flex-1 py-2 rounded-xl bg-white hover:bg-white/90 text-black font-semibold font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                      >
                        <Layers size={13} />
                        <span>Dual Workstation</span>
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onStartQBank()}
                    className="w-full py-2 rounded-xl bg-white hover:bg-white/90 text-black font-semibold font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>Practice Topic MCQs</span>
                  </button>
                )}
              </div>
            </div>

            {/* Annotated Notes Card */}
            <div className="p-5 rounded-2xl bg-elevated/70 border border-edge flex flex-col justify-between gap-4 shadow-sm hover:border-white/20 transition">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    <FileText size={13} />
                    <span>Annotated Master Notes</span>
                  </span>
                  {annotatedPdf ? (
                    <span className="text-[10px] font-bold text-white/80 bg-white/10 px-2 py-0.5 rounded border border-white/15">
                      {((annotatedPdf.sizeBytes ?? 0) / (1024 * 1024)).toFixed(0)} MB
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/50">Full Notes</span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white">
                  {subject.name} Complete Handwritten Notes
                </h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  Comprehensive high-yield notes covering all {subject.highYieldPytCount} Previous Year Topics (PYTs) with handwritten examiner traps.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-edge">
                {annotatedPdf ? (
                  <button
                    type="button"
                    onClick={() => handleOpenPdf(annotatedPdf)}
                    className="w-full py-2 rounded-xl bg-white hover:bg-white/90 text-black font-semibold font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    <FileText size={13} />
                    <span>View Annotated Notes</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onStartQBank()}
                    className="w-full py-2 rounded-xl bg-white hover:bg-white/90 text-black font-semibold font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>Explore PYTs</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* High-Yield Must-Know Topic Pillars */}
          <div className="flex flex-col gap-3 p-5 rounded-2xl bg-elevated border border-edge">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">
              High-Yield Pillars & Examiner Trap Radar ({subject.mustKnowTopics.length} Topics)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {subject.mustKnowTopics.map((topic, idx) => (
                <div
                  key={idx}
                  onClick={() => onStartQBank(topic)}
                  className="p-3 rounded-xl bg-elevated/80 border border-edge hover:border-white/20 text-xs text-white/90 hover:text-white transition flex items-center justify-between cursor-pointer group"
                >
                  <span className="truncate pr-2">{topic}</span>
                  <ChevronRight size={13} className="text-white/40 group-hover:text-ink-muted shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
