import { useState, useRef, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  RotateCcw,
  Layers,
  ArrowLeftRight,
  Info,
  Ruler,
} from "lucide-react";
import type { InteractiveImagingMeta } from "@/lib/education/qbank-types";

export type WindowPreset =
  | "standard"
  | "bone"
  | "brain"
  | "lung"
  | "soft_tissue"
  | "invert";

export interface BTRInteractiveImageProps {
  imageUrl: string;
  caption?: string;
  imagingMeta?: InteractiveImagingMeta;
}

export function BTRInteractiveImage({
  imageUrl,
  caption,
  imagingMeta,
}: BTRInteractiveImageProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [windowPreset, setWindowPreset] = useState<WindowPreset>("standard");
  const [showNormalComparison, setShowNormalComparison] = useState<boolean>(false);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);

  // Caliper Measurement Tool State
  const [caliperActive, setCaliperActive] = useState<boolean>(false);
  const [caliperLine, setCaliperLine] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [isDrawingCaliper, setIsDrawingCaliper] = useState<boolean>(false);

  // Pan dragging state
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(3.5, Math.round((z + 0.3) * 10) / 10));
  const handleZoomOut = () =>
    setZoomLevel((z) => {
      const next = Math.max(1, Math.round((z - 0.3) * 10) / 10);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });

  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setCaliperLine(null);
  };

  const getWindowFilter = () => {
    switch (windowPreset) {
      case "bone":
        // Bone window: high contrast, high window level (W: 2000, L: 500)
        return "contrast(2.4) brightness(0.85) grayscale(1)";
      case "brain":
        // Brain window: narrow window (W: 80, L: 40) - emphasizes subtle white/gray matter differentiation & subdural / epidural hematomas
        return "contrast(1.8) brightness(1.05) grayscale(1)";
      case "lung":
        // Lung window: wide window, negative center (W: 1500, L: -600) - brings out parenchyma and pneumothorax lines
        return "contrast(1.5) brightness(1.3) grayscale(0.8)";
      case "soft_tissue":
        // Soft tissue / Abdominal window (W: 350, L: 50)
        return "contrast(1.35) brightness(1.0) saturate(1.1)";
      case "invert":
        // Negative / Film Invert
        return "invert(1) contrast(1.2)";
      default:
        return "none";
    }
  };

  // Normal comparison fallback images for common modalities
  const normalUrl =
    imagingMeta?.normalReferenceUrl ||
    (imageUrl.includes("CT") || imageUrl.includes("head")
      ? "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80"
      : undefined);

  // Mouse / Touch handlers for Caliper and Pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (caliperActive) {
        setIsDrawingCaliper(true);
        setCaliperLine({ x1: x, y1: y, x2: x, y2: y });
      } else if (zoomLevel > 1) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      }
    },
    [caliperActive, zoomLevel, panOffset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isDrawingCaliper && caliperLine) {
        setCaliperLine((prev) => (prev ? { ...prev, x2: x, y2: y } : null));
      } else if (isPanning) {
        setPanOffset({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
      }
    },
    [isDrawingCaliper, caliperLine, isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawingCaliper(false);
    setIsPanning(false);
  }, []);

  // Calculate caliper distance in mm (assuming roughly 0.25mm per screen pixel)
  let caliperDistanceMm = 0;
  if (caliperLine) {
    const dx = caliperLine.x2 - caliperLine.x1;
    const dy = caliperLine.y2 - caliperLine.y1;
    const px = Math.sqrt(dx * dx + dy * dy);
    caliperDistanceMm = Math.round(px * 0.25 * 10) / 10;
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-black/40 border border-edge p-3 relative overflow-hidden select-none mb-4">
      {/* Top Floating Image HUD */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-surface/90 backdrop-blur-md border border-edge text-xs z-10">
        <div className="flex items-center gap-1.5 text-white/80 font-bold">
          <Layers size={13} className="text-amber-400" />
          <span className="text-[11px] uppercase tracking-wider">
            {showNormalComparison ? "Comparative Split View" : "Diagnostic Clinical Scan"}
          </span>
          <span className="text-[10px] text-white/40 font-mono">
            ({Math.round(zoomLevel * 100)}%)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {/* Zoom & Pan Controls */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 1}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition disabled:opacity-30"
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3.5}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition disabled:opacity-30"
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          {(zoomLevel > 1 || panOffset.x !== 0 || panOffset.y !== 0 || caliperLine) && (
            <button
              type="button"
              onClick={handleReset}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition"
              title="Reset Zoom & Pan"
            >
              <RotateCcw size={13} />
            </button>
          )}

          {/* Radiologic Window Presets */}
          <div className="flex items-center gap-0.5 rounded-lg bg-white/5 border border-white/10 p-0.5 ml-1">
            {(
              [
                { id: "standard", label: "Std" },
                { id: "bone", label: "Bone" },
                { id: "brain", label: "Brain" },
                { id: "lung", label: "Lung" },
                { id: "soft_tissue", label: "Soft" },
                { id: "invert", label: "Inv" },
              ] as { id: WindowPreset; label: string }[]
            ).map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWindowPreset(w.id)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition ${
                  windowPreset === w.id
                    ? "bg-white text-black shadow-xs"
                    : "text-white/60 hover:text-white"
                }`}
                title={`${w.label} Window Preset`}
              >
                {w.label}
              </button>
            ))}
          </div>

          {/* Caliper Measurement Toggle */}
          <button
            type="button"
            onClick={() => setCaliperActive(!caliperActive)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition ml-1 ${
              caliperActive
                ? "bg-blue-500 text-white shadow-xs"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
            title="Measure lesion diameter in mm"
          >
            <Ruler size={11} />
            <span>Caliper</span>
          </button>

          {/* Toggle Normal Anatomy Comparison */}
          {normalUrl && (
            <button
              type="button"
              onClick={() => setShowNormalComparison(!showNormalComparison)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition ml-1 ${
                showNormalComparison
                  ? "bg-amber-500 text-black shadow-xs"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
              title="Toggle Side-by-Side Normal Anatomy"
            >
              <ArrowLeftRight size={11} />
              <span>Normal vs Abnormal</span>
            </button>
          )}

          {/* Toggle Diagnostic Annotation Overlays */}
          {imagingMeta?.annotations && imagingMeta.annotations.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition ml-1 ${
                showAnnotations
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-white/10 text-white/60"
              }`}
              title="Toggle Diagnostic Pathology Overlays"
            >
              {showAnnotations ? <Eye size={11} /> : <EyeOff size={11} />}
              <span>Overlays</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-black min-h-[240px] max-h-[400px] select-none ${
          caliperActive
            ? "cursor-crosshair"
            : zoomLevel > 1
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-default"
        }`}
      >
        {showNormalComparison && normalUrl ? (
          /* Side-by-side comparative split */
          <div className="grid grid-cols-2 gap-2 w-full h-full p-2">
            <div className="relative flex flex-col items-center justify-center bg-black/60 rounded-lg overflow-hidden border border-white/10">
              <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-emerald-500/80 text-white text-[9px] font-black uppercase tracking-wider backdrop-blur-xs">
                Normal Anatomy
              </span>
              <img
                src={normalUrl}
                alt="Normal Reference"
                className="w-full h-full object-contain max-h-[320px]"
              />
              <span className="text-[10px] text-white/60 p-1">
                {imagingMeta?.normalCaption || "Normal anatomical control reference"}
              </span>
            </div>

            <div className="relative flex flex-col items-center justify-center bg-black/60 rounded-lg overflow-hidden border border-rose-500/30">
              <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-rose-500/80 text-white text-[9px] font-black uppercase tracking-wider backdrop-blur-xs">
                Patient Pathology
              </span>
              <img
                src={imageUrl}
                alt="Patient Pathology"
                className="w-full h-full object-contain max-h-[320px]"
              />
              <span className="text-[10px] text-rose-300 p-1">
                {imagingMeta?.abnormalCaption || caption || "Diagnostic pathological lesion"}
              </span>
            </div>
          </div>
        ) : (
          /* Single Interactive Image View with Zoom, Pan, and Caliper Line */
          <div
            className="relative w-full h-full flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${
                panOffset.y / zoomLevel
              }px)`,
              transformOrigin: "center center",
            }}
          >
            <img
              src={imageUrl}
              alt={caption || "Clinical image"}
              className="max-h-[380px] w-auto max-w-full object-contain rounded-lg transition"
              style={{ filter: getWindowFilter() }}
              loading="lazy"
              draggable={false}
            />

            {/* Diagnostic Marker Overlay Badges */}
            {showAnnotations &&
              imagingMeta?.annotations?.map((ann) => (
                <div
                  key={ann.id}
                  className="absolute z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500 text-black font-extrabold text-[10px] shadow-lg animate-pulse ring-2 ring-white/60 pointer-events-auto"
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  title={ann.description || ann.label}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-black animate-ping" />
                  <span>{ann.label}</span>
                </div>
              ))}
          </div>
        )}

        {/* Caliper Drawing SVG Overlay */}
        {caliperLine && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
            <line
              x1={caliperLine.x1}
              y1={caliperLine.y1}
              x2={caliperLine.x2}
              y2={caliperLine.y2}
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray="4 3"
            />
            {/* End point crosses */}
            <circle cx={caliperLine.x1} cy={caliperLine.y1} r="4" fill="#0284c7" stroke="#fff" />
            <circle cx={caliperLine.x2} cy={caliperLine.y2} r="4" fill="#0284c7" stroke="#fff" />
            {/* Text badge in center */}
            <text
              x={(caliperLine.x1 + caliperLine.x2) / 2 + 8}
              y={(caliperLine.y1 + caliperLine.y2) / 2 - 8}
              fill="#38bdf8"
              fontSize="12"
              fontWeight="bold"
              className="drop-shadow-md"
            >
              {caliperDistanceMm} mm
            </text>
          </svg>
        )}
      </div>

      {/* Caption & Caliper Measurements Footer */}
      <div className="flex items-center justify-between gap-2 px-2 py-1 text-[11px] text-white/70">
        <div className="flex items-center gap-1.5">
          <Info size={12} className="text-amber-400 shrink-0" />
          <span>{caption || "Clinical imaging examination"}</span>
        </div>
        {caliperLine && (
          <span className="font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
            Lesion Diameter: {caliperDistanceMm} mm
          </span>
        )}
      </div>
    </div>
  );
}
