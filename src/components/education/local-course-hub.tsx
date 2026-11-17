import { useState, useMemo } from "react";
import {
  Folder,
  HardDrive,
  Play,
  FileText,
  Search,
  Share2,
  CheckCircle,
  X,
  Clock,
  Sparkles,
} from "lucide-react";
import type { UniversityCourse, CourseLecture } from "@/lib/education/course-engine";
import { scanLocalCourseFolder, type LocalFileEntry } from "@/lib/education/local-course-scanner";
import { LocalCourseSearchIndex } from "@/lib/education/local-semantic-search";
import { localAcademicSeederManager } from "@/lib/education/local-academic-seeder";

export interface LocalCourseHubProps {
  open: boolean;
  onClose: () => void;
  onPlayLecture: (lecture: CourseLecture, course: UniversityCourse) => void;
}

export function LocalCourseHub({ open, onClose, onPlayLecture }: LocalCourseHubProps) {
  const [courses, setCourses] = useState<UniversityCourse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [seedingEnabled, setSeedingEnabled] = useState(true);

  // In-memory search index
  const searchIndex = useMemo(() => new LocalCourseSearchIndex(courses), [courses]);
  const searchResults = useMemo(() => searchIndex.search(searchQuery), [searchIndex, searchQuery]);

  if (!open) return null;

  const handleSimulateScanFolder = () => {
    // Demonstration scan simulating user selecting ~/Movies/MIT-18.06-Linear-Algebra
    const sampleFiles: LocalFileEntry[] = [
      { name: "01 - The Geometry of Linear Equations.mp4", path: "/Volumes/Media/Courses/MIT-18.06/01.mp4", sizeBytes: 850_000_000 },
      { name: "01 - The Geometry of Linear Equations.vtt", path: "/Volumes/Media/Courses/MIT-18.06/01.vtt", content: "WEBVTT\n\n00:00:01.000 --> 00:00:15.000\nWelcome to MIT Linear Algebra with Gilbert Strang.\n\n00:00:16.000 --> 00:00:45.000\nThe fundamental problem of linear algebra is solving linear equations." },
      { name: "Lecture 02 - Elimination with Matrices.mkv", path: "/Volumes/Media/Courses/MIT-18.06/02.mkv", sizeBytes: 920_000_000 },
      { name: "Lecture 03 - Multiplication and Inverse Matrices.mp4", path: "/Volumes/Media/Courses/MIT-18.06/03.mp4", sizeBytes: 880_000_000 },
      { name: "Lecture 14 - Orthogonal Vectors and Projections.mp4", path: "/Volumes/Media/Courses/MIT-18.06/14.mp4", sizeBytes: 940_000_000 },
      { name: "Lecture 29 - Singular Value Decomposition SVD.mkv", path: "/Volumes/Media/Courses/MIT-18.06/29.mkv", sizeBytes: 1_050_000_000 },
    ];

    const scanned = scanLocalCourseFolder("MIT 18.06: Linear Algebra (Local HD)", sampleFiles, {
      institution: "Massachusetts Institute of Technology",
      instructor: "Prof. Gilbert Strang",
      category: "math-physics",
      badgeAccent: "#f59e0b",
    });

    setCourses((prev) => [scanned, ...prev]);

    if (seedingEnabled) {
      localAcademicSeederManager.registerSeedingTarget({
        courseId: scanned.id,
        courseTitle: scanned.title,
        infoHash: "7a92847102938471928374910283749182739481",
        localPath: "/Volumes/Media/Courses/MIT-18.06",
        totalSizeBytes: 4_640_000_000,
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Local Courses"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-[argus-fade-in_200ms_ease-out]"
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[85vh] rounded-2xl bg-[#0b0c14]/95 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.9)] text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <HardDrive size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Local Courses & Offline Downloads
                </h2>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  OFFLINE
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Play downloaded videos directly from your local storage without internet connection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action / Search Toolbar */}
        <div className="px-6 py-3 border-b border-white/10 bg-zinc-950/40 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search local transcripts, theorems & math concepts..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={seedingEnabled}
                onChange={(e) => setSeedingEnabled(e.target.checked)}
                className="rounded border-zinc-700 text-emerald-500 focus:ring-0"
              />
              <Share2 size={13} className="text-emerald-400" />
              <span>Seed to Academic Swarm</span>
            </label>
            <button
              type="button"
              onClick={handleSimulateScanFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors shadow-sm"
            >
              <Folder size={14} />
              <span>Index Local Folder</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
          {searchQuery && searchResults.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Matching Moments Across Local Lectures ({searchResults.length})
              </h3>
              {searchResults.map((res, i) => (
                <div
                  key={`${res.lectureId}-${i}`}
                  onClick={() => {
                    const crs = courses.find((c) => c.id === res.courseId);
                    const lec = crs?.lectures.find((l) => l.id === res.lectureId);
                    if (crs && lec) {
                      onPlayLecture({ ...lec, lastPositionSec: res.timestampSec }, crs);
                    }
                  }}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 hover:bg-white/[0.06] transition-all cursor-pointer flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{res.courseTitle}</span>
                      <span className="text-zinc-500">•</span>
                      <span className="text-xs text-zinc-300">{res.lectureTitle}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">&ldquo;{res.snippet}&rdquo;</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-semibold text-emerald-400">
                      {Math.floor(res.timestampSec / 60)}:{(res.timestampSec % 60).toString().padStart(2, "0")}
                    </span>
                    <Play size={14} className="text-emerald-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-zinc-400">
                <Folder size={28} />
              </div>
              <h3 className="text-sm font-semibold text-white">No Local Course Folders Indexed Yet</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Have course videos on your drive? Click &ldquo;Index Local Folder&rdquo; above to automatically detect lecture ordering, pair subtitles, and unlock zero-buffering playback.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSimulateScanFolder}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors"
                >
                  Scan Example Lecture Folder
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {courses.map((course) => (
                <div key={course.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {course.title}
                        <CheckCircle size={14} className="text-emerald-400" />
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {course.institution} • {course.instructor} • {course.lectures.length} Lectures
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {course.lectures.map((lec) => (
                      <div
                        key={lec.id}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white">
                            {lec.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                              <Clock size={11} />
                              {Math.floor(lec.durationSec / 60)} min
                            </span>
                            {lec.transcript && (
                              <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                                <FileText size={10} />
                                Subtitles
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onPlayLecture(lec, course)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/30 transition-all"
                          title="Play local file with zero latency"
                        >
                          <Play size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-emerald-400" />
            Zero network egress • Instant seek • Local Whisper transcripts
          </span>
          <span className="font-mono text-zinc-500">
            {courses.reduce((acc, c) => acc + c.lectures.length, 0)} local lectures ready
          </span>
        </div>
      </div>
    </div>
  );
}
