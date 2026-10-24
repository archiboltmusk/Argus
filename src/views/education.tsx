import { useState, useMemo, useCallback, useRef, type ChangeEvent } from "react";
import {
  GraduationCap,
  FolderPlus,
  Rss,
  FileText,
  Play,
  BookOpen,
  Share2,
  Check,
  Search,
  ExternalLink,
  Trash2,
  Copy,
  Sparkles,
  Download,
  Upload,
  AlertCircle,
  Zap,
  Database,
  Layers,
  Flame,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useView } from "@/lib/view";
import { useSettings } from "@/lib/settings";
import { useLocalLibrary, type LocalEntry } from "@/lib/local-library";
import { localPlayerSrc } from "@/lib/local-library/player-src";
import { CURATED_COURSES } from "@/lib/education/catalogs";
import type { CourseCategory, CuratedCourse, StudyNote } from "@/lib/education/types";
import {
  useStudyNotes,
  deleteStudyNote,
  exportNotesAsMarkdown,
  exportNotesAsJson,
  getDueStudyNotes,
} from "@/lib/education/notes";
import { importEducationalFile } from "@/lib/education/json-gz-importer";
import { registerCourseShare } from "@/lib/local-library/course-share";
import { generateAnkiDeckPackage } from "@/lib/education/anki-exporter";
import { InicetWarRoomBanner } from "./education/inicet-war-room-banner";
import { DailyWateringDeck } from "./education/daily-watering-deck";
import { QBankRunner } from "./education/qbank-drill";
import { QBankManager } from "./education/qbank-manager";
import { Row } from "@/components/row";

