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
  Upload,
  AlertCircle,
  Zap,
  Database,
  Layers,
  Activity,
  Flame,
  Stethoscope,
  BrainCircuit,
  SlidersHorizontal,
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
import { PatientCaseSimulator } from "./education/patient-case-simulator";
import { getAllQuestions, getInicetHighYieldQuestions } from "@/lib/education/qbank-store";
import { CLINICAL_QBANK_STARTER } from "@/lib/education/qbank-data";
import { Row } from "@/components/row";
import "./education/education-hub.css";

export function EducationView() {
  const t = useT();
  const { openPlayer, openSettings } = useView();
  const { settings, update } = useSettings();
  const localEntries = useLocalLibrary();
  const notes = useStudyNotes();

  const [tab, setTab] = useState<"courses" | "qbank" | "simulator" | "notes">("courses");
  const [activeCategory, setActiveCategory] = useState<CourseCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [showWateringDeck, setShowWateringDeck] = useState(false);
  const [showQBank, setShowQBank] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [activeDrillQuestions, setActiveDrillQuestions] = useState<import("@/lib/education/qbank-types").ClinicalQuestion[] | undefined>();
  const [showQBankManager, setShowQBankManager] = useState(false);
  const [sharedTokens, setSharedTokens] = useState<Record<string, string>>({});
  const [copiedShareFolder, setCopiedShareFolder] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<{ success: boolean; message: string } | null>(null);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
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
    } catch (err: unknown) {
      setImportNotice({
        success: false,
        message: err instanceof Error ? err.message : "Error reading file.",
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

  const startQBankDrill = useCallback((highYieldOnly = false) => {
    if (highYieldOnly) {
      const highYield = getInicetHighYieldQuestions();
      setActiveDrillQuestions(highYield.length > 0 ? highYield : CLINICAL_QBANK_STARTER);
    } else {
      const allImported = getAllQuestions();
      setActiveDrillQuestions(allImported.length > 0 ? allImported : CLINICAL_QBANK_STARTER);
    }
    setShowQBank(true);
  }, []);

  return (
    <main className="edu-hub" aria-label={t("Education Hub")}>
      {/* 1. Masthead matching Argus Sports Standard */}
      <header className="edu-masthead">
        <div>
          <div className="edu-eyebrow">
            <GraduationCap size={15} />
            <span>ARGUS EDUCATION</span>
            <span className="edu-eyebrow-badge">Open Masterclasses</span>
          </div>
          <h1>{t("Knowledge without gates. Your curriculum.")}</h1>
          <p>
            {t(
              "Democratizing education with clinical vignette simulations, high-yield university lecture series, and active recall spaced repetition.",
            )}
          </p>
        </div>

        {/* Action Dock */}
        <div className="edu-actions-dock">
          <button
            type="button"
            onClick={() => setShowWateringDeck(true)}
            disabled={dueNotes.length === 0}
            className="edu-pill-button"
            title={t("Daily Active Recall Spaced Repetition Session")}
          >
            <Sparkles size={15} className="text-accent" />
            <span>{t("Water the Tree")}</span>
            {dueNotes.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent text-canvas px-1.5 text-[10px] font-black">
                {dueNotes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => startQBankDrill(true)}
            className="edu-pill-button primary"
            title={t("Launch High-Yield Clinical Vignette QBank Drill")}
          >
            <Zap size={15} className="fill-canvas text-canvas" />
            <span>{t("Clinical QBank Drill")}</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowToolsMenu((v) => !v)}
              className="edu-pill-button"
              title={t("More Educational Tools")}
              aria-expanded={showToolsMenu}
            >
              <SlidersHorizontal size={15} />
              <span>{t("Tools")}</span>
            </button>

            {showToolsMenu && (
              <div
                className="absolute end-0 top-full mt-2 w-56 rounded-xl border border-edge bg-elevated/95 p-1.5 shadow-xl backdrop-blur-xl z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150"
                onMouseLeave={() => setShowToolsMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowToolsMenu(false);
                    setShowQBankManager(true);
                  }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-raised transition text-start"
                >
                  <Database size={14} className="text-accent" />
                  <span>{t("Manage QBank Packs")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowToolsMenu(false);
                    globalFileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-raised transition text-start"
                >
                  <Upload size={14} className="text-accent" />
                  <span>{t("Import .json / .json.gz")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowToolsMenu(false);
                    openSettings("library");
                  }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-raised transition text-start"
                >
                  <FolderPlus size={14} className="text-ink-muted" />
                  <span>{t("Scan Local Course")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowToolsMenu(false);
                    openSettings("streaming");
                  }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-raised transition text-start"
                >
                  <Rss size={14} className="text-ink-muted" />
                  <span>{t("Configure Feeds")}</span>
                </button>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={globalFileInputRef}
            accept=".json,.jsonl,.gz,.txt"
            onChange={handleGlobalFileUpload}
            className="hidden"
          />
        </div>
      </header>

      {/* 2. Sleek Segmented Sub-Nav Tabs */}
      <nav className="edu-view-tabs" aria-label={t("Education sub-navigation")}>
        {[
          ["courses", "Courses & Catalogs"],
          ["qbank", "Clinical QBank & Vault"],
          ["simulator", "Emergency Simulator"],
          ["notes", "Study Deck & Notes"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={tab === key}
            onClick={() => setTab(key as typeof tab)}
          >
            {t(label)}
          </button>
        ))}
      </nav>

      {/* Import Notification Banner */}
      {importNotice && (
        <div className="mx-10 mb-6 flex items-center justify-between gap-3 rounded-2xl p-4 text-xs font-medium border shadow-lg bg-surface/90 border-edge backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            {importNotice.success ? (
              <Check size={16} className="text-accent" />
            ) : (
              <AlertCircle size={16} className="text-danger" />
            )}
            <span className="text-[13px] text-ink">{importNotice.message}</span>
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

      {/* Main Tab Content */}
      <div className="edu-body">
        {/* TAB 1: COURSES & CATALOGS */}
        {tab === "courses" && (
          <>
            {/* Section 1: Local Scanned Courses */}
            {localCourseFolders.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="edu-section-head">
                  <div>
                    <h2>
                      <BookOpen size={20} className="text-accent" />
                      <span>{t("My Local Courses")}</span>
                    </h2>
                    <p>{t("Sequential video lecture libraries indexed from your local drives.")}</p>
                  </div>
                </div>

                <div className="-mx-2">
                  <Row min={270} shape="landscape" alwaysActive scrollKey="education:local">
                    {localCourseFolders.map((course) => {
                      const firstLesson = course.lessons[0];
                      const isShared = !!sharedTokens[course.folder];
                      const isCopied = copiedShareFolder === course.folder;

                      return (
                        <div
                          key={course.folder}
                          className="edu-course-card group/card flex flex-col justify-between p-5"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-[15px] font-bold text-ink line-clamp-1">{course.title}</h3>
                              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[10.5px] font-bold text-accent shrink-0">
                                {course.lessons.length} {t("lessons")}
                              </span>
                            </div>
                            <p className="text-[11.5px] font-mono text-ink-subtle truncate mt-1">
                              {course.folder}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-edge-soft">
                            <button
                              type="button"
                              onClick={() => firstLesson && openPlayer(localPlayerSrc(firstLesson))}
                              className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-[12px] font-semibold text-canvas hover:brightness-110 transition shadow-sm"
                            >
                              <Play size={13} fill="currentColor" />
                              <span>{t("Resume Course")}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleShare(course.folder, course.title)}
                              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11.5px] font-medium transition ${
                                isCopied
                                  ? "bg-accent-soft text-accent font-semibold"
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
              <section className="flex flex-col gap-3">
                <div className="edu-section-head">
                  <div>
                    <h2>
                      <Rss size={20} className="text-accent" />
                      <span>{t("Subscribed Channels & Playlists")}</span>
                    </h2>
                    <p>{t("RSS feeds and YouTube playlist feeds synced into your player.")}</p>
                  </div>
                </div>

                <div className="-mx-2">
                  <Row min={250} shape="landscape" alwaysActive scrollKey="education:feeds">
                    {subscribedFeeds.map((feed) => (
                      <div
                        key={feed.id}
                        onClick={() => openSettings("streaming")}
                        className="edu-course-card group/card flex flex-col justify-between p-5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/20 shrink-0">
                            <Rss size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[14px] font-bold text-ink truncate">{feed.name}</h4>
                            <p className="text-[11px] font-mono text-ink-subtle truncate max-w-[180px]">{feed.url}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-edge-soft text-xs text-ink-muted group-hover/card:text-ink">
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
            <section className="flex flex-col gap-4">
              <div className="edu-section-head flex-col md:flex-row md:items-center">
                <div>
                  <h2>
                    <GraduationCap size={22} className="text-accent" />
                    <span>{t("Curated University & Faculty Series")}</span>
                  </h2>
                  <p>{t("Comprehensive masterclasses from open universities and medical faculties.")}</p>
                </div>

                {/* Filter Pills & Search */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative">
                    <Search size={14} className="absolute start-3 top-2.5 text-ink-subtle" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("Filter by topic or university…")}
                      className="rounded-xl border border-edge bg-surface/80 ps-8 pe-3 py-1.5 text-[12.5px] text-ink placeholder:text-ink-subtle outline-none focus:border-accent"
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
                        className={`rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition ${
                          activeCategory === cat.id
                            ? "bg-accent text-canvas shadow-sm"
                            : "text-ink-muted hover:text-ink hover:bg-raised"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Course Cards Carousel */}
              <div className="-mx-2">
                <Row
                  min={290}
                  shape="landscape"
                  alwaysActive
                  scrollKey={`education:courses:${activeCategory}`}
                >
                  {filteredCurated.map((course) => {
                    const isSubscribed = (settings.videoFeeds || []).some((f) => f.url === course.feedUrl);

                    return (
                      <div
                        key={course.id}
                        className="edu-course-card group/card"
                      >
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          loading="lazy"
                          draggable={false}
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover/card:scale-105"
                        />
                        <div className="edu-card-overlay">
                          {/* Top Badges */}
                          <div className="absolute start-3.5 top-3.5 flex items-center gap-1.5">
                            <span className="edu-card-badge">
                              <Layers size={11} strokeWidth={2.4} />
                              <span>{course.provider}</span>
                            </span>
                            {course.totalLessons && (
                              <span className="edu-card-badge text-accent border-accent/25">
                                {course.totalLessons} {t("Lectures")}
                              </span>
                            )}
                          </div>

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
                                  : "bg-accent hover:brightness-110 text-canvas shadow-sm"
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
          </>
        )}

        {/* TAB 2: CLINICAL QBANK & VAULT */}
        {tab === "qbank" && (
          <div className="flex flex-col gap-6">
            <InicetWarRoomBanner />

            {/* QBank Launch Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-6 rounded-2xl bg-surface/70 border border-edge-soft flex flex-col justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/25 shrink-0">
                    <Flame size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">INICET High-Yield Drill</h3>
                    <p className="text-xs text-ink-muted">Examiner trap questions & multi-step clinical vignettes</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startQBankDrill(true)}
                  className="edu-pill-button primary w-full justify-center"
                >
                  <Zap size={14} className="fill-canvas text-canvas" />
                  <span>Start High-Yield Sprint</span>
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-surface/70 border border-edge-soft flex flex-col justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/25 shrink-0">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">Complete Question Bank</h3>
                    <p className="text-xs text-ink-muted">All installed packs across Medicine, Surgery, OBG & Pedia</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startQBankDrill(false)}
                  className="edu-pill-button w-full justify-center"
                >
                  <Play size={14} />
                  <span>Drill All Questions</span>
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-surface/70 border border-edge-soft flex flex-col justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/25 shrink-0">
                    <SlidersHorizontal size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">Manage QBank Packs</h3>
                    <p className="text-xs text-ink-muted">Import, export, and review installed specialty packs</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQBankManager(true)}
                  className="edu-pill-button w-full justify-center"
                >
                  <Database size={14} />
                  <span>Open Pack Manager</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CLINICAL EMERGENCY SIMULATOR */}
        {tab === "simulator" && (
          <div className="edu-hero-spotlight">
            <div className="flex flex-col gap-3 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent border border-accent/20 w-max">
                <Stethoscope size={14} />
                <span>Resident Emergency Department</span>
              </div>
              <h2 className="text-2xl font-bold text-ink tracking-tight">
                Interactive Patient Case & ER Resident Simulator
              </h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                Step into the shoes of an on-call emergency physician. Manage acute coronary syndromes, anaphylactic shock, septicemia, and traumatic head injuries under real-time hemodynamic monitoring and diagnostic investigations.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimulator(true)}
                  className="edu-pill-button primary"
                >
                  <Activity size={16} />
                  <span>Launch Emergency Case Simulator</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center p-6 rounded-2xl bg-elevated/60 border border-edge shrink-0">
              <BrainCircuit size={64} className="text-accent opacity-80" />
            </div>
          </div>
        )}

        {/* TAB 4: STUDY DECK & NOTES */}
        {tab === "notes" && (
          <div className="flex flex-col gap-6">
            <div className="edu-hero-spotlight">
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold text-ink">Spaced Repetition Flashcard Engine</h3>
                <p className="text-xs text-ink-muted max-w-lg">
                  Every note captured while watching lectures (press &apos;N&apos; during playback) enters your daily spaced repetition watering queue.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowWateringDeck(true)}
                  disabled={dueNotes.length === 0}
                  className="edu-pill-button primary"
                >
                  <Sparkles size={14} />
                  <span>Water Daily Cards ({dueNotes.length} Due)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotesDrawer(true)}
                  className="edu-pill-button"
                >
                  <FileText size={14} />
                  <span>Browse All Notes ({notes.length})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Overlays */}
      {showQBankManager && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-canvas/80 backdrop-blur-md p-4">
          <QBankManager
            onStartPackDrill={(pack, filterLevel) => {
              let qs = pack.questions;
              if (filterLevel === "high-yield") {
                qs = pack.questions.filter(
                  (q) => q.depthLevel === "L3_MultiStepClinical" || q.depthLevel === "L4_InicetTrap",
                );
                if (qs.length === 0) qs = pack.questions;
              }
              setActiveDrillQuestions(qs);
              setShowQBankManager(false);
              setShowQBank(true);
            }}
            onClose={() => setShowQBankManager(false)}
          />
        </div>
      )}

      {showQBank && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-canvas/80 backdrop-blur-md p-4">
          <QBankRunner
            questions={activeDrillQuestions}
            onClose={() => {
              setShowQBank(false);
              setActiveDrillQuestions(undefined);
            }}
          />
        </div>
      )}

      {showWateringDeck && (
        <DailyWateringDeck
          notes={notes}
          onClose={() => setShowWateringDeck(false)}
        />
      )}

      {showNotesDrawer && (
        <NotesDrawer
          notes={notes}
          onClose={() => setShowNotesDrawer(false)}
        />
      )}

      {showSimulator && (
        <PatientCaseSimulator onClose={() => setShowSimulator(false)} />
      )}
    </main>
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
    } catch (err: unknown) {
      setDrawerNotice({
        success: false,
        message: err instanceof Error ? err.message : "File processing error.",
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
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex h-full w-full max-w-md flex-col bg-surface border-s border-edge shadow-2xl animate-in slide-in-from-end duration-300">
        {/* Drawer Header */}
        <div className="flex flex-col gap-3 p-6 border-b border-edge">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-accent" />
              <h3 className="text-base font-bold text-ink">{t("Captured Study Notes")}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-ink-subtle hover:text-ink hover:bg-raised transition"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => drawerFileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11.5px] font-medium text-ink-muted hover:text-ink px-2 py-1 rounded bg-elevated border border-edge-soft"
                title="Import notes or questions from JSON"
              >
                <Upload size={12} />
                <span>{t("Import")}</span>
              </button>
              <input
                type="file"
                ref={drawerFileInputRef}
                accept=".json,.jsonl,.gz"
                onChange={handleDrawerFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleExportJson}
                disabled={notes.length === 0}
                className="flex items-center gap-1 text-[11.5px] font-medium text-ink-muted hover:text-ink px-2 py-1 rounded bg-elevated border border-edge-soft disabled:opacity-40"
              >
                {downloadedJson ? <Check size={12} /> : <FileText size={12} />}
                <span>{downloadedJson ? t("Saved!") : t("JSON")}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportAnki}
                disabled={notes.length === 0}
                className="flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline disabled:opacity-40"
              >
                {downloadedAnki ? <Check size={12} /> : <FileText size={12} />}
                <span>{downloadedAnki ? t("Downloaded Anki!") : t("Anki .tsv")}</span>
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
                  ? "bg-accent-soft text-accent border-accent/20"
                  : "bg-danger/10 text-danger border-danger/20"
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
                  <div className="overflow-hidden rounded-lg border border-edge/60 max-h-[120px] bg-canvas">
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
