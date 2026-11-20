import React, { useState, useEffect } from "react";
import {
  X,
  Gamepad2,
  Users,
  Car,
  Activity,
  Coffee,
  Disc,
  Play,
  ArrowLeft,
} from "lucide-react";
import { ARCADE_GAMES, ArcadeGameId } from "./arcade-types";
import { KafilaGameCanvas } from "../kafila-surge/kafila-game-canvas";
import { AutoDriftCanvas } from "./games/auto-drift/autodrift-canvas";
import { NightERCanvas } from "./games/night-er/nighter-canvas";
import { ChaiWalaCanvas } from "./games/chai-wala/chaiwala-canvas";
import { CarromCanvas } from "./games/carrom-masters/carrom-canvas";
import { ButtonGlyph } from "@/components/gamepad-button-glyph";
import { detectLayout } from "@/lib/gamepad/layout";
import { useGamepads } from "@/lib/gamepad/store";

interface ArcadeHubModalProps {
  initialGameId?: ArcadeGameId;
  onClose: () => void;
}

const GAME_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Users,
  Car,
  Activity,
  Coffee,
  Disc,
};

export const ArcadeHubModal: React.FC<ArcadeHubModalProps> = ({ initialGameId, onClose }) => {
  const [selectedGameId, setSelectedGameId] = useState<ArcadeGameId>(initialGameId ?? "kafila");
  const [isPlaying, setIsPlaying] = useState<boolean>(Boolean(initialGameId));

  const gamepads = useGamepads();
  const activePad = gamepads[0];
  const glyphLayout = activePad ? (detectLayout([activePad.name]) ?? "xbox") : "xbox";

  const selectedGame = ARCADE_GAMES.find((g) => g.id === selectedGameId) ?? ARCADE_GAMES[0];

  // Gamepad navigation for hub selection
  useEffect(() => {
    if (isPlaying) return;

    let prevBtnA = false;
    let prevLB = false;
    let prevRB = false;
    let animId: number;

    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const pad of pads) {
        if (!pad) continue;

        // Bumpers to cycle games (LB = 4, RB = 5)
        const lb = pad.buttons[4]?.pressed || false;
        const rb = pad.buttons[5]?.pressed || false;
        if (lb && !prevLB) {
          setSelectedGameId((cur) => {
            const idx = ARCADE_GAMES.findIndex((g) => g.id === cur);
            return ARCADE_GAMES[(idx - 1 + ARCADE_GAMES.length) % ARCADE_GAMES.length].id;
          });
        }
        if (rb && !prevRB) {
          setSelectedGameId((cur) => {
            const idx = ARCADE_GAMES.findIndex((g) => g.id === cur);
            return ARCADE_GAMES[(idx + 1) % ARCADE_GAMES.length].id;
          });
        }
        prevLB = lb;
        prevRB = rb;

        // A button to launch (0)
        const btnA = pad.buttons[0]?.pressed || false;
        if (btnA && !prevBtnA) {
          setIsPlaying(true);
        }
        prevBtnA = btnA;

        // B button to exit (1)
        if (pad.buttons[1]?.pressed) {
          onClose();
        }
      }
      animId = requestAnimationFrame(poll);
    };

    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, onClose]);

  // Keyboard navigation for hub selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isPlaying) {
          setIsPlaying(false);
        } else {
          onClose();
        }
      }
      if (!isPlaying) {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
          setSelectedGameId((cur) => {
            const idx = ARCADE_GAMES.findIndex((g) => g.id === cur);
            return ARCADE_GAMES[(idx - 1 + ARCADE_GAMES.length) % ARCADE_GAMES.length].id;
          });
        }
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
          setSelectedGameId((cur) => {
            const idx = ARCADE_GAMES.findIndex((g) => g.id === cur);
            return ARCADE_GAMES[(idx + 1) % ARCADE_GAMES.length].id;
          });
        }
        if (e.key === "Enter" || e.key === " ") {
          setIsPlaying(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 p-4">
      <div className="relative w-full max-w-5xl h-[840px] max-h-[92vh] bg-stone-950 rounded-2xl border border-stone-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800/80 bg-stone-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {isPlaying ? (
              <button
                onClick={() => setIsPlaying(false)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Arcade Lobby
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                    Argus Arcade Hub
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      5 GAMES
                    </span>
                  </h1>
                  <p className="text-xs text-stone-400">Gamepad Supported • Procedural Audio Engine</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activePad && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs text-stone-300 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {activePad.name.slice(0, 24)}
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Viewport */}
        {isPlaying ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-auto bg-stone-950">
            {selectedGameId === "kafila" && (
              <KafilaGameCanvas
                mode="journey"
                onGameOver={() => {}}
                onStatsUpdate={() => {}}
                isPaused={false}
              />
            )}
            {selectedGameId === "autodrift" && <AutoDriftCanvas />}
            {selectedGameId === "nighter" && <NightERCanvas />}
            {selectedGameId === "chaiwala" && <ChaiWalaCanvas />}
            {selectedGameId === "carrom" && <CarromCanvas />}
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            {/* Game Selector Tabs (Bumper Nav) */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-wider">
                <ButtonGlyph kind="bumpers" pad={glyphLayout} />
                <span>Select Game</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                Use Left / Right Arrows or Controller
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
              {ARCADE_GAMES.map((game) => {
                const isSelected = game.id === selectedGameId;
                const IconComp = GAME_ICONS[game.icon] ?? Gamepad2;

                return (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGameId(game.id)}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all duration-150 ${
                      isSelected
                        ? "bg-stone-800/90 border-amber-500 shadow-lg shadow-amber-500/10 scale-102"
                        : "bg-stone-900/60 border-stone-800/80 hover:bg-stone-800/50 hover:border-stone-700"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors ${
                        isSelected ? "bg-amber-500/20 text-amber-400" : "bg-stone-800 text-stone-400"
                      }`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-white truncate w-full">{game.title}</div>
                    <div className="text-[10px] text-stone-400 truncate w-full">{game.tags[0]}</div>
                  </button>
                );
              })}
            </div>

            {/* Selected Game Showcase Card */}
            <div className="flex-1 flex flex-col md:flex-row gap-6 p-6 rounded-2xl bg-gradient-to-br from-stone-900/90 to-stone-900/40 border border-stone-800 overflow-hidden relative shadow-inner">
              {/* Left Column: Game Info */}
              <div className="flex-1 flex flex-col justify-between z-10">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedGame.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 text-[10px] font-bold border border-stone-700/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-1">
                    {selectedGame.title}
                  </h2>
                  <div className="text-sm font-bold text-amber-400 mb-3">{selectedGame.subtitle}</div>
                  <p className="text-stone-300 text-sm leading-relaxed max-w-xl">
                    {selectedGame.description}
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-4">
                  {/* Controls preview */}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                      Controls & Bindings
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedGame.gamepadHints.map((hint, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-950/70 border border-stone-800 text-xs font-medium text-stone-300"
                        >
                          <span className="text-amber-400 font-bold">{hint.key}</span>
                          <span className="text-stone-500">•</span>
                          <span>{hint.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Play Action Button */}
                  <div className="flex items-center gap-4 pt-2">
                    <button
                      onClick={() => setIsPlaying(true)}
                      className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black tracking-wider uppercase text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all group"
                    >
                      <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
                      Play Now (Press A)
                    </button>
                    <div className="text-xs text-stone-400 flex items-center gap-1.5">
                      <ButtonGlyph kind="south" pad={glyphLayout} />
                      <span>or Space to Launch</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Decorative Graphic Badge */}
              <div className="hidden md:flex w-72 flex-col items-center justify-center p-6 rounded-xl bg-stone-950/60 border border-stone-800/80">
                <div className="w-24 h-24 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-2xl">
                  {React.createElement(GAME_ICONS[selectedGame.icon] ?? Gamepad2, {
                    className: "w-12 h-12",
                  })}
                </div>
                <div className="text-center font-bold text-white text-base mb-1">
                  100% Offline & Asset-Free
                </div>
                <p className="text-center text-stone-400 text-xs leading-relaxed">
                  Engineered with 60 FPS HTML5 Canvas and real-time procedural Web Audio synthesis.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
