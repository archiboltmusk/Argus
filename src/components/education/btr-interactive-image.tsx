import { useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  RotateCcw,
  Layers,
  ArrowLeftRight,
  Info,
} from "lucide-react";
import type { InteractiveImagingMeta } from "@/lib/education/qbank-types";

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
  const [showNormalComparison, setShowNormalComparison] = useState<boolean>(false);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(3, Math.round((z + 0.3) * 10) / 10));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(1, Math.round((z - 0.3) * 10) / 10));
  const handleResetZoom = () => setZoomLevel(1);

  // Normal comparison fallback images for common modalities
  const normalUrl =
    imagingMeta?.normalReferenceUrl ||
    (imageUrl.includes("CT") || imageUrl.includes("head")
      ? "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80"
      : undefined);

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-black/40 border border-edge p-3 relative overflow-hidden select-none mb-4">
      {/* Top Floating Image HUD */}
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-surface/90 backdrop-blur-md border border-edge text-xs z-10">
        <div className="flex items-center gap-1.5 text-white/80 font-bold">
          <Layers size={13} className="text-amber-400" />
          <span className="text-[11px] uppercase tracking-wider">
            {showNormalComparison ? "Comparative Split View" : "Diagnostic Clinical Scan"}
          </span>
          <span className="text-[10px] text-white/40 font-mono">({Math.round(zoomLevel * 100)}%)</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom controls */}
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
            disabled={zoomLevel >= 3}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition disabled:opacity-30"
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          {zoomLevel > 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition"
              title="Reset Fit"
            >
              <RotateCcw size={13} />
            </button>
          )}

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
      <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-black min-h-[220px] max-h-[380px]">
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
          /* Single Interactive Image View with Zoom and Annotations */
          <div
            className="relative w-full h-full flex items-center justify-center transition-transform duration-200"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "center center",
            }}
          >
            <img
              src={imageUrl}
              alt={caption || "Clinical image"}
              className="max-h-[360px] w-auto max-w-full object-contain rounded-lg"
              loading="lazy"
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
      </div>

      {/* Caption footer if provided */}
      {caption && !showNormalComparison && (
        <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-white/70">
          <Info size={12} className="text-amber-400 shrink-0" />
          <span>{caption}</span>
        </div>
      )}
    </div>
  );
}
