import { useState, useRef, useCallback, type MouseEvent } from "react";
import { Trash2, Eye, EyeOff } from "lucide-react";
import type { OcclusionBox } from "@/lib/education/types";

export type ImageOcclusionCanvasProps = {
  imageUrl: string;
  boxes: OcclusionBox[];
  onChange?: (boxes: OcclusionBox[]) => void;
  interactive?: boolean; // In review mode: clicking toggles reveal
};

export function ImageOcclusionCanvas({
  imageUrl,
  boxes,
  onChange,
  interactive = false,
}: ImageOcclusionCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Mouse handlers for drawing boxes
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (interactive || !onChange) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setDrawing(true);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!drawing || !startPos) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setCurrentPos({ x, y });
  };

  const handleMouseUp = () => {
    if (!drawing || !startPos || !currentPos || !onChange) {
      setDrawing(false);
      setStartPos(null);
      setCurrentPos(null);
      return;
    }

    const xPct = Math.min(startPos.x, currentPos.x);
    const yPct = Math.min(startPos.y, currentPos.y);
    const wPct = Math.abs(currentPos.x - startPos.x);
    const hPct = Math.abs(currentPos.y - startPos.y);

    // Filter tiny clicks (less than 2% size)
    if (wPct > 2 && hPct > 2) {
      const newBox: OcclusionBox = {
        id: `occ_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        xPct,
        yPct,
        wPct,
        hPct,
      };
      onChange([...boxes, newBox]);
    }

    setDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  const handleDeleteBox = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    if (onChange) {
      onChange(boxes.filter((b) => b.id !== id));
    }
  };

  const toggleReveal = (id: string) => {
    if (!interactive) return;
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRevealAll = useCallback(() => {
    if (revealedIds.size === boxes.length) {
      setRevealedIds(new Set());
    } else {
      setRevealedIds(new Set(boxes.map((b) => b.id)));
    }
  }, [revealedIds, boxes]);

  return (
    <div className="flex flex-col gap-2 select-none">
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          {interactive
            ? "Tap any masked box to test recall"
            : "Click & drag on image to mask key terms / diagrams"}
        </span>
        {interactive && boxes.length > 0 && (
          <button
            type="button"
            onClick={toggleRevealAll}
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            {revealedIds.size === boxes.length ? (
              <>
                <EyeOff className="w-3.5 h-3.5" /> Hide All
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" /> Reveal All
              </>
            )}
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative w-full max-h-[360px] flex items-center justify-center overflow-hidden rounded-md border border-border/60 bg-black/40 ${
          !interactive ? "cursor-crosshair" : ""
        }`}
      >
        <img
          src={imageUrl}
          alt="Slide snapshot"
          className="max-h-[360px] w-auto object-contain pointer-events-none"
        />

        {/* Existing Occlusion Boxes */}
        {boxes.map((box, idx) => {
          const isRevealed = interactive && revealedIds.has(box.id);
          return (
            <div
              key={box.id}
              onClick={() => toggleReveal(box.id)}
              style={{
                left: `${box.xPct}%`,
                top: `${box.yPct}%`,
                width: `${box.wPct}%`,
                height: `${box.hPct}%`,
              }}
              className={`absolute border transition-colors flex items-center justify-center group ${
                isRevealed
                  ? "border-emerald-500/80 bg-emerald-500/10 cursor-pointer"
                  : interactive
                    ? "border-amber-400 bg-amber-500/90 text-black font-semibold text-xs shadow-md cursor-pointer hover:bg-amber-400"
                    : "border-sky-500 bg-sky-500/70 text-white text-[10px]"
              }`}
            >
              {!interactive ? (
                <>
                  <span className="font-mono text-[9px] drop-shadow-sm px-1">#{idx + 1}</span>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteBox(e, box.id)}
                    className="absolute -top-2.5 -right-2.5 hidden group-hover:flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground shadow hover:scale-110 transition-transform"
                    title="Remove mask"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              ) : (
                !isRevealed && <span className="font-mono text-[10px]">[{idx + 1}]</span>
              )}
            </div>
          );
        })}

        {/* Active Drawing Preview Box */}
        {drawing && startPos && currentPos && (
          <div
            style={{
              left: `${Math.min(startPos.x, currentPos.x)}%`,
              top: `${Math.min(startPos.y, currentPos.y)}%`,
              width: `${Math.abs(currentPos.x - startPos.x)}%`,
              height: `${Math.abs(currentPos.y - startPos.y)}%`,
            }}
            className="absolute border-2 border-dashed border-sky-400 bg-sky-400/30 pointer-events-none"
          />
        )}
      </div>

      {!interactive && boxes.length > 0 && (
        <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
          <span>{boxes.length} mask{boxes.length > 1 ? "s" : ""} created</span>
          <button
            type="button"
            onClick={() => onChange?.([])}
            className="text-[11px] text-destructive hover:underline"
          >
            Clear all masks
          </button>
        </div>
      )}
    </div>
  );
}
