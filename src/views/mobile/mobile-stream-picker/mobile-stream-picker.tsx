import { useState, useMemo } from "react";
import { X, Play, ExternalLink, Copy, Check, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import type { Meta } from "@/lib/cinemeta";
import { useSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth";
import { useDebridClients } from "@/lib/debrid/registry";
import { useAddons } from "@/views/play-picker/use-addons";
import { useImdbId } from "@/views/play-picker/use-imdb-id";
import { usePipelineResult } from "@/views/play-picker/use-pipeline-result";
import { buildStreamIds } from "@/lib/streams/stream-ids";
import { resolveStream } from "@/lib/streams/resolve";
import type { ScoredStream } from "@/lib/streams/types";
import type { PlayEpisode, PlayerSrc } from "@/lib/view";
import {
  IOS_PLAYER_OPTIONS,
  launchIosExternalPlayer,
  type IosPlayerId,
} from "@/lib/player/ios-external-players";

interface MobileStreamPickerProps {
  meta: Meta;
  episode?: PlayEpisode;
  onClose: () => void;
  onPlayInApp: (src: PlayerSrc) => void;
}

export function MobileStreamPicker({
  meta,
  episode,
  onClose,
  onPlayInApp,
}: MobileStreamPickerProps) {
  const { settings, update } = useSettings();
  const { authKey } = useAuth();
  const debrids = useDebridClients();
  const { addons } = useAddons(authKey, settings);
  const imdb = useImdbId(meta, settings.tmdbKey);

  const [filterQuality, setFilterQuality] = useState<string>("all");
  const [resolvingStream, setResolvingStream] = useState<ScoredStream | null>(null);
  const [resolvedLink, setResolvedLink] = useState<{ url: string; stream: ScoredStream } | null>(null);
  const [showPlayerChoice, setShowPlayerChoice] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const streamIds = useMemo(
    () => buildStreamIds(meta.id, episode, imdb.id),
    [meta.id, episode, imdb.id],
  );

  const { result, loading } = usePipelineResult({
    meta,
    episode,
    imdbId: imdb.id,
    imdbIdVerified: imdb.verified,
    streamIds,
    addons,
    debrids,
    settings,
    strictMode: false,
    filterDisabled: true,
    animeTitles: null,
  });

  const streams: ScoredStream[] = (result?.picker?.all ?? []) as ScoredStream[];

  const filteredStreams = useMemo(() => {
    if (filterQuality === "all") return streams;
    if (filterQuality === "4k") return streams.filter((s: ScoredStream) => s.resolution === "4K");
    if (filterQuality === "1080p") return streams.filter((s: ScoredStream) => s.resolution === "1080p");
    if (filterQuality === "720p") return streams.filter((s: ScoredStream) => s.resolution === "720p");
    if (filterQuality === "debrid") return streams.filter((s: ScoredStream) => Object.values(s.cached ?? {}).some(Boolean));
    return streams;
  }, [streams, filterQuality]);

  const titleText = useMemo(() => {
    if (!episode) return meta.name;
    const epNum = `S${episode.season} E${episode.episode}`;
    return episode.name ? `${meta.name} · ${epNum} · ${episode.name}` : `${meta.name} · ${epNum}`;
  }, [meta.name, episode]);

  const handleSelectStream = async (stream: ScoredStream) => {
    setResolvingStream(stream);
    setResolveError(null);

    try {
      const res = await resolveStream(
        stream,
        debrids,
        new AbortController().signal,
        false,
        false,
        meta.type === "series" ? { season: episode?.season ?? 1, episode: episode?.episode ?? 1 } : undefined,
      );

      if (!res.ok) {
        setResolveError(`Failed to resolve stream: ${res.code || "Source unavailable"}`);
        setResolvingStream(null);
        return;
      }

      const streamUrl = res.data.url;
      const defaultChoice = settings.iosExternalPlayer;

      // If user has a set preference and it's not "ask", execute directly
      if (defaultChoice && defaultChoice !== "ask") {
        if (defaultChoice === "in-app") {
          onPlayInApp({
            meta,
            episode,
            url: streamUrl,
            title: titleText,
            subtitles: res.data.subtitles,
            isLive: false,
          });
          onClose();
          return;
        }

        await launchIosExternalPlayer(defaultChoice, streamUrl, titleText);
        setResolvingStream(null);
        onClose();
        return;
      }

      // If format is not web safe (.mkv / AC3) or preference is "ask", show player choice sheet
      setResolvedLink({ url: streamUrl, stream });
      setShowPlayerChoice(true);
      setResolvingStream(null);
    } catch (err: any) {
      setResolveError(err?.message || "Error resolving stream");
      setResolvingStream(null);
    }
  };

  const handleLaunchChoice = async (playerId: IosPlayerId) => {
    if (!resolvedLink) return;

    if (rememberChoice && playerId !== "copy" && playerId !== "iina") {
      update({ iosExternalPlayer: playerId });
    }

    if (playerId === "in-app") {
      onPlayInApp({
        meta,
        episode,
        url: resolvedLink.url,
        title: titleText,
        isLive: false,
      });
      setShowPlayerChoice(false);
      onClose();
      return;
    }

    if (playerId === "copy") {
      await navigator.clipboard.writeText(resolvedLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    await launchIosExternalPlayer(playerId, resolvedLink.url, titleText);
    setShowPlayerChoice(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-zinc-900 border-t border-white/10 shadow-2xl overflow-hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/10">
          <div className="min-w-0 pr-4">
            <h2 className="text-lg font-bold text-white truncate tracking-tight">
              {titleText}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
              <span>{loading ? "Searching streams..." : `${streams.length} stream${streams.length === 1 ? "" : "s"} found`}</span>
              {loading && <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-zinc-300 hover:bg-white/20 active:scale-95 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quality Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto px-6 py-2.5 scrollbar-none border-b border-white/5 bg-zinc-950/40">
          {[
            { id: "all", label: "All" },
            { id: "4k", label: "4K UHD" },
            { id: "1080p", label: "1080p" },
            { id: "720p", label: "720p" },
            { id: "debrid", label: "⚡ Cached" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilterQuality(pill.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filterQuality === pill.id
                  ? "bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                  : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Error notification if resolution failed */}
        {resolveError && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <span>{resolveError}</span>
          </div>
        )}

        {/* Stream List */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2.5 min-h-[220px]">
          {loading && streams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-sm font-medium">Querying fast streams from your addons...</p>
            </div>
          ) : filteredStreams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
              <p className="text-sm font-medium">No streams found for this filter.</p>
              <button
                type="button"
                onClick={() => setFilterQuality("all")}
                className="text-xs text-cyan-400 underline underline-offset-2"
              >
                Show all streams
              </button>
            </div>
          ) : (
            filteredStreams.map((stream: ScoredStream, idx: number) => {
              const isResolvingThis = resolvingStream === stream;
              const res = stream.resolution || "HD";
              const is4k = res === "4K";
              const is1080p = res === "1080p";
              const isCached = Object.values(stream.cached ?? {}).some(Boolean);
              const size = stream.size ? `${(stream.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : null;
              const tags: string[] = [
                stream.hdrFormat,
                stream.codec,
                stream.source,
                stream.audio?.codec,
              ].filter(Boolean) as string[];

              return (
                <button
                  key={`${stream.addonId}-${stream.url || stream.infoHash}-${idx}`}
                  type="button"
                  disabled={!!resolvingStream}
                  onClick={() => handleSelectStream(stream)}
                  className="w-full text-left p-3.5 rounded-2xl bg-zinc-800/60 hover:bg-zinc-800/90 active:scale-[0.99] border border-white/5 hover:border-cyan-500/40 transition-all flex flex-col gap-2 group relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide ${
                          is4k
                            ? "bg-amber-400 text-black"
                            : is1080p
                            ? "bg-cyan-400 text-black"
                            : "bg-zinc-700 text-zinc-200"
                        }`}
                      >
                        {res.toUpperCase()}
                      </span>

                      {tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded bg-zinc-700/80 text-[10px] font-bold text-zinc-300"
                        >
                          {tag.toUpperCase()}
                        </span>
                      ))}

                      {isCached ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                          <Sparkles size={10} />
                          Cached
                        </span>
                      ) : stream.seeders != null ? (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-700/80 text-[10px] font-medium text-zinc-300">
                          {stream.seeders} seeds
                        </span>
                      ) : null}

                      {size && (
                        <span className="text-[11px] font-medium text-zinc-400">
                          {size}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-semibold text-zinc-400 px-2 py-0.5 rounded bg-zinc-900/60 border border-white/5">
                      {stream.addonName || stream.name || "Stream"}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed font-mono">
                    {stream.title || stream.parsedTitle || stream.name || "Video Stream"}
                  </p>

                  {isResolvingThis && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 text-cyan-300 text-xs font-semibold">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Preparing playback link...</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* iOS External Player Choice Modal Sheet */}
      {showPlayerChoice && resolvedLink && (
        <div className="fixed inset-0 z-60 flex flex-col justify-end bg-black/80 backdrop-blur-lg animate-in fade-in duration-150">
          <div
            className="w-full rounded-t-3xl bg-zinc-900 border-t border-white/10 p-6 flex flex-col gap-4 shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">Watch on iOS</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Select your preferred media player for instant hardware playback.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlayerChoice(false)}
                className="p-2 rounded-full bg-white/10 text-zinc-300 hover:bg-white/20"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5 max-h-[50vh] overflow-y-auto">
              {IOS_PLAYER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleLaunchChoice(opt.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                    opt.recommended
                      ? "bg-cyan-950/40 border-cyan-500/50 hover:bg-cyan-900/50"
                      : "bg-zinc-800/70 border-white/5 hover:bg-zinc-800"
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{opt.name}</span>
                      {opt.recommended && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-black text-[10px] font-black uppercase">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{opt.tagline}</p>
                  </div>
                  <ExternalLink size={16} className="text-cyan-400 shrink-0" />
                </button>
              ))}

              {/* In-app WebKit Player */}
              <button
                type="button"
                onClick={() => handleLaunchChoice("in-app")}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-800/70 border border-white/5 hover:bg-zinc-800 text-left transition-all"
              >
                <div>
                  <span className="text-sm font-bold text-white">Play in App</span>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Inline player (Note: .mkv files require Outplayer or Infuse)
                  </p>
                </div>
                <Play size={16} className="text-zinc-300 shrink-0" />
              </button>

              {/* Copy stream link */}
              <button
                type="button"
                onClick={() => handleLaunchChoice("copy")}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-800/40 border border-white/5 hover:bg-zinc-800/70 text-left transition-all"
              >
                <div>
                  <span className="text-sm font-semibold text-zinc-300">Copy Stream Link</span>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {copied ? "Link copied to clipboard!" : "Paste into any media player manually"}
                  </p>
                </div>
                {copied ? <Check size={16} className="text-emerald-400 shrink-0" /> : <Copy size={16} className="text-zinc-400 shrink-0" />}
              </button>
            </div>

            {/* Remember Choice Checkbox */}
            <label className="flex items-center gap-2.5 pt-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-800 text-cyan-500 focus:ring-cyan-500 h-4 w-4"
              />
              <span>Remember as my default player on this device</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
