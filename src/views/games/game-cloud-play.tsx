import { useState, useRef } from "react";
import { Cloud, ExternalLink, Sparkles, Tv, Wifi } from "lucide-react";
import { AnchoredMenu } from "@/components/anchored-menu";
import type { GameSummary } from "@/lib/games/types";
import {
  resolveCloudGamingOptions,
  launchCloudGame,
  type CloudGameOption,
} from "@/lib/games/cloud-gaming";

export function GameCloudPlay({
  game,
  steamId,
  igdbId,
}: {
  game: GameSummary;
  steamId?: number;
  igdbId?: number;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const options = resolveCloudGamingOptions(game, steamId, igdbId);
  if (options.length === 0) return null;

  const primaryOption = options[0];

  const handleLaunch = (option: CloudGameOption) => {
    setOpen(false);
    launchCloudGame(option);
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={anchorRef}
        type="button"
        className="games-button games-button-cloud flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-400 transition-all hover:border-sky-500/50 hover:bg-sky-500/20 active:scale-[0.98]"
        onClick={() => {
          if (options.length === 1) {
            handleLaunch(primaryOption);
          } else {
            setOpen((prev) => !prev);
          }
        }}
        title={`Stream ${game.name} via cloud with zero downloads`}
      >
        <Cloud size={18} className="text-sky-400" />
        <span>Stream in Cloud</span>
        {primaryOption.freeTier && (
          <span className="flex items-center gap-0.5 rounded-full bg-sky-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-300">
            <Sparkles size={9} /> Free
          </span>
        )}
      </button>

      {options.length > 1 && (
        <AnchoredMenu
          anchorRef={anchorRef}
          open={open}
          onClose={() => setOpen(false)}
          width={320}
          backdrop={false}
        >
          <div className="flex flex-col gap-1 p-2 text-xs">
            <div className="px-2 py-1.5 font-semibold text-ink-subtle uppercase tracking-wider text-[10px]">
              Available Cloud Platforms
            </div>
            {options.map((opt) => (
              <button
                key={`${opt.providerId}-${opt.launchUrl}`}
                type="button"
                onClick={() => handleLaunch(opt)}
                className="group flex flex-col items-start gap-1 rounded-lg p-2.5 text-start transition-colors hover:bg-elevated/70"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-ink group-hover:text-accent">
                    {opt.providerId === "moonlight" ? (
                      <Wifi size={14} className="text-amber-400" />
                    ) : opt.providerId === "xbox_cloud" ? (
                      <Tv size={14} className="text-green-400" />
                    ) : (
                      <Cloud size={14} className="text-sky-400" />
                    )}
                    {opt.providerName}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-canvas/80 px-1.5 py-0.5 font-mono text-[9.5px] text-ink-subtle">
                      {opt.badge}
                    </span>
                    <ExternalLink size={12} className="opacity-40 group-hover:opacity-100" />
                  </div>
                </div>
                {opt.notes && (
                  <p className="text-[11px] text-ink-muted leading-tight">{opt.notes}</p>
                )}
              </button>
            ))}
          </div>
        </AnchoredMenu>
      )}
    </div>
  );
}
