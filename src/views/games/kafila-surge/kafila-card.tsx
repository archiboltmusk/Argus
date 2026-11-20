import React from "react";
import { Users, Gamepad2, Play, Flame, ShieldAlert, Sparkles } from "lucide-react";
import { ButtonGlyph } from "@/components/gamepad-button-glyph";
import { detectLayout } from "@/lib/gamepad/layout";
import { useGamepads } from "@/lib/gamepad/store";

interface KafilaCardProps {
  onPlay: () => void;
}

export const KafilaCard: React.FC<KafilaCardProps> = ({ onPlay }) => {
  const gamepads = useGamepads();
  const activePad = gamepads[0];
  const glyphLayout = activePad ? (detectLayout([activePad.name]) ?? "xbox") : "xbox";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-950/60 via-slate-900 to-slate-950 border border-orange-500/30 p-6 shadow-xl mb-6 group hover:border-orange-500/50 transition-all">
      {/* Background Graphic Effect */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-600/20 via-yellow-600/10 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Flame className="w-3.5 h-3.5" />
              Argus Arcade Premiere
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Gamepad2 className="w-3.5 h-3.5" />
              Gamepad & Haptics Ready
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            KAFILA SURGE: <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">Chalo Jantar Mantar</span>
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            Build your movement across the city, break police cordons with crowd mass, dodge high-pressure water cannons, and hold the central sanctuary. Inspired by satirical street brawlers, elevated with dual-stick controls, adaptive Dholak rhythm beats, and crowd boid physics.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-orange-400" />
              Boid Crowd Flocking
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-yellow-400" />
              Destructible Barricades
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Self-Contained Web Audio Synth
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col items-center sm:items-end gap-2 w-full md:w-auto">
          <button
            onClick={onPlay}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-base shadow-lg shadow-orange-600/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <Play className="w-5 h-5 fill-current" />
            PLAY NOW
            <span className="hidden sm:inline-flex items-center ml-1 opacity-90">
              <ButtonGlyph kind="south" pad={glyphLayout} />
            </span>
          </button>
          <span className="text-[11px] text-slate-400">
            Plug in your controller or use WASD / Spacebar
          </span>
        </div>
      </div>
    </div>
  );
};
