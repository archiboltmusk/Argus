import { useState, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useView } from "@/lib/view";
import { useSettings } from "@/lib/settings";
import { useLocalLibrary, type LocalEntry } from "@/lib/local-library";
import { localPlayerSrc } from "@/lib/local-library/player-src";
import { CURATED_COURSES } from "@/lib/education/catalogs";
import type { CourseCategory, CuratedCourse, StudyNote } from "@/lib/education/types";
import { useStudyNotes, deleteStudyNote, exportNotesAsMarkdown, getDueStudyNotes } from "@/lib/education/notes";
import { registerCourseShare } from "@/lib/local-library/course-share";
import { InicetWarRoomBanner } from "./education/inicet-war-room-banner";
import { DailyWateringDeck } from "./education/daily-watering-deck";

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
  const [sharedTokens, setSharedTokens] = useState<Record<string, string>>({});
  const [copiedShareFolder, setCopiedShareFolder] = useState<string | null>(null);

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
    <div className="flex h-full w-full flex-col overflow-y-auto bg-canvas px-8 py-7 text-ink select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-edge/60 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-inner">
            <GraduationCap size={26} strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
              <span>{t("Education Hub")}</span>
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent border border-accent/20">
                {t("Free & Open")}
              </span>
            </h1>
            <p className="text-[13px] text-ink-muted mt-0.5">
              {t("Democratizing education with high-yield medical, engineering, and competitive exam masterclasses.")}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => openSettings("library")}
            className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-3.5 py-2 text-[12.5px] font-medium text-ink hover:bg-raised transition shadow-sm"
          >
            <FolderPlus size={15} />
            <span>{t("Scan Local Course")}</span>
          </button>

          <button
            type="button"
            onClick={() => openSettings("streaming")}
            className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-3.5 py-2 text-[12.5px] font-medium text-ink hover:bg-raised transition shadow-sm"
          >
            <Rss size={15} />
            <span>{t("Lecture RSS / Feeds")}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWateringDeck(true)}
            disabled={dueNotes.length === 0}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:opacity-95 active:scale-[0.98] transition shadow-sm disabled:opacity-40"
            title="Daily Active Recall Spaced Repetition Session"
          >
            <Sparkles size={15} />
            <span>{t("Water the Tree")}</span>
            {dueNotes.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white text-sky-600 px-1 text-[10px] font-black">
                {dueNotes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowNotesDrawer(true)}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-[12.5px] font-medium text-white hover:opacity-90 active:scale-[0.98] transition shadow-sm"
          >
            <FileText size={15} />
            <span>{t("My Study Notes")}</span>
            {notes.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold">
                {notes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="mt-8 flex flex-col gap-10">
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                  <BookOpen size={18} className="text-accent" />
                  <span>{t("My Local Courses")}</span>
                </h2>
                <p className="text-[12px] text-ink-muted">
                  {t("Sequential video lecture libraries scanned from your local drives.")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localCourseFolders.map((course) => {
                const firstLesson = course.lessons[0];
                const isShared = !!sharedTokens[course.folder];
                const isCopied = copiedShareFolder === course.folder;

                return (
                  <div
                    key={course.folder}
                    className="flex flex-col justify-between rounded-2xl border border-edge bg-surface/60 p-5 hover:border-edge-soft hover:bg-surface transition shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[15px] font-semibold text-ink line-clamp-1">{course.title}</h3>
                        <span className="rounded-md bg-raised px-2 py-0.5 text-[11px] font-mono text-ink-muted shrink-0">
                          {course.lessons.length} {t("lessons")}
                        </span>
                      </div>
                      <p className="text-[11.5px] font-mono text-ink-subtle truncate mt-1">
                        {course.folder}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between pt-3 border-t border-edge/40">
                      <button
                        type="button"
                        onClick={() => firstLesson && openPlayer(localPlayerSrc(firstLesson))}
                        className="flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-[12px] font-medium text-accent hover:bg-accent/25 transition"
                      >
                        <Play size={13} fill="currentColor" />
                        <span>{t("Resume Course")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleShare(course.folder, course.title)}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium transition ${
                          isCopied
                            ? "bg-emerald-500/15 text-emerald-600"
                            : isShared
                            ? "bg-raised text-ink hover:bg-raised/80"
                            : "text-ink-muted hover:bg-raised hover:text-ink"
                        }`}
                        title={t("Stream over LAN to Stremio or TV")}
                      >
                        {isCopied ? <Check size={13} /> : <Share2 size={13} />}
                        <span>{isCopied ? t("URL Copied!") : isShared ? t("Copy Feed") : t("Share to LAN")}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 2: Subscribed Feeds */}
        {subscribedFeeds.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                  <Rss size={18} className="text-amber-500" />
                  <span>{t("Subscribed Channels & Playlists")}</span>
                </h2>
                <p className="text-[12px] text-ink-muted">
                  {t("RSS feeds and YouTube playlist feeds synced into your player.")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {subscribedFeeds.map((feed) => (
                <div
                  key={feed.id}
                  onClick={() => openSettings("streaming")}
                  className="flex items-center justify-between p-4 rounded-xl border border-edge bg-surface/50 hover:bg-surface cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                      <Rss size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[13.5px] font-semibold text-ink truncate">{feed.name}</h4>
                      <p className="text-[11px] text-ink-subtle truncate max-w-[200px]">{feed.url}</p>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-ink-subtle shrink-0" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Curated Open Courses Catalog */}
        <section className="flex flex-col gap-4 pb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <GraduationCap size={19} className="text-accent" />
                <span>{t("Curated Coaching-Alternative Catalogs")}</span>
              </h2>
              <p className="text-[12px] text-ink-muted">
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
                  className="rounded-xl border border-edge bg-surface ps-8 pe-3 py-1.5 text-[12.5px] text-ink placeholder:text-ink-subtle outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center rounded-xl border border-edge bg-surface p-1 gap-1">
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

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
            {filteredCurated.map((course) => {
              const isSubscribed = (settings.videoFeeds || []).some((f) => f.url === course.feedUrl);

              return (
                <div
                  key={course.id}
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-edge bg-surface shadow-sm hover:border-edge-soft transition group"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-canvas">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute bottom-2.5 start-3 rounded-md bg-black/60 px-2 py-0.5 text-[10.5px] font-medium text-white/90 backdrop-blur-sm">
                      {course.provider}
                    </span>
                    {course.totalLessons && (
                      <span className="absolute bottom-2.5 end-3 rounded-md bg-accent/90 px-2 py-0.5 text-[10.5px] font-bold text-white backdrop-blur-sm">
                        {course.totalLessons} {t("Lectures")}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <h3 className="text-[14px] font-semibold text-ink line-clamp-1 leading-snug">
                        {course.title}
                      </h3>
                      <p className="mt-1 text-[12px] text-ink-muted line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {course.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-raised px-2 py-0.5 text-[10.5px] font-medium text-ink-subtle"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-edge/40 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleSubscribeFeed(course)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                          isSubscribed
                            ? "bg-raised text-ink-muted"
                            : "bg-accent/15 text-accent hover:bg-accent/25"
                        }`}
                      >
                        <Rss size={13} />
                        <span>{isSubscribed ? t("Feed Subscribed") : t("Add to Library")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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

  const handleExportAll = () => {
    const md = exportNotesAsMarkdown(notes);
    void navigator.clipboard.writeText(md);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
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
        <div className="flex items-center justify-between bg-canvas/40 px-6 py-2.5 border-b border-edge/40">
          <span className="text-[12px] text-ink-muted">
            {notes.length} {t("saved note timestamps")}
          </span>
          <button
            type="button"
            onClick={handleExportAll}
            disabled={notes.length === 0}
            className="flex items-center gap-1.5 text-[12px] font-medium text-accent hover:underline disabled:opacity-40"
          >
            {copiedAll ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedAll ? t("Copied Markdown!") : t("Export to Obsidian / Anki")}</span>
          </button>
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
