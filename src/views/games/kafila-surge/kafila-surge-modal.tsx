import React, { useState } from "react";
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  Users,
  ShieldAlert,
  X,
} from "lucide-react";
import { KafilaGameCanvas } from "./kafila-game-canvas";
import { GameStats, GameMode } from "./kafila-types";
import { kafilaAudio } from "./kafila-audio";
import { ButtonGlyph } from "@/components/gamepad-button-glyph";
import { detectLayout } from "@/lib/gamepad/layout";
import { useGamepads } from "@/lib/gamepad/store";

interface KafilaSurgeModalProps {
  onClose: () => void;
}

export const KafilaSurgeModal: React.FC<KafilaSurgeModalProps> = ({ onClose }) => {
  const [mode] = useState<GameMode>("journey");
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [gameState, setGameState] = useState<"playing" | "gameover" | "victory">("playing");
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    crowdCount: 7,
    maxCrowdCount: 7,
    barricadesBust: 0,
    chantsEmitted: 0,
    copsStunned: 0,
    timeSurvivedSec: 0,
  });

  const gamepads = useGamepads();
  const activePad = gamepads[0];
  const glyphLayout = activePad ? (detectLayout([activePad.name]) ?? "xbox") : "xbox";

  const handleGameOver = (finalStats: GameStats, won: boolean) => {
    setStats(finalStats);
    setGameState(won ? "victory" : "gameover");
  };

  const handleRestart = () => {
    setGameState("playing");
    setIsPaused(false);
  };

  const toggleMute = () => {
    const muted = kafilaAudio.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4">
      <div className="relative flex flex-col w-full max-w-6xl h-[92vh] max-h-[850px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header HUD Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-orange-600/20 text-orange-400 border border-orange-500/30">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                KAFILA SURGE
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-normal">
                  Chalo Jantar Mantar
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Mobilize the city • Break the cordons • Hold the sanctuary
              </p>
            </div>
          </div>

          {/* Quick HUD Metrics */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <Users className="w-4 h-4 text-orange-400" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Marchers
                </span>
                <span className="font-extrabold text-white text-sm">
                  {stats.crowdCount}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <ShieldAlert className="w-4 h-4 text-yellow-400" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Barricades
                </span>
                <span className="font-extrabold text-yellow-400 text-sm">
                  {stats.barricadesBust} Broken
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Score
                </span>
                <span className="font-extrabold text-emerald-300 text-sm">
                  {stats.score.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={isMuted ? "Unmute Dholak Audio" : "Mute Audio"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-orange-400" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 transition-colors"
              title="Exit Game"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Game Canvas Area */}
        <div className="relative flex-1 bg-black">
          {gameState === "playing" && (
            <KafilaGameCanvas
              mode={mode}
              isPaused={isPaused}
              onGameOver={handleGameOver}
              onStatsUpdate={setStats}
            />
          )}

          {/* Victory Overlay Screen */}
          {gameState === "victory" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center animate-in fade-in">
              <div className="p-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mb-4 animate-bounce">
                <Trophy className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-wide mb-1">
                JANTAR MANTAR REACHED!
              </h2>
              <p className="text-base text-emerald-400 font-medium mb-6">
                The Dharna Sanctuary Was Held Successfully
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl w-full mb-8">
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-400 block mb-1">Final Kafila</span>
                  <span className="text-2xl font-bold text-orange-400">{stats.crowdCount}</span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-400 block mb-1">Max Mobilized</span>
                  <span className="text-2xl font-bold text-white">{stats.maxCrowdCount}</span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-400 block mb-1">Barricades Bust</span>
                  <span className="text-2xl font-bold text-yellow-400">{stats.barricadesBust}</span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-400 block mb-1">Total Score</span>
                  <span className="text-2xl font-bold text-emerald-400">{stats.score}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleRestart}
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-600/30 transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  March Again
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all"
                >
                  Exit to Argus
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controller & Keyboard Controls Footer */}
        <div className="flex flex-wrap items-center justify-between px-5 py-2.5 bg-slate-950 border-t border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-4">
            <span className="text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
              CONTROLS:
            </span>

            {/* Analog Stick Navigation */}
            <div className="flex items-center gap-1.5">
              <ButtonGlyph kind="dpad" pad={glyphLayout} />
              <span className="text-slate-400">or WASD: Move</span>
            </div>

            {/* Mega Chant */}
            <div className="flex items-center gap-1.5">
              <ButtonGlyph kind="south" pad={glyphLayout} />
              <span className="text-slate-400">or Space: Mega Chant (Pulse)</span>
            </div>

            {/* Surge */}
            <div className="flex items-center gap-1.5">
              <ButtonGlyph kind="triggers" pad={glyphLayout} />
              <span className="text-slate-400">or Shift: Crowd Surge</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>Dual-Stick & Controller Vibration Enabled</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
