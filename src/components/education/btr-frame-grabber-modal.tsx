import { useState, useRef, useEffect } from "react";
import {
  X,
  Camera,
  Sparkles,
  Check,
  Tag,
  Square,
  RotateCcw,
} from "lucide-react";
import { saveStudyNote } from "@/lib/education/notes";
import { reviewFSRSCard } from "@/lib/education/btr-fsrs-engine";

interface OcclusionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BTRFrameGrabberModalProps {
  open: boolean;
  onClose: () => void;
  frameDataUrl: string | null;
  lectureTitle: string;
  subjectName: string;
  timestampSec: number;
  timestampLabel: string;
}

export function BTRFrameGrabberModal({
  open,
  onClose,
  frameDataUrl,
  lectureTitle,
  subjectName,
  timestampSec,
  timestampLabel,
}: BTRFrameGrabberModalProps) {
  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("Spotter");
  const [occlusionBoxes, setOcclusionBoxes] = useState<OcclusionBox[]>([]);
  const [isDrawingBox, setIsDrawingBox] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<OcclusionBox | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setPrompt(`Identify the diagnostic finding shown in ${subjectName} lecture (${timestampLabel})`);
      setAnswer("");
      setOcclusionBoxes([]);
      setSavedSuccess(false);
    }
  }, [open, subjectName, timestampLabel]);

  // Render image and occlusion boxes onto canvas
  useEffect(() => {
    if (!open || !frameDataUrl) return;

    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = frameDataUrl;
    img.onload = () => {
      canvas.width = img.naturalWidth || 640;
      canvas.height = img.naturalHeight || 360;

      // Draw base frame
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw occlusion boxes
      const allBoxes = currentBox ? [...occlusionBoxes, currentBox] : occlusionBoxes;
      for (const box of allBoxes) {
        ctx.save();
        ctx.fillStyle = "rgba(15, 16, 29, 0.95)";
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 3;
        ctx.fillRect(box.x, box.y, box.width, box.height);
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Add "TAP TO REVEAL" label in the box
        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("OCCLUSION MASK", box.x + 8, box.y + Math.max(16, box.height / 2 + 4));
        ctx.restore();
      }
    };
  }, [open, frameDataUrl, occlusionBoxes, currentBox]);

  if (!open || !frameDataUrl) return null;

  // Drag-to-draw occlusion box
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawingBox(true);
    setStartPoint({ x, y });
    setCurrentBox({ x, y, width: 0, height: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingBox || !startPoint) return;
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    const x = Math.min(startPoint.x, currentX);
    const y = Math.min(startPoint.y, currentY);
    const width = Math.abs(currentX - startPoint.x);
    const height = Math.abs(currentY - startPoint.y);

    setCurrentBox({ x, y, width, height });
  };

  const handlePointerUp = () => {
    if (isDrawingBox && currentBox && currentBox.width > 10 && currentBox.height > 10) {
      setOcclusionBoxes((prev) => [...prev, currentBox]);
    }
    setIsDrawingBox(false);
    setStartPoint(null);
    setCurrentBox(null);
  };

  // Save to FSRS Error Vault
  const handleSaveToFSRS = () => {
    const canvas = imageCanvasRef.current;
    const maskedImageUrl = canvas ? canvas.toDataURL("image/jpeg", 0.85) : frameDataUrl;

    const noteId = `frame-${Date.now()}`;
    saveStudyNote({
      itemId: noteId,
      itemTitle: `[${selectedTag}] ${subjectName}: ${prompt.slice(0, 50)}`,
      timestampSec,
      timestampLabel,
      markdown: `**Lecture:** ${lectureTitle}\n\n**Prompt:** ${prompt}\n\n**Master Answer:** ${answer}\n\n![Captured Spotter](${maskedImageUrl})`,
      highYield: true,
      topic: `${subjectName} Volatiles`,
    });

    // Schedule initial FSRS review
    reviewFSRSCard(noteId, 3);

    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-3xl bg-surface border border-edge shadow-2xl p-6 flex flex-col gap-4 text-white max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-edge">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 border border-edge text-ink-muted flex items-center justify-center">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Capture Video Frame to FSRS Vault</h3>
              <p className="text-xs text-ink-muted">
                {subjectName} • {lectureTitle} ({timestampLabel})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Canvas / Image Occlusion Editor */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span className="flex items-center gap-1 font-semibold text-amber-400">
              <Square size={13} /> Click & Drag on image to add Image Occlusion Blur Mask
            </span>
            {occlusionBoxes.length > 0 && (
              <button
                type="button"
                onClick={() => setOcclusionBoxes([])}
                className="text-white/60 hover:text-rose-400 transition flex items-center gap-1"
              >
                <RotateCcw size={12} />
                <span>Reset Masks ({occlusionBoxes.length})</span>
              </button>
            )}
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video flex items-center justify-center shadow-inner">
            <canvas
              ref={imageCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-full h-full object-contain cursor-crosshair touch-none"
            />
          </div>
        </div>

        {/* Inputs */}
        <div className="flex flex-col gap-3">
          {/* Tag Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-white/50 flex items-center gap-1 mr-1">
              <Tag size={12} /> Tag:
            </span>
            {["Spotter", "Radiology_Sign", "Histopathology", "Anatomy_Trap", "ECG", "DOC_Formula"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTag(t)}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                  selectedTag === t
                    ? "bg-white text-black font-semibold shadow-xs"
                    : "bg-white/5 text-white/60 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Flashcard Prompt */}
          <div>
            <label className="text-xs font-bold text-white/70 mb-1 block">Flashcard Prompt / Question</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Identify this sign and associated pathology..."
              className="w-full rounded-xl bg-elevated border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-edge transition"
            />
          </div>

          {/* Master Answer */}
          <div>
            <label className="text-xs font-bold text-white/70 mb-1 block">Master Answer / Board Rule</label>
            <textarea
              rows={2}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="e.g. Rigler's double-wall sign indicating pneumoperitoneum due to visceral perforation."
              className="w-full rounded-xl bg-elevated border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-edge transition resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-edge">
          <span className="text-[11px] text-white/40">
            Automatically schedules spaced repetition in FSRS Error Vault.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!answer.trim() || savedSuccess}
              onClick={handleSaveToFSRS}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                savedSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-white hover:bg-white/90 text-black font-semibold disabled:opacity-40"
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check size={14} />
                  <span>Saved to FSRS!</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Save to FSRS Error Vault</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
