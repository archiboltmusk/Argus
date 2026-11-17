import { useState, useRef, useEffect, useCallback } from "react";
import {
  Pen,
  Highlighter,
  Type,
  Eraser,
  RotateCcw,
  Save,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

interface DrawPoint {
  x: number;
  y: number;
}

interface DrawStroke {
  id: string;
  tool: "pen" | "highlighter" | "eraser";
  color: string;
  width: number;
  points: DrawPoint[];
}

interface TextNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

interface BTRCanvasMarkupProps {
  storageKey: string;
  enabled: boolean;
  onToggleEnabled: () => void;
}

const PEN_COLORS = [
  { name: "Indigo", hex: "#6366f1" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "White", hex: "#ffffff" },
];

export function BTRCanvasMarkup({
  storageKey,
  enabled,
  onToggleEnabled,
}: BTRCanvasMarkupProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Tools: pen, highlighter, text, eraser
  const [currentTool, setCurrentTool] = useState<"pen" | "highlighter" | "text" | "eraser">("pen");
  const [selectedColor, setSelectedColor] = useState<string>("#6366f1");
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawStroke | null>(null);
  const [textNotes, setTextNotes] = useState<TextNote[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [hideMarkup, setHideMarkup] = useState(false);

  // Load saved strokes from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`btr_markup_${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.strokes)) setStrokes(parsed.strokes);
        if (Array.isArray(parsed.textNotes)) setTextNotes(parsed.textNotes);
      } else {
        setStrokes([]);
        setTextNotes([]);
      }
    } catch {}
  }, [storageKey]);

  // Save strokes to localStorage
  const saveMarkup = useCallback(() => {
    try {
      localStorage.setItem(
        `btr_markup_${storageKey}`,
        JSON.stringify({ strokes, textNotes })
      );
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    } catch {}
  }, [storageKey, strokes, textNotes]);

  // Redraw canvas whenever strokes change or dimensions resize
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (hideMarkup) return;

    // Draw all completed strokes
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.tool === "highlighter") {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.globalAlpha = 0.35;
      } else if (stroke.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = stroke.width;
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.globalAlpha = 0.95;
      }

      ctx.stroke();
      ctx.restore();
    }
  }, [strokes, currentStroke, hideMarkup]);

  // Resize canvas to match container
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redraw();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled || hideMarkup) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === "text") {
      const newNote: TextNote = {
        id: `note-${Date.now()}`,
        x,
        y,
        text: "",
        color: selectedColor,
      };
      setTextNotes((prev) => [...prev, newNote]);
      setActiveTextId(newNote.id);
      return;
    }

    setIsDrawing(true);
    const width = currentTool === "highlighter" ? 18 : currentTool === "eraser" ? 22 : 2.5;
    const newStroke: DrawStroke = {
      id: `stroke-${Date.now()}`,
      tool: currentTool,
      color: selectedColor,
      width,
      points: [{ x, y }],
    };
    setCurrentStroke(newStroke);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentStroke((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, { x, y }],
      };
    });
  };

  const handlePointerUp = () => {
    if (isDrawing && currentStroke) {
      setStrokes((prev) => [...prev, currentStroke]);
      setCurrentStroke(null);
      setIsDrawing(false);
      saveMarkup();
    }
  };

  const handleClear = () => {
    setStrokes([]);
    setTextNotes([]);
    localStorage.removeItem(`btr_markup_${storageKey}`);
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-30 pointer-events-none overflow-hidden select-none ${
        enabled ? "ring-1 ring-white/30" : ""
      }`}
    >
      {/* Canvas Layer */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`w-full h-full ${
          enabled && !hideMarkup ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
        }`}
      />

      {/* Floating Active Recall Text Inputs */}
      {textNotes.map((note) => (
        <div
          key={note.id}
          style={{ left: `${note.x}px`, top: `${note.y}px` }}
          className={`absolute ${enabled ? "pointer-events-auto" : "pointer-events-none"}`}
        >
          <input
            type="text"
            value={note.text}
            autoFocus={activeTextId === note.id}
            onChange={(e) => {
              const val = e.target.value;
              setTextNotes((prev) =>
                prev.map((n) => (n.id === note.id ? { ...n, text: val } : n))
              );
            }}
            onBlur={() => {
              setActiveTextId(null);
              saveMarkup();
            }}
            placeholder="Type answer..."
            style={{ color: note.color }}
            className="bg-black/80 px-2 py-0.5 rounded-lg border border-edge text-xs font-bold outline-none shadow-md backdrop-blur-sm"
          />
        </div>
      ))}

      {/* Markup Floating Palette Toolbar */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-surface/95 backdrop-blur-md border border-edge shadow-2xl z-40">
        <button
          type="button"
          onClick={onToggleEnabled}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            enabled
              ? "bg-white text-black font-semibold shadow-md"
              : "bg-white/10 text-white/70 hover:text-white"
          }`}
          title="Toggle Active Recall Pen Layer"
        >
          <Pen size={12} />
          <span>{enabled ? "Active Recall Markup ON" : "Fill Blanks"}</span>
        </button>

        {enabled && (
          <>
            <div className="h-4 w-px bg-white/20 mx-1" />

            {/* Tools */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentTool("pen")}
                className={`p-1.5 rounded-lg transition ${
                  currentTool === "pen"
                    ? "bg-white/15 text-white ring-1 ring-white/40"
                    : "text-white/60 hover:text-white"
                }`}
                title="Pen (Fine Point)"
              >
                <Pen size={13} />
              </button>

              <button
                type="button"
                onClick={() => setCurrentTool("highlighter")}
                className={`p-1.5 rounded-lg transition ${
                  currentTool === "highlighter"
                    ? "bg-amber-500/30 text-amber-300 ring-1 ring-amber-400"
                    : "text-white/60 hover:text-white"
                }`}
                title="Volatiles Highlighter"
              >
                <Highlighter size={13} />
              </button>

              <button
                type="button"
                onClick={() => setCurrentTool("text")}
                className={`p-1.5 rounded-lg transition ${
                  currentTool === "text"
                    ? "bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400"
                    : "text-white/60 hover:text-white"
                }`}
                title="Type Fill-in-Blank Text"
              >
                <Type size={13} />
              </button>

              <button
                type="button"
                onClick={() => setCurrentTool("eraser")}
                className={`p-1.5 rounded-lg transition ${
                  currentTool === "eraser"
                    ? "bg-rose-500/30 text-rose-300 ring-1 ring-rose-400"
                    : "text-white/60 hover:text-white"
                }`}
                title="Eraser"
              >
                <Eraser size={13} />
              </button>
            </div>

            {/* Color Palette */}
            {currentTool !== "eraser" && (
              <div className="flex items-center gap-1 px-1">
                {PEN_COLORS.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => setSelectedColor(col.hex)}
                    style={{ backgroundColor: col.hex }}
                    className={`h-4 w-4 rounded-full transition transform hover:scale-110 ${
                      selectedColor === col.hex
                        ? "ring-2 ring-white scale-110 shadow-sm"
                        : "opacity-75"
                    }`}
                    title={col.name}
                  />
                ))}
              </div>
            )}

            <div className="h-4 w-px bg-white/20 mx-1" />

            {/* Hide / Reveal Toggle for Active Recall */}
            <button
              type="button"
              onClick={() => setHideMarkup(!hideMarkup)}
              className="p-1.5 rounded-lg text-white/60 hover:text-white transition"
              title={hideMarkup ? "Reveal Annotations" : "Hide to Test Memory"}
            >
              {hideMarkup ? <Eye size={13} className="text-amber-400" /> : <EyeOff size={13} />}
            </button>

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-white/60 hover:text-rose-400 transition"
              title="Clear Page Annotations"
            >
              <RotateCcw size={13} />
            </button>

            {/* Save Status */}
            <button
              type="button"
              onClick={saveMarkup}
              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 transition"
              title="Save Annotations"
            >
              {savedNotice ? <Check size={13} /> : <Save size={13} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
