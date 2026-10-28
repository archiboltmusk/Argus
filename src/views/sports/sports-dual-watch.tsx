import { useState } from "react";
import { Columns, LayoutTemplate, Volume2, VolumeX, X, Tv } from "lucide-react";
import type { SportsGame } from "@/lib/sports/espn";

export type DualStreamSlot = {
  title: string;
  url: string;
  channelName?: string;
};

export function SportsDualWatch({
  primaryStream,
  secondaryStream,
  liveGames = [],
  onClose,
}: {
  primaryStream: DualStreamSlot;
  secondaryStream?: DualStreamSlot;
  liveGames?: SportsGame[];
  onClose: () => void;
}) {
  const [layout, setLayout] = useState<"side_by_side" | "pip">("side_by_side");
  const [activeAudioSlot, setActiveAudioSlot] = useState<1 | 2>(1);
  const [slot2, setSlot2] = useState<DualStreamSlot | null>(secondaryStream ?? null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
    >
      {/* Top Bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4 bg-zinc-950">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-accent/20 text-accent">
            <Tv size={14} />
          </span>
          <h2 className="text-sm font-bold tracking-tight">Argus Sports Multi-View Dual Watcher</h2>
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
            DUAL STREAM
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout Toggle */}
          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setLayout("side_by_side")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                layout === "side_by_side" ? "bg-white text-black" : "text-white/70 hover:text-white"
              }`}
            >
              <Columns size={13} />
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setLayout("pip")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                layout === "pip" ? "bg-white text-black" : "text-white/70 hover:text-white"
              }`}
            >
              <LayoutTemplate size={13} />
              Picture-in-Picture
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Video Viewing Area */}
      <div className="relative flex flex-1 overflow-hidden bg-black p-2">
        {layout === "side_by_side" ? (
          <div className="grid h-full w-full grid-cols-1 gap-2 md:grid-cols-2">
            {/* Slot 1 */}
            <div className="relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
              <div className="relative flex-1 bg-black">
                <iframe
                  src={primaryStream.url}
                  title={primaryStream.title}
                  className="h-full w-full border-0"
                  allow="autoplay; fullscreen"
                />
              </div>
              <div className="flex h-10 shrink-0 items-center justify-between border-t border-white/10 bg-zinc-950 px-3 text-xs">
                <span className="truncate font-semibold text-white/90">
                  {primaryStream.title}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveAudioSlot(1)}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-bold ${
                    activeAudioSlot === 1
                      ? "bg-accent text-white"
                      : "bg-white/10 text-white/60 hover:text-white"
                  }`}
                >
                  {activeAudioSlot === 1 ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  Audio 1
                </button>
              </div>
            </div>

            {/* Slot 2 */}
            <div className="relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
              {slot2 ? (
                <>
                  <div className="relative flex-1 bg-black">
                    <iframe
                      src={slot2.url}
                      title={slot2.title}
                      className="h-full w-full border-0"
                      allow="autoplay; fullscreen"
                    />
                  </div>
                  <div className="flex h-10 shrink-0 items-center justify-between border-t border-white/10 bg-zinc-950 px-3 text-xs">
                    <span className="truncate font-semibold text-white/90">
                      {slot2.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveAudioSlot(2)}
                      className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-bold ${
                        activeAudioSlot === 2
                          ? "bg-accent text-white"
                          : "bg-white/10 text-white/60 hover:text-white"
                      }`}
                    >
                      {activeAudioSlot === 2 ? <Volume2 size={13} /> : <VolumeX size={13} />}
                      Audio 2
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-xs text-white/50">
                  <Tv size={36} className="opacity-40" />
                  <p className="max-w-xs leading-relaxed">
                    Select a secondary live sports fixture or IPTV stream below to watch both simultaneously.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* PiP Mode */
          <div className="relative h-full w-full">
            {/* Primary Main Screen */}
            <div className="h-full w-full overflow-hidden rounded-xl border border-white/10 bg-black">
              <iframe
                src={primaryStream.url}
                title={primaryStream.title}
                className="h-full w-full border-0"
                allow="autoplay; fullscreen"
              />
            </div>

            {/* Floating PiP Screen */}
            {slot2 && (
              <div className="absolute bottom-4 end-4 aspect-video w-72 md:w-96 overflow-hidden rounded-xl border-2 border-accent shadow-2xl bg-zinc-900 transition-all hover:scale-105">
                <iframe
                  src={slot2.url}
                  title={slot2.title}
                  className="h-full w-full border-0 pointer-events-none"
                  allow="autoplay; fullscreen"
                />
                <div className="absolute top-2 end-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveAudioSlot(activeAudioSlot === 1 ? 2 : 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                  >
                    {activeAudioSlot === 2 ? <Volume2 size={12} /> : <VolumeX size={12} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlot2(null)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Live Scoreboard Ticker */}
      {liveGames.length > 0 && (
        <footer className="flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-t border-white/10 bg-zinc-950 px-4 text-xs">
          <span className="font-bold uppercase tracking-wider text-[10px] text-accent shrink-0 pe-2">
            Live Scores
          </span>
          {liveGames.map((g) => (
            <div
              key={g.id}
              onClick={() => {
                setSlot2({
                  title: `${g.away.name} vs ${g.home.name}`,
                  url: `https://www.youtube-nocookie.com/embed?autoplay=1`,
                });
              }}
              role="button"
              tabIndex={0}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] shrink-0 cursor-pointer hover:bg-white/15"
            >
              <span className="text-white/70">{g.away.abbr || g.away.name}</span>
              <span className="font-bold text-accent tabular-nums">
                {g.away.score || "0"} - {g.home.score || "0"}
              </span>
              <span className="text-white/70">{g.home.abbr || g.home.name}</span>
              <span className="text-[9.5px] text-white/40">{g.detail || "Live"}</span>
            </div>
          ))}
        </footer>
      )}
    </div>
  );
}
