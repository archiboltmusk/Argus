import { useEffect, useRef, useState, useCallback } from "react";
import {
  Activity,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Sliders,
} from "lucide-react";
import {
  type ECGRhythmType,
  ECG_RHYTHM_PRESETS,
  sampleECGVoltage,
} from "@/lib/education/btr-ecg-simulator";

export interface BTRECGViewerProps {
  initialRhythm?: ECGRhythmType;
  title?: string;
  allowPresetChange?: boolean;
  onDiagnose?: (rhythm: ECGRhythmType) => void;
  className?: string;
}

export function BTRECGViewer({
  initialRhythm = "normal_sinus",
  title = "Clinical Lead II Rhythm Strip",
  allowPresetChange = true,
  className = "",
}: BTRECGViewerProps) {
  const [selectedRhythm, setSelectedRhythm] = useState<ECGRhythmType>(initialRhythm);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [themeMode, setThemeMode] = useState<"crt" | "paper">("paper");
  const [sweepSpeed, setSweepSpeed] = useState<number>(25); // 25 mm/s standard
  const [gain, setGain] = useState<number>(1.0); // 1.0 = 10mm/mV
  const [showCaliper, setShowCaliper] = useState<boolean>(false);
  const [caliperStartMs, setCaliperStartMs] = useState<number>(100);
  const [caliperEndMs, setCaliperEndMs] = useState<number>(260);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timeSecRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeepTimeRef = useRef<number>(0);

  const activePreset = ECG_RHYTHM_PRESETS[selectedRhythm] || ECG_RHYTHM_PRESETS.normal_sinus;

  // Sound beep synthesizer
  const playHeartBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz standard telemetry blip
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // AudioContext unavailable or blocked by autoplay
    }
  }, [soundEnabled]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;
      const now = performance.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isPlaying) {
        timeSecRef.current += dt;
      }

      const tNow = timeSecRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      // 1. Clear background & draw ECG grid
      if (themeMode === "crt") {
        ctx.fillStyle = "#03140b"; // Deep CRT dark green
        ctx.fillRect(0, 0, width, height);

        // Green CRT grid lines
        ctx.strokeStyle = "rgba(16, 185, 129, 0.12)";
        ctx.lineWidth = 1;
        const smallBox = 16;
        for (let x = 0; x < width; x += smallBox) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += smallBox) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      } else {
        // Classic Medical Pink Grid
        ctx.fillStyle = "#fff5f5";
        ctx.fillRect(0, 0, width, height);

        // Small boxes (0.04s = 1mm)
        ctx.strokeStyle = "rgba(239, 68, 68, 0.18)";
        ctx.lineWidth = 0.5;
        const smallBox = 14;
        for (let x = 0; x < width; x += smallBox) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += smallBox) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Large boxes (0.20s = 5mm)
        ctx.strokeStyle = "rgba(239, 68, 68, 0.38)";
        ctx.lineWidth = 1.2;
        const largeBox = smallBox * 5;
        for (let x = 0; x < width; x += largeBox) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += largeBox) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // 2. Render ECG Signal Trace
      // Pixels per second based on sweep speed and canvas scaling
      const pxPerSec = (sweepSpeed / 25) * 160;
      const windowSec = width / pxPerSec;
      const tStart = tNow - windowSec;

      ctx.beginPath();
      ctx.lineWidth = themeMode === "crt" ? 2.2 : 2.0;
      ctx.strokeStyle = themeMode === "crt" ? "#34d399" : "#0f172a";
      if (themeMode === "crt") {
        ctx.shadowColor = "#10b981";
        ctx.shadowBlur = 8;
      } else {
        ctx.shadowBlur = 0;
      }

      let firstPoint = true;
      const stepPx = 2;

      for (let x = 0; x < width; x += stepPx) {
        const sampleT = tStart + (x / width) * windowSec;
        const vMv = sampleECGVoltage(sampleT, selectedRhythm) * gain;
        // 1mV = 45 pixels vertical amplitude
        const y = midY - vMv * 45;

        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 3. Check for heart monitor sound trigger near lead tip
      const leadTipT = tNow;
      const currentVoltage = sampleECGVoltage(leadTipT, selectedRhythm);
      if (
        currentVoltage > 0.8 &&
        now - lastBeepTimeRef.current > (60000 / activePreset.heartRateBpm) * 0.7
      ) {
        lastBeepTimeRef.current = now;
        playHeartBeep();
      }

      // 4. Caliper measurement overlay if active
      if (showCaliper) {
        const calStartX = (caliperStartMs / 1000) * pxPerSec;
        const calEndX = (caliperEndMs / 1000) * pxPerSec;

        ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
        ctx.fillRect(Math.min(calStartX, calEndX), 0, Math.abs(calEndX - calStartX), height);

        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(calStartX, 0);
        ctx.lineTo(calStartX, height);
        ctx.moveTo(calEndX, 0);
        ctx.lineTo(calEndX, height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [
    isPlaying,
    selectedRhythm,
    themeMode,
    sweepSpeed,
    gain,
    showCaliper,
    caliperStartMs,
    caliperEndMs,
    playHeartBeep,
    activePreset.heartRateBpm,
  ]);

  const measuredDurationMs = Math.abs(caliperEndMs - caliperStartMs);

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl bg-surface/90 border border-edge p-3 shadow-xl ${className}`}
    >
      {/* Header telemetry HUD */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity size={16} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {activePreset.heartRateBpm} BPM
              </span>
            </div>
            <p className="text-[11px] text-ink-muted">{activePreset.title}</p>
          </div>
        </div>

        {/* Quick controls toolbar */}
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1.5 rounded-lg border transition ${
              isPlaying
                ? "bg-white/10 text-white border-white/20 hover:bg-white/20"
                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
            }`}
            title={isPlaying ? "Freeze Strip" : "Resume Strip"}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border transition ${
              soundEnabled
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-white/5 text-white/50 border-white/10 hover:text-white"
            }`}
            title={soundEnabled ? "Mute Telemetry Beep" : "Enable Telemetry Beep"}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          <button
            type="button"
            onClick={() => setThemeMode(themeMode === "crt" ? "paper" : "crt")}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-[11px] font-semibold transition"
          >
            {themeMode === "crt" ? "Monitor CRT" : "Pink Paper"}
          </button>

          <button
            type="button"
            onClick={() => setSweepSpeed((s) => (s === 25 ? 50 : 25))}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-[11px] font-mono font-semibold transition"
            title="Toggle Paper Speed (25 mm/s vs 50 mm/s)"
          >
            {sweepSpeed}mm/s
          </button>

          <button
            type="button"
            onClick={() => setGain((g) => (g === 1.0 ? 2.0 : g === 2.0 ? 0.5 : 1.0))}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-[11px] font-mono font-semibold transition"
            title="Toggle Voltage Gain (0.5x, 1x, 2x)"
          >
            {gain}x
          </button>

          <button
            type="button"
            onClick={() => setShowCaliper(!showCaliper)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition ${
              showCaliper
                ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                : "bg-white/5 text-white/70 border-white/10 hover:text-white"
            }`}
          >
            <Sliders size={12} />
            <span>Caliper</span>
          </button>
        </div>
      </div>

      {/* Rhythm preset switcher if enabled */}
      {allowPresetChange && (
        <div className="flex flex-wrap items-center gap-1.5 bg-black/30 p-1.5 rounded-xl border border-white/5">
          <span className="text-[10px] font-black uppercase tracking-wider text-ink-muted mr-1">
            Pathology:
          </span>
          {(Object.keys(ECG_RHYTHM_PRESETS) as ECGRhythmType[]).map((rKey) => {
            const def = ECG_RHYTHM_PRESETS[rKey];
            const isSelected = selectedRhythm === rKey;
            return (
              <button
                key={rKey}
                type="button"
                onClick={() => setSelectedRhythm(rKey)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                  isSelected
                    ? "bg-emerald-500 text-black shadow-md scale-[1.02]"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {def.title.split("(")[0].trim()}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Canvas Viewport */}
      <div className="relative rounded-xl overflow-hidden border border-edge shadow-inner bg-black">
        <canvas
          ref={canvasRef}
          width={700}
          height={200}
          className="w-full h-[180px] block cursor-crosshair"
        />

        {/* Lead II watermark */}
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-white/70 border border-white/10">
          Lead II • 25 mm/s • 10 mm/mV
        </div>

        {/* Caliper active indicator */}
        {showCaliper && (
          <div className="absolute top-2 right-2 z-10 px-2.5 py-1 rounded-lg bg-blue-600/90 backdrop-blur-md text-white text-[11px] font-mono font-bold border border-blue-400 shadow-md">
            Δt = {measuredDurationMs} ms ({(measuredDurationMs / 40).toFixed(1)} small boxes)
          </div>
        )}
      </div>

      {/* Caliper slider controls if opened */}
      {showCaliper && (
        <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
          <div className="flex items-center justify-between text-blue-200 font-bold">
            <span className="flex items-center gap-1">
              <Sliders size={13} />
              ECG Diagnostic Caliper Measurements
            </span>
            <span className="font-mono text-emerald-400">
              PR: {activePreset.prIntervalMs ? `${activePreset.prIntervalMs}ms` : "N/A"} | QRS:{" "}
              {activePreset.qrsDurationMs}ms | QTc: {activePreset.qtcMs}ms
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-blue-300/80 block mb-1">
                Caliper Cursor 1 (Start: {caliperStartMs} ms)
              </label>
              <input
                type="range"
                min="0"
                max="800"
                step="10"
                value={caliperStartMs}
                onChange={(e) => setCaliperStartMs(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-blue-300/80 block mb-1">
                Caliper Cursor 2 (End: {caliperEndMs} ms)
              </label>
              <input
                type="range"
                min="0"
                max="800"
                step="10"
                value={caliperEndMs}
                onChange={(e) => setCaliperEndMs(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Clinical Clue & Pathology Pearl Banner */}
      <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
        <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-bold text-amber-300 text-[11px] uppercase tracking-wider mb-0.5">
            NEET-PG / INI-CET Clinical Pearl:
          </div>
          <div className="text-white/90 leading-relaxed">{activePreset.highYieldClue}</div>
        </div>
      </div>
    </div>
  );
}
