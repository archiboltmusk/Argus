import { useState, useMemo } from "react";
import { X, Sparkles, RotateCw, Download, CheckCircle2, ChevronRight, BookOpen } from "lucide-react";
import {
  type Flashcard,
  type CardRating,
  reviewFlashcard,
  exportFlashcardsToAnkiText,
} from "@/lib/education/flashcard-generator";
import { KaTeXRenderer } from "./derivation-scratchpad";

export interface FlashcardReviewModalProps {
  open: boolean;
  onClose: () => void;
  cards: Flashcard[];
  onCardsUpdated?: (updated: Flashcard[]) => void;
  courseTitle?: string;
}

export function FlashcardReviewModal({
  open,
  onClose,
  cards: initialCards,
  onCardsUpdated,
  courseTitle = "Academic Masterclass",
}: FlashcardReviewModalProps) {
  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const activeCard = useMemo(() => {
    return cards[currentIndex] || null;
  }, [cards, currentIndex]);

  if (!open) return null;

  const handleRate = (rating: CardRating) => {
    if (!activeCard) return;

    const updatedCard = reviewFlashcard(activeCard, rating);
    const updatedCards = [...cards];
    updatedCards[currentIndex] = updatedCard;

    setCards(updatedCards);
    onCardsUpdated?.(updatedCards);
    setReviewedCount((prev) => prev + 1);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      setIsFlipped(true);
    }
  };

  const handleDownloadAnki = () => {
    const { filename, textData } = exportFlashcardsToAnkiText(courseTitle, cards);
    const blob = new Blob([textData], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isCompleted = currentIndex >= cards.length - 1 && isFlipped;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-2xl bg-[#0b0c14]/95 border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/10 overflow-hidden text-zinc-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wider uppercase text-amber-400">
                Spaced Repetition &bull; Active Recall
              </div>
              <h2 className="text-sm font-medium text-zinc-300">
                {courseTitle} ({currentIndex + 1} of {cards.length})
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAnki}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-700 text-xs text-zinc-300 transition-colors"
              title="Export to Anki deck package"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Anki</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-900 h-1">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${Math.round(((currentIndex + (isCompleted ? 1 : 0)) / Math.max(1, cards.length)) * 100)}%` }}
          />
        </div>

        {/* Card Arena */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[320px] flex flex-col justify-center">
          {cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="w-12 h-12 text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-400">No flashcards generated for this lecture yet.</p>
              <p className="text-xs text-zinc-600 mt-1">Capture derivations in the Scratchpad to build your deck.</p>
            </div>
          ) : activeCard ? (
            <div className="flex flex-col gap-4">
              {/* Card Surface */}
              <div
                onClick={() => setIsFlipped((prev) => !prev)}
                className="cursor-pointer group relative p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/40 transition-all shadow-inner flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-amber-500/90 font-mono mb-2">
                    <span>{activeCard.sourceLectureTitle}</span>
                    <span className="bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      @{activeCard.timestampLabel}
                    </span>
                  </div>

                  {/* Front Prompt */}
                  <div className="text-sm text-zinc-200 leading-relaxed font-normal whitespace-pre-line">
                    {activeCard.front}
                  </div>

                  {/* Back Answer (Flipped) */}
                  {isFlipped && (
                    <div className="mt-5 pt-4 border-t border-zinc-800 animate-in fade-in duration-200">
                      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                        Theoretical Solution
                      </div>
                      <div className="text-sm text-zinc-300 whitespace-pre-line">
                        {activeCard.back}
                      </div>
                      {activeCard.formulaLatex && (
                        <div className="mt-3 p-3 rounded-lg bg-black/60 border border-emerald-500/20 overflow-x-auto text-emerald-300">
                          <KaTeXRenderer latex={activeCard.formulaLatex} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Flip indicator */}
                <div className="mt-4 pt-3 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800/40">
                  <span className="flex items-center gap-1 group-hover:text-amber-400 transition-colors">
                    <RotateCw className="w-3.5 h-3.5" />
                    {isFlipped ? "Click to flip back" : "Click anywhere to flip"}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-600">
                    Difficulty: {activeCard.difficulty} &bull; Interval: {activeCard.intervalDays}d
                  </span>
                </div>
              </div>

              {/* FSRS Rating Buttons */}
              {isFlipped && (
                <div className="grid grid-cols-4 gap-2 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <button
                    onClick={() => handleRate(1)}
                    className="flex flex-col items-center p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 hover:bg-red-900/40 text-red-300 transition-colors"
                  >
                    <span className="text-xs font-semibold">Again</span>
                    <span className="text-[10px] text-red-400/80">1d (Reset)</span>
                  </button>
                  <button
                    onClick={() => handleRate(2)}
                    className="flex flex-col items-center p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 hover:bg-amber-900/40 text-amber-300 transition-colors"
                  >
                    <span className="text-xs font-semibold">Hard</span>
                    <span className="text-[10px] text-amber-400/80">
                      {Math.max(1, Math.round(activeCard.intervalDays * 1.2))}d
                    </span>
                  </button>
                  <button
                    onClick={() => handleRate(3)}
                    className="flex flex-col items-center p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 hover:bg-emerald-900/40 text-emerald-300 transition-colors"
                  >
                    <span className="text-xs font-semibold">Good</span>
                    <span className="text-[10px] text-emerald-400/80">
                      {Math.max(2, Math.round(activeCard.intervalDays * activeCard.easeFactor))}d
                    </span>
                  </button>
                  <button
                    onClick={() => handleRate(4)}
                    className="flex flex-col items-center p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/30 hover:bg-blue-900/40 text-blue-300 transition-colors"
                  >
                    <span className="text-xs font-semibold">Easy</span>
                    <span className="text-[10px] text-blue-400/80">
                      {Math.max(4, Math.round(activeCard.intervalDays * activeCard.easeFactor * 1.3))}d
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800/80 bg-zinc-950/50 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reviewed {reviewedCount} of {cards.length} cards</span>
          </div>
          {currentIndex < cards.length - 1 ? (
            <button
              onClick={() => {
                setCurrentIndex((prev) => prev + 1);
                setIsFlipped(false);
              }}
              className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
            >
              <span>Skip</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-3 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
