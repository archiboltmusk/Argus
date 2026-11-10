import { useEffect, useRef } from "react";
import { SFX } from "@/lib/sfx";

interface ProjectorTestPatternProps {
  onClose: () => void;
}

/**
 * 10-Foot Projector Calibration Pattern.
 * Renders a pixel-accurate geometric crosshatch, concentric focus rings,
 * 4-corner keystone alignment brackets, and a 16-step grayscale ramp.
 */
export function ProjectorTestPattern({ onClose }: ProjectorTestPatternProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        SFX.close();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black text-white flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer"
      onClick={() => {
        SFX.close();
        onClose();
      }}
      tabIndex={0}
      autoFocus
      role="dialog"
      aria-label="Projector Calibration Pattern"
    >
      {/* Outer 16:9 Safe Area Border */}
      <div className="absolute inset-[3vh] border-2 border-cyan-400/80 pointer-events-none">
        <span className="absolute top-2 left-3 font-mono text-xs tracking-wider text-cyan-300">
          PROJECTOR 16:9 SAFE BOUNDARY
        </span>
        <span className="absolute top-2 right-3 font-mono text-xs tracking-wider text-cyan-300">
          FOCUS &amp; KEYSTONE ALIGNMENT
        </span>
        <span className="absolute bottom-2 left-3 font-mono text-xs text-cyan-400/80">
          PRESS BACK / ENTER TO EXIT
        </span>
        <span className="absolute bottom-2 right-3 font-mono text-xs text-cyan-400/80">
          ARGUS OPTICAL SUITE
        </span>
      </div>

      {/* 4 Corner Keystone L-Brackets */}
      <div className="absolute top-[4vh] left-[4vw] w-16 h-16 border-t-4 border-l-4 border-emerald-400 pointer-events-none" />
      <div className="absolute top-[4vh] right-[4vw] w-16 h-16 border-t-4 border-r-4 border-emerald-400 pointer-events-none" />
      <div className="absolute bottom-[4vh] left-[4vw] w-16 h-16 border-b-4 border-l-4 border-emerald-400 pointer-events-none" />
      <div className="absolute bottom-[4vh] right-[4vw] w-16 h-16 border-b-4 border-r-4 border-emerald-400 pointer-events-none" />

      {/* Precision Crosshatch Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Major Center Crosshair Axes */}
      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-cyan-400/50 pointer-events-none" />
      <div className="absolute inset-y-0 left-1/2 w-0.5 bg-cyan-400/50 pointer-events-none" />

      {/* Center Optical Focus Rings */}
      <div className="relative flex items-center justify-center pointer-events-none">
        <div className="w-[480px] h-[480px] rounded-full border border-cyan-400/60 flex items-center justify-center">
          <div className="w-[360px] h-[360px] rounded-full border border-emerald-400/70 flex items-center justify-center">
            <div className="w-[240px] h-[240px] rounded-full border border-amber-400/80 flex items-center justify-center">
              <div className="w-[120px] h-[120px] rounded-full border-2 border-white flex flex-col items-center justify-center bg-black/60 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                <span className="font-mono text-xs font-bold text-cyan-300">SHARP</span>
                <span className="font-mono text-[10px] text-zinc-400">FOCUS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grayscale Ramp at Bottom for Contrast & Gamma verification */}
      <div className="absolute bottom-[8vh] inset-x-[12vw] flex h-7 rounded border border-white/20 overflow-hidden shadow-lg pointer-events-none">
        {[
          "#000000",
          "#111111",
          "#222222",
          "#333333",
          "#444444",
          "#555555",
          "#666666",
          "#777777",
          "#888888",
          "#999999",
          "#AAAAAA",
          "#BBBBBB",
          "#CCCCCC",
          "#DDDDDD",
          "#EEEEEE",
          "#FFFFFF",
        ].map((hex, i) => (
          <div
            key={hex}
            className="flex-1 flex items-center justify-center text-[9px] font-mono"
            style={{ backgroundColor: hex, color: i < 8 ? "#aaa" : "#222" }}
          >
            {i * 6}%
          </div>
        ))}
      </div>

      {/* Guidance pill */}
      <div className="absolute top-[8vh] px-5 py-2 rounded-full bg-zinc-900/90 border border-white/20 backdrop-blur-md shadow-2xl flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-sm font-medium text-zinc-200">
          Adjust lens focus until concentric rings &amp; center text are razor-sharp
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
        >
          Done (Exit)
        </button>
      </div>
    </div>
  );
}
