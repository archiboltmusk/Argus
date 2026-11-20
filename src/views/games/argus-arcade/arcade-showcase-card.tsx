import React from "react";
import { Gamepad2, Play, Flame, Sparkles } from "lucide-react";
import { ARCADE_GAMES, ArcadeGameId } from "./arcade-types";
import { ButtonGlyph } from "@/components/gamepad-button-glyph";
import { detectLayout } from "@/lib/gamepad/layout";
import { useGamepads } from "@/lib/gamepad/store";

interface ArcadeShowcaseCardProps {
  onOpenHub: (gameId?: ArcadeGameId) => void;
}

export const ArcadeShowcaseCard: React.FC<ArcadeShowcaseCardProps> = ({ onOpenHub }) => {
  const gamepads = useGamepads();
  const activePad = gamepads[0];
  const glyphLayout = activePad ? (detectLayout([activePad.name]) ?? "xbox") : "xbox";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-stone-900 to-slate-950 border border-amber-500/30 p-6 shadow-xl mb-6 group hover:border-amber-500/50 transition-all">
      {/* Background Graphic Glow */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/15 via-orange-500/10 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6">
        {/* Header row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Flame className="w-3.5 h-3.5" />
                Argus Arcade Hub
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Gamepad2 className="w-3.5 h-3.5" />
                Full Gamepad Support
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Zero External Assets
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              Play Pure Retro Arcade Games in Argus
            </h2>

            <p className="text-sm text-stone-300 leading-relaxed">
              Featuring 5 full-length, self-contained indie arcade titles crafted with 60 FPS HTML5 Canvas and 100% procedural Web Audio synthesizers. Plug in any Xbox, PlayStation, or Switch controller and jump right in!
            </p>
          </div>

          {/* Master Hub Button */}
          <div className="flex flex-col items-start md:items-end gap-1.5">
            <button
              onClick={() => onOpenHub()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2.5"
            >
              <Play className="w-4 h-4 fill-current" />
              OPEN ARCADE HUB
              <span className="hidden sm:inline-flex items-center ml-1 opacity-80">
                <ButtonGlyph kind="south" pad={glyphLayout} />
              </span>
            </button>
            <span className="text-[11px] text-stone-500">Controller & Keyboard Ready</span>
          </div>
        </div>

        {/* 5-Game Quick Launch Carousel / Shelf */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-stone-800/80">
          {ARCADE_GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => onOpenHub(game.id)}
              className="flex flex-col text-left p-3.5 rounded-xl bg-stone-900/70 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-850 hover:scale-[1.02] active:scale-98 transition-all group/card shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                  {game.tags[0]}
                </span>
                <Play className="w-3.5 h-3.5 text-stone-500 group-hover/card:text-amber-400 transition-colors" />
              </div>

              <div className="font-black text-sm text-stone-100 group-hover/card:text-white mb-0.5 truncate w-full">
                {game.title}
              </div>
              <div className="text-[11px] font-semibold text-stone-400 mb-2 truncate w-full">
                {game.subtitle}
              </div>

              <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed mt-auto">
                {game.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
