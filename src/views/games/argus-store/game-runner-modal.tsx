import React, { useEffect, useRef } from "react";
import { X, Gamepad2, ArrowLeft, RotateCcw, Download, Sliders } from "lucide-react";
import { StoreGame } from "./store-types";
import { KafilaGameCanvas } from "../kafila-surge/kafila-game-canvas";
import { AutoDriftCanvas } from "../argus-arcade/games/auto-drift/autodrift-canvas";
import { NightERCanvas } from "../argus-arcade/games/night-er/nighter-canvas";
import { ChaiWalaCanvas } from "../argus-arcade/games/chai-wala/chaiwala-canvas";
import { CarromCanvas } from "../argus-arcade/games/carrom-masters/carrom-canvas";

interface GameRunnerModalProps {
  game: StoreGame;
  onClose: () => void;
}

export const GameRunnerModal: React.FC<GameRunnerModalProps> = ({ game, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Keyboard Escape listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Forward parent gamepad events to iframe
  useEffect(() => {
    if (game.playableType !== "html5_canvas") return;
    let animId: number;

    const syncPad = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const primary = pads[0];
      if (primary && iframeRef.current?.contentWindow) {
        // Send gamepad state to iframe window
        iframeRef.current.contentWindow.postMessage(
          {
            type: "ARGUS_GAMEPAD_SYNC",
            axes: primary.axes,
            buttons: primary.buttons.map((b) => ({ pressed: b.pressed, value: b.value })),
          },
          "*"
        );
      }
      animId = requestAnimationFrame(syncPad);
    };

    animId = requestAnimationFrame(syncPad);
    return () => cancelAnimationFrame(animId);
  }, [game.playableType]);

  const reloadIframe = () => {
    if (iframeRef.current && game.sourceCode) {
      iframeRef.current.srcdoc = game.sourceCode;
    }
  };

  const handleExportHtml = () => {
    if (!game.sourceCode) return;
    const blob = new Blob([game.sourceCode], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${game.id || "argus-game"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 p-4">
      <div className="relative w-full max-w-5xl h-[840px] max-h-[92vh] bg-stone-950 rounded-2xl border border-stone-800 shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-stone-800/80 bg-stone-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Exit to Store
            </button>
            <div className="h-5 w-px bg-stone-800" />
            <div>
              <div className="text-sm font-black text-white flex items-center gap-2">
                {game.title}
                {game.gamepadVerified && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold">
                    <Gamepad2 className="w-3 h-3" />
                    Gamepad Connected
                  </span>
                )}
              </div>
              <div className="text-[10px] text-stone-400">{game.subtitle}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {game.playableType === "html5_canvas" && (
              <>
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-400 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Tweak HUD: <kbd className="px-1 py-0.5 rounded bg-stone-800 font-mono text-[10px]">Tab</kbd> /{" "}
                    <kbd className="px-1 py-0.5 rounded bg-stone-800 font-mono text-[10px]">Select</kbd>
                  </span>
                </div>
                {game.sourceCode && (
                  <button
                    onClick={handleExportHtml}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold transition-all"
                    title="Export Standalone .html File"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden md:inline">Export HTML</span>
                  </button>
                )}
                <button
                  onClick={reloadIframe}
                  className="p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
                  title="Restart Game Simulation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Canvas or Sandbox */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-stone-950 overflow-hidden">
          {game.playableType === "native_arcade" && (
            <>
              {game.id === "kafila" && (
                <KafilaGameCanvas
                  mode="journey"
                  onGameOver={() => {}}
                  onStatsUpdate={() => {}}
                  isPaused={false}
                />
              )}
              {game.id === "autodrift" && <AutoDriftCanvas />}
              {game.id === "nighter" && <NightERCanvas />}
              {game.id === "chaiwala" && <ChaiWalaCanvas />}
              {game.id === "carrom" && <CarromCanvas />}
            </>
          )}

          {game.playableType === "html5_canvas" && game.sourceCode && (
            <iframe
              ref={iframeRef}
              title={game.title}
              srcDoc={game.sourceCode}
              sandbox="allow-scripts allow-pointer-lock allow-same-origin"
              className="w-full h-full max-w-[800px] max-h-[640px] aspect-[5/4] border-0 rounded-xl shadow-2xl bg-stone-900"
            />
          )}

          {game.playableType === "external_url" && game.externalUrl && (
            <iframe
              title={game.title}
              src={game.externalUrl}
              sandbox="allow-scripts allow-pointer-lock allow-same-origin"
              className="w-full h-full border-0 rounded-xl shadow-2xl bg-stone-900"
            />
          )}
        </div>
      </div>
    </div>
  );
};
