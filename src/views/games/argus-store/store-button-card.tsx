import React from "react";
import { ShoppingBag, Sparkles, Gamepad2, Wand2 } from "lucide-react";
import { ButtonGlyph } from "@/components/gamepad-button-glyph";
import { detectLayout } from "@/lib/gamepad/layout";
import { useGamepads } from "@/lib/gamepad/store";

interface StoreButtonCardProps {
  onOpenStore: () => void;
}

export const StoreButtonCard: React.FC<StoreButtonCardProps> = ({ onOpenStore }) => {
  const gamepads = useGamepads();
  const activePad = gamepads[0];
  const glyphLayout = activePad ? (detectLayout([activePad.name]) ?? "xbox") : "xbox";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950/40 via-stone-900 to-indigo-950/40 border border-cyan-500/30 p-5 shadow-xl mb-4 group hover:border-cyan-500/50 transition-all">
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <ShoppingBag className="w-3 h-3" />
              Argus Game Store
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Wand2 className="w-3 h-3" />
              AI Game Forge (Prompt-to-Play)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Gamepad2 className="w-3 h-3" />
              Gamepad Verified
            </span>
          </div>

          <h3 className="text-xl font-black text-white tracking-tight mb-1">
            Discover New Games & Forge Your Own with AI
          </h3>
          <p className="text-xs text-stone-300 leading-relaxed max-w-2xl">
            Browse trending community games, forge brand-new retro titles from natural language prompts, or
            sideload Claude Artifact and v0 web games with auto controller translation.
          </p>
        </div>

        <button
          onClick={onOpenStore}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shrink-0"
        >
          <Sparkles className="w-4 h-4 fill-current" />
          OPEN GAME STORE
          <span className="hidden sm:inline-flex items-center ml-1 opacity-80">
            <ButtonGlyph kind="south" pad={glyphLayout} />
          </span>
        </button>
      </div>
    </div>
  );
};
