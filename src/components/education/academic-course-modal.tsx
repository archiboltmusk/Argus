import { useState, useMemo } from "react";
import {
  GraduationCap,
  Play,
  Headphones,
  CheckCircle2,
  Clock,
  BookOpen,
  X,
  FastForward,
  Bookmark,
  ChevronRight,
} from "lucide-react";
import {
  coursewareEngine,
  UniversityCourse,
  CourseLecture,
} from "@/lib/education/course-engine";
import { useT } from "@/lib/i18n";

export function AcademicCourseModal({
  isOpen,
  onClose,
  onLaunchLecture,
}: {
  isOpen: boolean;
  onClose: () => void;
  onLaunchLecture: (lecture: CourseLecture, startSec: number, audioOnly: boolean) => void;
}) {
  const t = useT();
  const [courses] = useState<UniversityCourse[]>(coursewareEngine.getAllCourses());
  const [selectedCourseId, setSelectedCourseId] = useState<string>("stanford-cs224w-gnn");
  const [audioOnlyFocus, setAudioOnlyFocus] = useState<boolean>(false);

  const course = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId) || courses[0];
  }, [courses, selectedCourseId]);

  const resumeTarget = useMemo(() => {
    return coursewareEngine.getCourseResumeTarget(course.id);
  }, [course.id]);

  if (!isOpen) return null;

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/82 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex h-full max-h-[88vh] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl bg-[#111215] border border-white/10 shadow-[0_28px_80px_rgba(0,0,0,0.95)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#14151a]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1767be]/15 text-[#4da2ff] border border-[#1767be]/25">
              <GraduationCap size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-white tracking-tight">
                  {t("Academic Courseware & Lecture Engine")}
                </h2>
                <span className="flex items-center gap-1 rounded-full bg-[#1767be]/15 border border-[#1767be]/30 px-2 py-0.5 text-[10.5px] font-bold text-[#4da2ff]">
                  Stanford Online
                </span>
              </div>
              <p className="text-[12px] text-zinc-400">
                {t("Structured syllabus tracking, course-level resume, and audio focus mode.")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label={t("Close")}
          >
            <X size={16} />
          </button>
        </div>

        {/* Course Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-2.5 bg-[#121317]">
          <div className="flex items-center gap-2">
            {courses.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCourseId(c.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all border ${
                  c.id === course.id
                    ? "bg-white text-black border-white shadow-sm font-bold"
                    : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <BookOpen size={13} />
                <span>{c.title.split(":")[0]}</span>
              </button>
            ))}
          </div>

          {/* Audio-only toggle */}
          <button
            onClick={() => setAudioOnlyFocus((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold border transition-all ${
              audioOnlyFocus
                ? "bg-indigo-500 text-white border-[#1767be] shadow-sm"
                : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Headphones size={13} />
            <span>{audioOnlyFocus ? t("Audio Focus Active") : t("Audio Focus Mode")}</span>
          </button>
        </div>

        {/* Course Resume Hero Banner */}
        {resumeTarget && (
          <div className="border-b border-white/10 bg-gradient-to-r from-indigo-950/40 via-[#161722] to-[#121318] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[11px] font-bold text-[#4da2ff] uppercase tracking-wider">
                  <FastForward size={12} />
                  <span>{t("Course-Level Resume Point")}</span>
                </div>
                <h3 className="text-[17px] font-bold text-white leading-snug">
                  {resumeTarget.lecture.title}
                </h3>
                <p className="text-[12px] text-zinc-400">
                  {course.instructor} · {course.institution} · Resume at {formatTime(resumeTarget.resumeSec)}
                </p>
              </div>

              <button
                onClick={() =>
                  onLaunchLecture(resumeTarget.lecture, resumeTarget.resumeSec, audioOnlyFocus)
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 px-5 py-3 text-[13px] font-bold text-white shadow-lg transition-all shrink-0"
              >
                <Play size={15} fill="currentColor" />
                <span>{t("Resume Lecture")}</span>
              </button>
            </div>
          </div>
        )}

        {/* Syllabus Lecture Checklist */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
            {t("Full Course Syllabus ({n} Lectures)", { n: course.lectures.length })}
          </div>

          {course.lectures.map((lec) => {
            const isTarget = resumeTarget?.lecture.id === lec.id;
            return (
              <div
                key={lec.id}
                className={`group flex flex-col gap-2.5 rounded-xl border p-4 transition-all ${
                  isTarget
                    ? "bg-[#181926] border-[#1767be]/40 shadow-sm"
                    : "bg-[#14151b] border-white/5 hover:border-white/20 hover:bg-[#181922]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white text-[12px] font-bold shrink-0 mt-0.5">
                      {lec.lectureNumber}
                    </span>
                    <div>
                      <h4 className="text-[14px] font-bold text-white group-hover:text-[#4da2ff] transition-colors">
                        {lec.title}
                      </h4>
                      <div className="flex items-center gap-3 text-[11.5px] text-zinc-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {Math.round(lec.durationSec / 60)} mins
                        </span>
                        {lec.completed && (
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                            <CheckCircle2 size={12} />
                            Completed
                          </span>
                        )}
                        {lec.lastPositionSec > 0 && !lec.completed && (
                          <span className="text-[#4da2ff] font-medium">
                            Progress: {formatTime(lec.lastPositionSec)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onLaunchLecture(lec, lec.lastPositionSec, audioOnlyFocus)}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 text-[11.5px] font-semibold text-zinc-200 hover:text-white transition-all shrink-0"
                  >
                    <span>{lec.lastPositionSec > 0 ? t("Continue") : t("Start")}</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* Concept Notes / Micro-Chapters */}
                {lec.conceptNotes.length > 0 && (
                  <div className="border-t border-white/5 pt-2 mt-1 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                      <Bookmark size={10} />
                      <span>{t("Key Mathematical & Architectural Concepts")}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {lec.conceptNotes.map((note, idx) => (
                        <button
                          key={idx}
                          onClick={() => onLaunchLecture(lec, note.timestampSec, audioOnlyFocus)}
                          className="flex items-start gap-2 rounded-lg bg-black/30 border border-white/5 p-2 text-start hover:border-indigo-400/30 transition-all text-[11.5px]"
                        >
                          <span className="text-[10.5px] font-mono text-[#4da2ff] font-bold shrink-0 mt-0.5">
                            {formatTime(note.timestampSec)}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-200 truncate">{note.title}</div>
                            <div className="text-[10.5px] text-zinc-400 truncate">{note.note}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-3.5 bg-[#0e0f13] text-[11px] text-zinc-400">
          <span>{t("Stanford CS224W / CS229 Courseware Engine · Scaletempo2 Pitch Corrected · Zero Ads")}</span>
          <span className="font-mono text-zinc-500">libmpv --video=no focus enabled</span>
        </div>
      </div>
    </div>
  );
}
