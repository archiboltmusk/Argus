import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { loadPlaylist } from "@/lib/iptv/store";
import type { IptvChannel } from "@/lib/iptv/types";
import type { SportsGame } from "@/lib/sports/espn";
import { matchGameChannels, type ChannelMatch } from "@/lib/sports/match-channels";
import { useLiveActions } from "@/views/live/hooks/use-live-actions";

export function WatchSourcesModal({ game, onClose }: { game: SportsGame; onClose: () => void }) {
  const t = useT();
  const { settings } = useSettings();
  const { handlePlay } = useLiveActions({ epg: null, activeId: null, playlist: null });
  const [matches, setMatches] = useState<ChannelMatch[] | null>(null);
  const sources = useMemo(
    () => settings.iptvPlaylists.filter((p) => p.kind !== "epg"),
    [settings.iptvPlaylists],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const lists = await Promise.all(
        sources.map((s) =>
          loadPlaylist(s)
            .then((p) => p.channels)
            .catch(() => [] as IptvChannel[]),
        ),
      );
      if (!cancelled) setMatches(matchGameChannels(game, lists.flat()));
    })();
    return () => {
      cancelled = true;
    };
  }, [game, sources]);

  const play = (ch: IptvChannel) => {
    onClose();
    handlePlay(ch);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[80vh] w-full max-w-lg flex-col gap-4 overflow-hidden rounded-2xl border border-edge-soft bg-canvas p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-semibold text-ink">
              {game.away.name} {t("at")} {game.home.name}
            </h3>
            <p className="text-[12px] text-ink-subtle">{t("Channels from your own playlists")}</p>
          </div>
          <button
            type="button"
            aria-label={t("Close")}
            onClick={onClose}
            className="text-ink-muted hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex min-h-0 flex-col gap-1.5 overflow-y-auto">
          {sources.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-subtle">
              {t(
                "Add a playlist under Live TV to find channels for this game. Argus ships no sources.",
              )}
            </p>
          ) : matches === null ? (
            <p className="py-6 text-center text-[13px] text-ink-subtle">{t("Searching…")}</p>
          ) : matches.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-subtle">
              {t("No channel in your playlists matches this game.")}
            </p>
          ) : (
            matches.map(({ channel }) => (
              <button
                key={channel.id}
                type="button"
                onClick={() => play(channel)}
                className="flex items-center gap-3 rounded-xl bg-elevated px-3 py-2.5 text-start hover:bg-elevated/70"
              >
                {channel.logo ? (
                  <img src={channel.logo} alt="" className="h-8 w-8 shrink-0 object-contain" />
                ) : (
                  <div className="h-8 w-8 shrink-0 rounded-md bg-canvas" />
                )}
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                  {channel.name}
                </span>
                {channel.group && (
                  <span className="shrink-0 text-[11px] text-ink-subtle">{channel.group}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
