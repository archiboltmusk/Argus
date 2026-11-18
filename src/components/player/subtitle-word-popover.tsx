import { useState } from "react";
import {
  BookOpen,
  BookmarkPlus,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { saveFlashcard } from "@/lib/subtitles/interactive-dictionary";
import type { MedicalPearl } from "@/lib/subtitles/medical-pearls-glossary";
import { useT } from "@/lib/i18n";

interface SubtitleWordPopoverProps {
  pearl: MedicalPearl | null;
  word?: string;
  sentenceContext?: string;
  mediaTitle?: string;
  onClose: () => void;
}

export function SubtitleWordPopover({
  pearl,
  word,
  sentenceContext = "",
  mediaTitle = "Lecture",
  onClose,
}: SubtitleWordPopoverProps) {
  const tr = useT();
  const [saved, setSaved] = useState(false);

  const termTitle = pearl?.term || word || "";
  const definition = pearl?.definition || tr("Key medical term highlighted in lecture dialogue.");
  const clinicalPearl = pearl?.pearl;
  const examTag = pearl?.examTag;

  const handleSaveFlashcard = () => {
    saveFlashcard({
      word: termTitle,
      definition: clinicalPearl ? `${definition} | Pearl: ${clinicalPearl}` : definition,
      sentenceContext,
      mediaTitle,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-sm rounded-2xl border border-edge-soft bg-surface-base shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-3.5 border-b border-edge-soft bg-surface-elevated/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-400">
              <BookOpen size={14} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink leading-none">{termTitle}</h4>
              {examTag && (
                <span className="text-[10px] text-amber-400 font-semibold mt-0.5 block">
                  {examTag}
                </span>
              )}
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

        {/* Content Body */}
        <div className="p-4 space-y-3 text-xs">
          {/* Definition */}
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider block mb-1">
              {tr("Core Definition")}
            </span>
            <p className="text-ink leading-relaxed font-sans">{definition}</p>
          </div>

          {/* Clinical Pearl Box */}
          {clinicalPearl && (
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                <Sparkles size={12} />
                <span>{tr("High-Yield Clinical Pearl")}</span>
              </div>
              <p className="text-ink text-[11.5px] leading-relaxed font-sans">
                {clinicalPearl}
              </p>
            </div>
          )}

          {/* Sentence Context */}
          {sentenceContext && (
            <div className="p-2 rounded-lg bg-surface-elevated text-[11px] text-ink-muted italic border border-edge-soft/50">
              "{sentenceContext}"
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-edge-soft bg-surface-elevated/40 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleSaveFlashcard}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              saved
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-accent text-accent-contrast hover:brightness-110 shadow-sm"
            }`}
          >
            {saved ? <Check size={13} /> : <BookmarkPlus size={13} />}
            <span>{saved ? tr("Saved to Flashcards!") : tr("Save to Flashcards")}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-muted hover:text-ink hover:bg-canvas/50 transition-colors"
          >
            {tr("Done")}
          </button>
        </div>
      </div>
    </div>
  );
}
