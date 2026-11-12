import { useState } from "react";
import { createPortal } from "react-dom";
import { useSettings } from "@/lib/settings";
import { SFX } from "@/lib/sfx";
import {
  WALL_COLOR_PRESETS,
  PICTURE_PROFILES,
  type WallColorPreset,
  type PictureProfilePreset,
} from "@/lib/projector/projector-launcher";

interface ProjectorCalibrationModalProps {
  onClose: () => void;
  onOpenTestPattern: () => void;
}

export function ProjectorCalibrationModal({
  onClose,
  onOpenTestPattern,
}: ProjectorCalibrationModalProps) {
  const { settings, update } = useSettings();
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);

  const activeWallColor = settings.projectorWallColorTint || "white";
  const activeProfile = settings.projectorPictureProfile || "cinema";

  const handleSelectWallColor = (id: WallColorPreset["id"]) => {
    SFX.click();
    update({ projectorWallColorTint: id });
  };

  const handleSelectProfile = (id: PictureProfilePreset["id"]) => {
    SFX.click();
    const preset = PICTURE_PROFILES.find((p) => p.id === id);
    if (preset) {
      update({
        projectorPictureProfile: id,
        projectorContrastBoost: Math.round((preset.contrast - 100) / 2) + 5,
        projectorGammaLift: Math.max(1, Math.round((2.5 - preset.gamma) * 5)),
      });
    }
  };

  const handleOverscanChange = (val: number) => {
    update({ projectorKeystoneOverscan: Math.max(0, Math.min(12, val)) });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9900] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none"
      onClick={onClose}
    >
      <div
        data-bp-dialog
        className="w-full max-w-4xl bg-zinc-900/95 border border-white/15 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            <h2 className="text-2xl font-bold text-white tracking-wide">
              Projector Picture &amp; Wall Calibration
            </h2>
          </div>
          <button
            type="button"
            data-bp-focusable
            data-bp-chip
            data-bp-restore-key="proj-calib-done"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold text-zinc-300 transition-colors focus:ring-2 focus:ring-white"
          >
            Done
          </button>
        </div>

        {/* Section 1: Wall Color Tint Compensation */}
        <div data-bp-row data-bp-row-key="proj-wall-tint" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
              Wall Color Tint Compensation
            </span>
            <span className="text-xs text-zinc-400">
              Neutralizes reflected paint tones without a projector screen
            </span>
          </div>

          <div data-bp-grid className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {WALL_COLOR_PRESETS.map((preset) => {
              const selected = activeWallColor === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-bp-focusable
                  data-bp-tile
                  data-bp-restore-key={`proj-wall-${preset.id}`}
                  onClick={() => handleSelectWallColor(preset.id)}
                  className={`flex flex-col items-start p-3.5 rounded-2xl border transition-all text-left relative overflow-hidden ${
                    selected
                      ? "bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)] ring-2 ring-cyan-400"
                      : "bg-zinc-800/60 border-white/10 hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-5 h-5 rounded-full border border-black/30 shadow-sm"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="text-xs font-bold text-white">{preset.label}</span>
                  </div>
                  <span className="text-[11px] text-zinc-400 leading-tight">
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Picture & Lamp Mode Profiles */}
        <div data-bp-row data-bp-row-key="proj-lamp-profiles" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
              Projector Picture &amp; Lamp Profile
            </span>
            <span className="text-xs text-zinc-400">
              Adjusts optical drive, fan speed &amp; Rec.709 gamma
            </span>
          </div>

          <div data-bp-grid className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PICTURE_PROFILES.map((prof) => {
              const selected = activeProfile === prof.id;
              return (
                <button
                  key={prof.id}
                  type="button"
                  data-bp-focusable
                  data-bp-tile
                  data-bp-restore-key={`proj-lamp-${prof.id}`}
                  onClick={() => handleSelectProfile(prof.id)}
                  className={`flex flex-col items-start p-4 rounded-2xl border transition-all text-left ${
                    selected
                      ? "bg-amber-950/40 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.25)] ring-2 ring-amber-400"
                      : "bg-zinc-800/60 border-white/10 hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-sm font-bold text-white">{prof.label}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-amber-300 border border-amber-500/30">
                      {prof.lumens}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 mb-2 leading-relaxed">
                    {prof.description}
                  </span>
                  <div className="flex items-center gap-2 mt-auto text-[10px] font-mono text-zinc-400">
                    <span>Fan: {prof.fanNoise}</span>
                    <span>•</span>
                    <span>γ {prof.gamma}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Keystone Safe Area & Focus Test Pattern */}
        <div data-bp-row data-bp-row-key="proj-keystone-test" className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/10">
          {/* Overscan Slider */}
          <div className="flex flex-col gap-2 p-4 rounded-2xl bg-zinc-800/50 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-200">
                Keystone Overscan Padding
              </span>
              <span className="text-xs font-mono font-bold text-cyan-300">
                {settings.projectorKeystoneOverscan ?? 5}% Inset
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Pulls UI inward to avoid physical wall corner cuts and trapezoid distortion.
            </p>
            <div className="flex items-center gap-2">
              {[0, 3, 5, 8, 10].map((inset) => (
                <button
                  key={inset}
                  type="button"
                  data-bp-focusable
                  data-bp-chip
                  data-bp-restore-key={`proj-overscan-${inset}`}
                  onClick={() => handleOverscanChange(inset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                    (settings.projectorKeystoneOverscan ?? 5) === inset
                      ? "bg-cyan-500 text-black shadow-md"
                      : "bg-zinc-700/80 text-zinc-300 hover:bg-zinc-600"
                  }`}
                >
                  {inset}%
                </button>
              ))}
            </div>
          </div>

          {/* Optical Focus Pattern Launcher */}
          <div className="flex flex-col justify-between p-4 rounded-2xl bg-zinc-800/50 border border-white/10">
            <div>
              <span className="text-sm font-semibold text-zinc-200">
                Optical Focus &amp; Alignment Pattern
              </span>
              <p className="text-xs text-zinc-400 mt-1">
                Display high-contrast geometry grid and concentric rings to dial in projector focus.
              </p>
            </div>
            <button
              type="button"
              data-bp-focusable
              data-bp-chip
              data-bp-restore-key="proj-open-test-pattern"
              onClick={() => {
                SFX.open();
                onOpenTestPattern();
              }}
              className="mt-3 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm tracking-wide transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)] flex items-center justify-center gap-2 focus:ring-2 focus:ring-cyan-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <path d="M12 3v18M3 12h18" strokeWidth="2" />
              </svg>
              Show Test Crosshatch Pattern
            </button>
          </div>
        </div>

        {/* Section 4: Projector Sleep Timer */}
        <div data-bp-row data-bp-row-key="proj-sleep-timer" className="flex items-center justify-between p-4 rounded-2xl bg-zinc-800/40 border border-white/10">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-200">
              Projector Bulb Sleep Timer
            </span>
            <span className="text-xs text-zinc-400">
              Automatically turns off display to save lamp hours if you fall asleep
            </span>
          </div>

          <div data-bp-scroll-x className="flex items-center gap-2">
            {[null, 15, 30, 60, 120].map((mins) => {
              const active = sleepTimerMinutes === mins;
              return (
                <button
                  key={String(mins)}
                  type="button"
                  data-bp-focusable
                  data-bp-chip
                  data-bp-restore-key={`proj-sleep-${mins ?? "off"}`}
                  onClick={() => {
                    SFX.click();
                    setSleepTimerMinutes(mins);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? "bg-amber-400 text-black shadow-md font-bold"
                      : "bg-white/10 hover:bg-white/15 text-zinc-300"
                  }`}
                >
                  {mins === null ? "Off" : `${mins}m`}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