export function EducationView() {
  const t = useT();
  const { openPlayer, openSettings } = useView();
  const { settings, update } = useSettings();
  const localEntries = useLocalLibrary();
  const notes = useStudyNotes();

  const [activeCategory, setActiveCategory] = useState<CourseCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [showWateringDeck, setShowWateringDeck] = useState(false);
  const [showQBank, setShowQBank] = useState(false);
  const [showQBankManager, setShowQBankManager] = useState(false);
  const [sharedTokens, setSharedTokens] = useState<Record<string, string>>({});
  const [copiedShareFolder, setCopiedShareFolder] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<{ success: boolean; message: string } | null>(null);
  const globalFileInputRef = useRef<HTMLInputElement>(null);

  const handleGlobalFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await importEducationalFile(file);
      if (res.success) {
        setImportNotice({
          success: true,
          message:
            res.type === "qbank"
              ? `Successfully imported QBank Pack "${res.title}" with ${res.count} questions!`
              : `Successfully imported ${res.count} study cards and notes into your deck!`,
        });
      } else {
        setImportNotice({
          success: false,
          message: res.error || "Failed to parse educational JSON / GZ file.",
        });
      }
    } catch (err: any) {
      setImportNotice({
        success: false,
        message: err?.message || "Error reading file.",
      });
    }

    if (globalFileInputRef.current) globalFileInputRef.current.value = "";
    setTimeout(() => setImportNotice(null), 5000);
  };

  const dueNotes = useMemo(() => {
    return getDueStudyNotes();
  }, [notes]);

  // Group local course lectures by course title/folder
  const localCourseFolders = useMemo(() => {
    const courses = localEntries.filter((e) => e.source === "courses");
    const map = new Map<string, { folder: string; title: string; lessons: LocalEntry[] }>();
    for (const entry of courses) {
      const folderPath = entry.folder ?? "";
      const key = folderPath || entry.title;
      const existing = map.get(key);
      if (existing) {
        existing.lessons.push(entry);
      } else {
        map.set(key, {
          folder: folderPath,
          title: entry.title,
          lessons: [entry],
        });
      }
    }
    // Sort lessons inside each folder by episode
    for (const group of map.values()) {
      group.lessons.sort((a, b) => (a.episode ?? 0) - (b.episode ?? 0));
    }
    return Array.from(map.values());
  }, [localEntries]);

  // Video feeds configured in settings
  const subscribedFeeds = useMemo(() => {
    return settings.videoFeeds || [];
  }, [settings.videoFeeds]);

  // Filter curated courses
  const filteredCurated = useMemo(() => {
    return CURATED_COURSES.filter((course) => {
      const matchCat = activeCategory === "all" || course.category === activeCategory;
      const matchQuery =
        !searchQuery.trim() ||
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery]);

  // Handle LAN Stremio share
  const handleToggleShare = useCallback(
    async (folder: string, title: string) => {
      if (sharedTokens[folder]) {
        // Already shared: copy manifest
        const manifestUrl = sharedTokens[folder];
        void navigator.clipboard.writeText(manifestUrl);
        setCopiedShareFolder(folder);
        setTimeout(() => setCopiedShareFolder(null), 2500);
        return;
      }
      try {
        const token = `edu_${Math.random().toString(36).slice(2, 9)}`;
        const manifestUrl = await registerCourseShare({ token, folder, name: title });
        setSharedTokens((prev) => ({ ...prev, [folder]: manifestUrl }));
        void navigator.clipboard.writeText(manifestUrl);
        setCopiedShareFolder(folder);
        setTimeout(() => setCopiedShareFolder(null), 2500);
      } catch (e) {
        console.error("Failed to share course folder", e);
      }
    },
    [sharedTokens],
  );

  // Subscribe curated course as video feed
  const handleSubscribeFeed = useCallback(
    (course: CuratedCourse) => {
      const exists = (settings.videoFeeds || []).some((f) => f.url === course.feedUrl);
      if (exists) {
        openSettings("streaming");
        return;
      }
      const newFeed = {
        id: `course_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: `${course.provider}: ${course.title}`,
        url: course.feedUrl,
      };
      update({
        videoFeedsEnabled: true,
        videoFeeds: [...(settings.videoFeeds || []), newFeed],
      });
      openSettings("streaming");
    },
    [settings.videoFeeds, update, openSettings],
  );

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-canvas px-12 pt-28 pb-16 text-ink select-none">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-edge/60 pb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-inner border border-accent/20">
            <GraduationCap size={32} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-ink">
                {t("Education Hub")}
              </h1>
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent border border-accent/20">
                {t("Free & Open")}
              </span>
            </div>
            <p className="text-[13.5px] text-ink-muted mt-1 max-w-2xl leading-relaxed">
              {t("Democratizing education with high-yield medical, engineering, and competitive exam masterclasses.")}
            </p>
          </div>
        </div>

        {/* Header Action Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowQBank(true)}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:opacity-95 active:scale-[0.98] transition"
            title="Open Clinical Vignette QBank Drill & Grand Test Simulation"
          >
            <Zap size={15} className="fill-white" />
            <span>{t("Clinical QBank Drill")}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWateringDeck(true)}
            disabled={dueNotes.length === 0}
            className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-3.5 py-2.5 text-[12.5px] font-medium text-ink hover:bg-raised active:scale-[0.98] transition shadow-sm disabled:opacity-40"
            title="Daily Active Recall Spaced Repetition Session"
          >
            <Sparkles size={15} className="text-sky-400" />
            <span>{t("Water the Tree")}</span>
            {dueNotes.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent text-white px-1 text-[10px] font-black">
                {dueNotes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowNotesDrawer(true)}
            className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-3.5 py-2.5 text-[12.5px] font-medium text-ink hover:bg-raised transition shadow-sm"
          >
            <FileText size={15} className="text-ink-muted" />
            <span>{t("My Study Notes")}</span>
            {notes.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-raised px-1 text-[10px] font-bold text-ink-muted">
                {notes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowQBankManager(true)}
            className="flex items-center gap-1.5 rounded-xl border border-edge bg-surface px-3 py-2.5 text-[12.5px] font-medium text-ink hover:bg-raised transition shadow-sm"
            title="Manage packs, catalog downloads, and question authoring"
          >
            <Database size={15} className="text-ink-muted" />
            <span>{t("QBank Packs")}</span>
          </button>

          <button
            type="button"
            onClick={() => globalFileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border border-edge bg-surface px-3 py-2.5 text-[12.5px] font-medium text-ink hover:bg-raised transition shadow-sm"
            title="Import Educational JSON, JSONL, or .json.gz file directly into Argus"
          >
            <Upload size={15} className="text-emerald-500" />
            <span>{t("Import .json / .json.gz")}</span>
          </button>
          <input
            type="file"
            ref={globalFileInputRef}
            accept=".json,.jsonl,.gz,.txt"
            onChange={handleGlobalFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => openSettings("library")}
            className="flex items-center gap-1.5 rounded-xl border border-edge bg-surface px-3 py-2.5 text-[12.5px] font-medium text-ink hover:bg-raised transition shadow-sm"
          >
            <FolderPlus size={15} className="text-ink-muted" />
            <span>{t("Scan Local Course")}</span>
          </button>

          <button
            type="button"
            onClick={() => openSettings("streaming")}
            className="flex items-center gap-1.5 rounded-xl border border-edge bg-surface px-3 py-2.5 text-[12.5px] font-medium text-ink hover:bg-raised transition shadow-sm"
          >
            <Rss size={15} className="text-ink-muted" />
            <span>{t("Feeds")}</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="mt-8 flex flex-col gap-10">
        {importNotice && (
          <div
            className={`flex items-center justify-between gap-3 rounded-2xl p-4 text-xs font-medium border shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${
              importNotice.success
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {importNotice.success ? <Check size={16} /> : <AlertCircle size={16} />}
              <span className="text-[13px]">{importNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportNotice(null)}
              className="rounded-lg p-1 text-ink-subtle hover:text-ink transition"
            >
              ✕
            </button>
          </div>
        )}

        {/* QBank Pack Manager Modal */}
        {showQBankManager && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <QBankManager
              onStartPackDrill={(_pack) => {
                setShowQBankManager(false);
                setShowQBank(true);
              }}
              onClose={() => setShowQBankManager(false)}
            />
          </div>
        )}

        {/* Clinical QBank Drill Modal / Overlay */}
        {showQBank && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <QBankRunner onClose={() => setShowQBank(false)} />
          </div>
        )}

        {/* INICET 7-Day Sprint War Room Banner */}
        <InicetWarRoomBanner />

        {/* Daily Watering Flashcard Deck (Modal or Expanded View) */}
        {showWateringDeck && (
          <DailyWateringDeck
            notes={notes}
            onClose={() => setShowWateringDeck(false)}
          />
        )}
        {/* Section 1: Local Course Folders */}
        {localCourseFolders.length > 0 && (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2.5">
                <BookOpen size={20} className="text-accent" />
                <span>{t("My Local Courses")}</span>
              </h2>
              <p className="text-[12.5px] text-ink-muted mt-0.5">
                {t("Sequential video lecture libraries scanned from your local drives.")}
              </p>
            </div>

            <div className="-mx-2">
              <Row min={260} shape="landscape" alwaysActive scrollKey="education:local">
                {localCourseFolders.map((course) => {
                  const firstLesson = course.lessons[0];
                  const isShared = !!sharedTokens[course.folder];
                  const isCopied = copiedShareFolder === course.folder;

                  return (
                    <div
                      key={course.folder}
                      className="group/card relative aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-2xl border border-edge-soft bg-surface/70 p-5 shadow-sm transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-edge flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[15px] font-bold text-ink line-clamp-1">{course.title}</h3>
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent shrink-0">
                            {course.lessons.length} {t("lessons")}
                          </span>
                        </div>
                        <p className="text-[11.5px] font-mono text-ink-subtle truncate mt-1">
                          {course.folder}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-edge-soft/60">
                        <button
                          type="button"
                          onClick={() => firstLesson && openPlayer(localPlayerSrc(firstLesson))}
                          className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:opacity-90 transition"
                        >
                          <Play size={13} fill="currentColor" />
                          <span>{t("Resume Course")}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleShare(course.folder, course.title)}
                          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11.5px] font-medium transition ${
                            isCopied
                              ? "bg-emerald-500/15 text-emerald-500"
                              : isShared
                              ? "bg-surface border border-edge text-ink"
                              : "text-ink-muted hover:bg-surface hover:text-ink"
                          }`}
                          title={t("Stream over LAN to Stremio or TV")}
                        >
                          {isCopied ? <Check size={13} /> : <Share2 size={13} />}
                          <span>{isCopied ? t("Copied!") : isShared ? t("Copy Feed") : t("Share LAN")}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </Row>
            </div>
          </section>
        )}

        {/* Section 2: Subscribed Feeds */}
        {subscribedFeeds.length > 0 && (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2.5">
                <Rss size={20} className="text-amber-500" />
                <span>{t("Subscribed Channels & Playlists")}</span>
              </h2>
              <p className="text-[12.5px] text-ink-muted mt-0.5">
                {t("RSS feeds and YouTube playlist feeds synced into your player.")}
              </p>
            </div>

            <div className="-mx-2">
              <Row min={240} shape="landscape" alwaysActive scrollKey="education:feeds">
                {subscribedFeeds.map((feed) => (
                  <div
                    key={feed.id}
                    onClick={() => openSettings("streaming")}
                    className="group/card relative aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-2xl border border-edge-soft bg-surface/70 p-5 shadow-sm transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-edge flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/20">
                        <Rss size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[14px] font-bold text-ink truncate">{feed.name}</h4>
                        <p className="text-[11px] font-mono text-ink-subtle truncate max-w-[180px]">{feed.url}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-edge-soft/60 text-xs text-ink-muted group-hover/card:text-ink">
                      <span>{t("Configure in Streaming Settings")}</span>
                      <ExternalLink size={14} className="text-ink-subtle shrink-0" />
                    </div>
                  </div>
                ))}
              </Row>
            </div>
          </section>
        )}

        {/* Section 3: Curated Open Courses Catalog */}
        <section className="flex flex-col gap-5 pb-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-ink tracking-tight flex items-center gap-2.5">
                <GraduationCap size={22} className="text-accent" />
                <span>{t("Curated Coaching-Alternative Catalogs")}</span>
              </h2>
              <p className="text-[12.5px] text-ink-muted mt-0.5">
                {t("Comprehensive courses from world-class universities and open medical faculties.")}
              </p>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search size={14} className="absolute start-3 top-2.5 text-ink-subtle" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("Filter by subject or topic…")}
                  className="rounded-xl border border-edge-soft bg-surface/80 ps-8 pe-3 py-1.5 text-[12.5px] text-ink placeholder:text-ink-subtle outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center rounded-xl border border-edge-soft bg-surface/60 p-1 gap-1">
                {(
                  [
                    { id: "all", label: t("All") },
                    { id: "medical", label: t("Medical (NEET-PG/MBBS)") },
                    { id: "engineering", label: t("Engineering & CS") },
                    { id: "science", label: t("Sciences") },
                    { id: "humanities", label: t("Civil Services") },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition ${
                      activeCategory === cat.id
                        ? "bg-accent text-white shadow-sm"
                        : "text-ink-muted hover:text-ink hover:bg-raised"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Native Row Horizontal Carousel for Curated Courses */}
          <div className="-mx-2">
            <Row
              min={280}
              shape="landscape"
              alwaysActive
              scrollKey={`education:courses:${activeCategory}`}
            >
              {filteredCurated.map((course) => {
                const isSubscribed = (settings.videoFeeds || []).some((f) => f.url === course.feedUrl);

                return (
                  <div
                    key={course.id}
                    className="group/card relative aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-2xl border border-edge-soft text-start shadow-[0_4px_18px_-10px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/0 transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-edge hover:ring-white/15"
                  >
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      loading="lazy"
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover/card:scale-105"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-black/30 transition-colors duration-300 group-hover/card:bg-black/10"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/45 to-transparent"
                    />

                    {/* Top Badges */}
                    <span className="absolute start-3.5 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/90 backdrop-blur-md">
                      <Layers size={11} strokeWidth={2.4} />
                      <span>{course.provider}</span>
                    </span>

                    {course.totalLessons && (
                      <span className="absolute end-3.5 top-3 inline-flex items-center gap-1 rounded-full bg-accent/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                        {course.totalLessons} {t("Lectures")}
                      </span>
                    )}

                    {/* Bottom Metadata & Subscribe Button */}
                    <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-1.5">
                      <h3 className="text-[14.5px] font-bold text-white line-clamp-1 leading-snug drop-shadow-md">
                        {course.title}
                      </h3>
                      <p className="text-[12px] text-white/70 line-clamp-2 leading-relaxed drop-shadow">
                        {course.description}
                      </p>

                      <div className="mt-2 flex items-center justify-between pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1.5">
                          {course.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubscribeFeed(course);
                          }}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                            isSubscribed
                              ? "bg-white/20 text-white backdrop-blur-md"
                              : "bg-accent hover:opacity-90 text-white shadow-sm"
                          }`}
                        >
                          <Rss size={12} />
                          <span>{isSubscribed ? t("Subscribed") : t("Add to Library")}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Row>
          </div>
        </section>
      </div>

      {/* Study Notes Slide-over Drawer */}
      {showNotesDrawer && (
        <NotesDrawer
          notes={notes}
          onClose={() => setShowNotesDrawer(false)}
        />
      )}
    </div>
  );
}

function NotesDrawer({
  notes,
  onClose,
}: {
  notes: StudyNote[];
  onClose: () => void;
}) {
  const t = useT();
  const [copiedAll, setCopiedAll] = useState(false);
  const [downloadedAnki, setDownloadedAnki] = useState(false);
  const [downloadedJson, setDownloadedJson] = useState(false);
  const [drawerNotice, setDrawerNotice] = useState<{ success: boolean; message: string } | null>(null);
  const drawerFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportAll = () => {
    const md = exportNotesAsMarkdown(notes);
    void navigator.clipboard.writeText(md);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleExportJson = () => {
    const jsonStr = exportNotesAsJson(notes);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `argus-notes-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadedJson(true);
    setTimeout(() => setDownloadedJson(false), 2000);
  };

  const handleDrawerFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await importEducationalFile(file);
      if (res.success) {
        setDrawerNotice({
          success: true,
          message: `Imported ${res.count} cards / questions (${res.type})!`,
        });
      } else {
        setDrawerNotice({
          success: false,
          message: res.error || "Failed to import JSON file.",
        });
      }
    } catch (err: any) {
      setDrawerNotice({
        success: false,
        message: err?.message || "File processing error.",
      });
    }

    if (drawerFileInputRef.current) drawerFileInputRef.current.value = "";
    setTimeout(() => setDrawerNotice(null), 4000);
  };

  const handleExportAnki = () => {
    const pkg = generateAnkiDeckPackage(notes, "Argus Study Mode Deck");
    const blob = new Blob([pkg.textData], { type: "text/tab-separated-values;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pkg.filename;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadedAnki(true);
    setTimeout(() => setDownloadedAnki(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex h-full w-full max-w-[480px] flex-col bg-surface shadow-2xl border-s border-edge">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-edge/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <GraduationCap size={20} className="text-accent" />
            <h2 className="text-[16px] font-semibold text-ink">{t("Study Notes & Revisions")}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-subtle hover:bg-raised hover:text-ink transition"
          >
            ✕
          </button>
        </div>

        {/* Drawer Actions */}
        <div className="flex flex-col gap-2 bg-canvas/40 px-6 py-3 border-b border-edge/40">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-ink-muted">
              {notes.length} {t("saved note timestamps")}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => drawerFileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11.5px] font-medium text-emerald-400 hover:underline"
                title="Import Notes or Cards from JSON, JSONL, or .json.gz"
              >
                <Upload size={12} />
                <span>{t("Import JSON")}</span>
              </button>
              <input
                type="file"
                ref={drawerFileInputRef}
                accept=".json,.jsonl,.gz,.txt"
                onChange={handleDrawerFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleExportJson}
                disabled={notes.length === 0}
                className="flex items-center gap-1 text-[11.5px] font-medium text-sky-400 hover:underline disabled:opacity-40"
                title="Export Notes as JSON"
              >
                <Download size={12} />
                <span>{downloadedJson ? t("Saved JSON!") : t("JSON")}</span>
              </button>
              <button
                type="button"
                onClick={handleExportAnki}
                disabled={notes.length === 0}
                className="flex items-center gap-1 text-[11.5px] font-medium text-amber-400 hover:underline disabled:opacity-40"
                title="Export as native Anki-importable deck with Image Occlusion"
              >
                {downloadedAnki ? <Check size={12} /> : <Download size={12} />}
                <span>{downloadedAnki ? t("Saved Anki!") : t("Anki")}</span>
              </button>
              <button
                type="button"
                onClick={handleExportAll}
                disabled={notes.length === 0}
                className="flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline disabled:opacity-40"
              >
                {copiedAll ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedAll ? t("Copied!") : t("Markdown")}</span>
              </button>
            </div>
          </div>

          {drawerNotice && (
            <div
              className={`flex items-center gap-2 p-2 rounded-lg text-[11.5px] font-medium border ${
                drawerNotice.success
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              }`}
            >
              {drawerNotice.success ? <Check size={13} /> : <AlertCircle size={13} />}
              <span>{drawerNotice.message}</span>
            </div>
          )}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-ink-subtle gap-2">
              <FileText size={32} strokeWidth={1.5} />
              <p className="text-[13px]">{t("No study notes captured yet.")}</p>
              <p className="text-[11.5px] max-w-[280px]">
                {t("Press 'N' while watching any lecture to freeze the frame and create a timestamped note.")}
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="flex flex-col gap-2.5 rounded-xl border border-edge bg-canvas/50 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-[13.5px] font-semibold text-ink leading-tight">
                      {note.itemTitle}
                    </h4>
                    <span className="text-[11px] font-mono text-accent">
                      {note.timestampLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteStudyNote(note.id)}
                    className="text-ink-subtle hover:text-danger p-1 transition"
                    title={t("Delete note")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {note.snapshotDataUrl && (
                  <div className="overflow-hidden rounded-lg border border-edge/60 max-h-[120px] bg-black/40">
                    <img
                      src={note.snapshotDataUrl}
                      alt="Lecture snapshot"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <p className="text-[12.5px] text-ink-muted whitespace-pre-wrap font-sans leading-relaxed">
                  {note.markdown}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
