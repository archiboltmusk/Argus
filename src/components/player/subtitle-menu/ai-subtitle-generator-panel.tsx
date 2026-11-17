import { useState } from "react";
import {
  Sparkles,
  Globe,
  Languages,
  Mic,
  BookOpen,
  Volume2,
  Check,
  Loader2,
  X,
  Download,
  ChevronDown,
  Clock,
  Zap,
} from "lucide-react";
import {
  useLiveTranscriptionSession,
  SUBTITLE_LANGUAGES,
  GENERATION_PROFILES,
  type GenerationMode,
} from "@/lib/subtitles/live-transcription-service";
import { useT } from "@/lib/i18n";

interface AISubtitleGeneratorPanelProps {
  onClose: () => void;
  mediaUrl: string | null;
  headers?: Record<string, string> | null;
  durationSec?: number | null;
  onAddSubtitle: (filePath: string, lang?: string, name?: string, metadata?: any) => Promise<boolean | void>;
}

export function AISubtitleGeneratorPanel({
  onClose,
  mediaUrl,
  headers,
  durationSec,
  onAddSubtitle,
}: AISubtitleGeneratorPanelProps) {
  const tr = useT();
  const session = useLiveTranscriptionSession();

  const [selectedLang, setSelectedLang] = useState<string>("auto");
  const [selectedMode, setSelectedMode] = useState<GenerationMode>("verbatim");
  const [cleanSdh, setCleanSdh] = useState<boolean>(true);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // Auto-switch to translate mode if user selects a non-English language and wants English subtitles
  const handleModeChange = (mode: GenerationMode) => {
    setSelectedMode(mode);
  };

  const currentLangLabel =
    SUBTITLE_LANGUAGES.find((l) => l.code === selectedLang)?.label || tr("Auto Detect");

  const handleStart = async () => {
    if (!mediaUrl) return;
    setExportNotice(null);

    const isTranslate = selectedMode === "translate";

    await session.start({
      mediaUrl,
      headers: headers ?? null,
      durationSec: durationSec ?? null,
      lang: selectedLang === "auto" ? null : selectedLang,
      translate: isTranslate,
      mode: selectedMode,
      cleanSdh,
      onAddTrack: async (filePath, lang, name) => {
        await onAddSubtitle(filePath, lang, name, {
          format: "srt",
          timingMeasurementStatus: "measured",
        });
      },
    });
  };

  const handleExport = async () => {
    const savedPath = await session.exportSrt();
    if (savedPath) {
      setExportNotice(tr("Saved to your files!"));
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  const mins = Math.floor(session.currentSec / 60);
  const totalMins = Math.floor(session.totalSec / 60);
  const remainingMins = Math.ceil(session.estimatedRemainingSec / 60);

  return (
    <div className="flex flex-col h-full w-full bg-surface-base text-ink select-none overflow-hidden animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-3.5 py-2.5 border-b border-edge-soft bg-surface-elevated/40">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent">
            <Sparkles size={14} strokeWidth={2.4} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-ink leading-none">
              {tr("Smart Subtitle Generator")}
            </h3>
            <p className="text-[10px] text-ink-muted mt-0.5">
              {tr("Generate spoken subtitles completely offline on your device")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={tr("Close")}
          className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-canvas/50 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5 scrollbar-thin">
        {/* Active Transcription Status Card */}
        {session.isActive && (
          <div className="rounded-xl border border-accent/40 bg-accent/5 p-3 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-accent font-semibold">
                <Loader2 size={13} className="animate-spin motion-reduce:[animation-duration:2.4s]" />
                <span>
                  {session.mode === "translate"
                    ? tr("Translating speech to English...")
                    : session.mode === "academic"
                    ? tr("Transcribing lecture dialogue...")
                    : tr("Transcribing spoken dialogue...")}
                </span>
              </div>
              <span className="font-mono font-bold text-accent text-xs">
                {session.progressPct}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-accent/20 overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300 ease-out"
                style={{ width: `${Math.max(4, session.progressPct)}%` }}
              />
            </div>

            {/* Telemetry Stats */}
            <div className="flex items-center justify-between text-[11px] text-ink-muted font-mono">
              <div className="flex items-center gap-1.5">
                <Clock size={11} className="text-accent" />
                <span>
                  {mins}m / {totalMins > 0 ? `${totalMins}m` : "..."}
                </span>
                {remainingMins > 0 && (
                  <span className="text-[10px] text-ink-muted/80">
                    (~{remainingMins}m left)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {session.speedMultiplier > 1 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-accent/15 text-[10px] font-bold text-accent">
                    <Zap size={9} />
                    {session.speedMultiplier}x speed
                  </span>
                )}
                <span>{session.cueCount} cues</span>
              </div>
            </div>

            {/* Live Snippet Box */}
            {session.latestSnippet && (
              <div className="mt-1.5 rounded-lg border border-edge-soft/60 bg-surface-base/80 p-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-ink-muted block mb-0.5">
                  {tr("Latest Spoken Sentence")}
                </span>
                <p className="italic text-ink font-sans line-clamp-2">
                  "{session.latestSnippet}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Spoken Language Dropdown */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
            {tr("Spoken Language")}
          </label>
          <div className="relative">
            <button
              type="button"
              disabled={session.isActive}
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-edge-soft bg-surface-elevated text-xs text-ink hover:border-accent/50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <Languages size={13} className="text-accent shrink-0" />
                <span className="font-medium">{currentLangLabel}</span>
              </div>
              <ChevronDown
                size={13}
                className={`text-ink-muted transition-transform ${langDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {langDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-44 overflow-y-auto rounded-lg border border-edge-soft bg-surface-elevated p-1 shadow-xl scrollbar-thin">
                {SUBTITLE_LANGUAGES.map((lang) => {
                  const isSelected = selectedLang === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setSelectedLang(lang.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isSelected
                          ? "bg-accent/15 text-accent font-semibold"
                          : "text-ink hover:bg-canvas/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{lang.label}</span>
                        {lang.nativeLabel && (
                          <span className="text-[10px] text-ink-muted">
                            ({lang.nativeLabel})
                          </span>
                        )}
                      </div>
                      {isSelected && <Check size={12} className="text-accent" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Generation Modes */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
            {tr("Subtitle Style")}
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {GENERATION_PROFILES.map((prof) => {
              const isSelected = selectedMode === prof.id;
              return (
                <button
                  key={prof.id}
                  type="button"
                  disabled={session.isActive}
                  onClick={() => handleModeChange(prof.id)}
                  className={`w-full flex flex-col text-start p-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? "border-accent bg-accent/10 shadow-sm"
                      : "border-edge-soft bg-surface-elevated hover:border-edge-strong"
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center justify-between w-full mb-0.5">
                    <div className="flex items-center gap-1.5">
                      {prof.id === "translate" ? (
                        <Globe size={13} className={isSelected ? "text-accent" : "text-ink-muted"} />
                      ) : prof.id === "academic" ? (
                        <BookOpen size={13} className={isSelected ? "text-accent" : "text-ink-muted"} />
                      ) : (
                        <Mic size={13} className={isSelected ? "text-accent" : "text-ink-muted"} />
                      )}
                      <span className={`text-xs font-semibold ${isSelected ? "text-accent" : "text-ink"}`}>
                        {tr(prof.name)}
                      </span>
                    </div>
                    {prof.badge && (
                      <span className="text-[9.5px] px-1.5 py-0.2 rounded font-bold uppercase bg-accent/15 text-accent">
                        {prof.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    {tr(prof.description)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Smart Dialogue Cleanup Option */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-edge-soft bg-surface-elevated">
          <div className="flex items-center gap-2">
            <Volume2 size={13} className="text-ink-muted" />
            <div>
              <span className="text-xs font-medium text-ink block">
                {tr("Clean Sound Effects")}
              </span>
              <span className="text-[10px] text-ink-muted block">
                {tr("Remove noise brackets like [Music] and [Applause] for clean spoken text")}
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={cleanSdh}
            disabled={session.isActive}
            onChange={(e) => setCleanSdh(e.target.checked)}
            className="h-4 w-4 rounded accent-accent cursor-pointer disabled:opacity-50"
          />
        </div>

        {/* Export Notification */}
        {exportNotice && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            <Check size={12} className="text-emerald-400" />
            <span>{exportNotice}</span>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="shrink-0 p-3 border-t border-edge-soft bg-surface-elevated/40 flex items-center justify-between gap-2">
        {session.filePath && !session.isActive && (
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-edge-soft bg-surface-elevated text-xs font-semibold text-ink hover:bg-canvas/50 transition-colors"
          >
            <Download size={13} />
            {tr("Save Subtitles (.srt)")}
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {session.isActive ? (
            <button
              type="button"
              onClick={() => void session.stop()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold transition-colors"
            >
              <X size={13} />
              {tr("Stop")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-accent-contrast text-xs font-bold hover:brightness-110 shadow-sm transition-all"
            >
              <Sparkles size={13} strokeWidth={2.4} />
              {session.cueCount > 0 ? tr("Regenerate Subtitles") : tr("Start Generating Subtitles")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}