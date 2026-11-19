import { directMusicStream } from "@/lib/music/direct-stream";
import { getMusicHealth } from "@/lib/music/sources";
import type { MusicConnectorHealth } from "@/lib/music/types";
import { useEffect, useState } from "react";
import { Globe, Palette, Play, Sparkles, Users, Zap } from "lucide-react";
import {
  MULTI_STREAMING_SERVICES,
  getServiceCuratedTracks,
  type StreamingServiceId,
} from "@/lib/music/multi-streaming-hub";
import { HARBOR_MUSIC_THEMES, createHarborMusicRoom } from "@/lib/music/harbor-music-engine";
import { getCurrentDaylistVibe } from "@/lib/music/all-music-apps-features";
import { playMusic } from "@/lib/music/player";
import type { MusicTrack } from "@/lib/music/types";

export function MusicServicesBrowser({ onExploreTrack }: { onExploreTrack?: (track: MusicTrack) => void }) {
  const [directUrl, setDirectUrl] = useState("");
  const [directError, setDirectError] = useState("");
  const [directBusy, setDirectBusy] = useState(false);
  const [connectors, setConnectors] = useState<MusicConnectorHealth[]>([]);
  useEffect(() => { let active = true; void getMusicHealth().then(value => { if (active) setConnectors(value); }).catch(() => {}); return () => { active = false; }; }, []);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeServiceId, setActiveServiceId] = useState<StreamingServiceId>("reverbnation");
  const [activeTheme, setActiveTheme] = useState<string>("midnight-harbor");
  const [roomCreatedCode, setRoomCreatedCode] = useState<string | null>(null);

  const daylist = getCurrentDaylistVibe();
  const currentService = MULTI_STREAMING_SERVICES.find((s) => s.id === activeServiceId) ?? MULTI_STREAMING_SERVICES[0];
  const serviceTracks = getServiceCuratedTracks(activeServiceId);
  const liveConnector = connectors.find(connector => connector.id === activeServiceId);

  const filteredServices = MULTI_STREAMING_SERVICES.filter((svc) => {
    if (selectedCategory === "all") return true;
    return svc.category === selectedCategory;
  });

  const handlePlay = (track: MusicTrack) => {
    void playMusic(track, serviceTracks).catch(() => {});
    onExploreTrack?.(track);
  };

  const handleCreateRoom = () => {
    const room = createHarborMusicRoom("You", serviceTracks[0] ?? null);
    setRoomCreatedCode(room.roomCode);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Daylist Dynamic Vibe Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-accent/20 via-surface to-accent/5 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Argus Daylist · {daylist.timeOfDay}
            </span>
            <h2 className="text-2xl font-extrabold sm:text-3xl">{daylist.title}</h2>
            <p className="max-w-2xl text-xs sm:text-sm text-ink-subtle">{daylist.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-surface/60 px-4 py-2.5 text-right">
              <span className="text-[11px] uppercase tracking-wider text-ink-subtle block">Energy & Tempo</span>
              <span className="font-bold text-accent">{daylist.energyLevel}% · {daylist.tempoBpmRange[0]}-{daylist.tempoBpmRange[1]} BPM</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-edge-soft bg-surface p-5">
        <h2 className="text-lg font-semibold">Open an audio stream</h2>
        <p className="mt-1 text-sm text-ink-muted">Use a direct HTTPS audio file or station endpoint, not a music-service webpage. Codec, seeking and availability depend on the endpoint. The address is passed to the player and can appear in playback history.</p>
        <form className="mt-4 flex flex-wrap gap-3" onSubmit={async event => {
          event.preventDefault(); if (directBusy) return;
          setDirectError(""); setDirectBusy(true);
          try { const track = directMusicStream(directUrl); await playMusic(track, [track]); }
          catch (error) { setDirectError(error instanceof Error ? error.message : "Could not open this stream."); }
          finally { setDirectBusy(false); }
        }}>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">HTTPS audio address<input type="url" required value={directUrl} onChange={event => setDirectUrl(event.target.value)} placeholder="https://your-server.example/audio.flac" className="rounded-lg bg-elevated p-3" /></label>
          <button disabled={directBusy} className="self-end rounded-lg bg-elevated px-5 py-3">{directBusy ? "Opening…" : "Play stream"}</button>
        </form>
        <p role="status" className="mt-2 text-sm text-ink-muted">{directError}</p>
      </section>
      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2" role="tablist">
        {[
          { id: "all", label: `All Services (${MULTI_STREAMING_SERVICES.length})` },
          { id: "indie-community", label: "Indie & Community (ReverbNation, SoundCloud, Jamendo)" },
          { id: "audiophile-lossless", label: "Audiophile Lossless (Bandcamp, Tidal, Debrid)" },
          { id: "self-hosted", label: "Self-Hosted (Subsonic, Jellyfin, Plex)" },
          { id: "mainstream", label: "Mainstream (YouTube Music)" },
          { id: "decentralized", label: "Decentralized (Audius)" },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              selectedCategory === cat.id
                ? "bg-accent text-white shadow-md shadow-accent/25"
                : "border border-white/10 bg-surface hover:bg-surface-hover text-ink-subtle"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Streaming Services Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((svc) => {
          const isSelected = activeServiceId === svc.id;
          return (
            <div
              key={svc.id}
              onClick={() => setActiveServiceId(svc.id)}
              className={`group relative flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition-all ${
                isSelected
                  ? "border-accent bg-accent/10 shadow-lg"
                  : "border-white/10 hover:border-white/20 bg-surface"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: svc.badgeColor }}
                    />
                    <h3 className="font-bold text-base group-hover:text-accent transition-colors">
                      {svc.name}
                    </h3>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    svc.isLossless ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-ink-subtle"
                  }`}>
                    {svc.maxFidelity}
                  </span>
                </div>
                <p className="mt-2 text-xs text-ink-subtle leading-relaxed">{svc.tagline}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                {svc.features.map((feat) => (
                  <span
                    key={feat}
                    className="rounded-md bg-white/5 border border-white/5 px-2 py-0.5 text-[10px] text-ink-subtle"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Selected Service Showcase & Tracks */}
      <section className="rounded-3xl border border-white/10 bg-surface/50 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-accent" />
              <h3 className="text-xl font-bold">{currentService.name} Music & Streams</h3>
            </div>
            <p className="text-xs text-ink-subtle mt-0.5">
              {liveConnector?.playable ? `Native connector: ${liveConnector.health}` : "Native playback not verified for this service. Catalog matches may use a different provider."}
              <span className="block mt-1">Audio quality is determined by the actual recording and playback source, not this service card.</span>
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-3 py-1 text-xs font-semibold self-start sm:self-auto">
            Federated & Playable
          </span>
        </div>

        {/* Tracks List */}
        <div className="space-y-3">
          {serviceTracks.length > 0 ? (
            serviceTracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-surface p-3.5 hover:border-white/15 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={track.artwork}
                    alt={track.title}
                    className="h-12 w-12 rounded-lg object-cover shadow"
                  />
                  <div>
                    <h4 className="font-semibold text-sm group-hover:text-accent transition-colors">
                      {track.title}
                    </h4>
                    <p className="text-xs text-ink-subtle">{track.artist} · {track.album}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-ink-subtle">{track.durationLabel}</span>
                  <button
                    onClick={() => handlePlay(track)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-md hover:scale-105 transition-all"
                    aria-label={`Play ${track.title}`}
                  >
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-ink-subtle text-sm">
              Connect your account or local library to browse live {currentService.name} streams.
            </div>
          )}
        </div>
      </section>

      {/* Music settings */}
      <section className="rounded-3xl border border-accent/20 bg-accent/5 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-accent">
              <Zap className="h-3 w-3" /> Argus Music
            </span>
            <h3 className="text-xl font-bold">Player themes and room preview</h3>
            <p className="text-xs text-ink-subtle">
              Customize the player or preview a local listening room.
            </p>
          </div>
          <button
            onClick={handleCreateRoom}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-accent/90 transition-all"
          >
            <Users className="h-4 w-4" /> Preview Listening Room
          </button>
        </div>

        {roomCreatedCode && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between text-sm">
            <div>
              <span className="font-bold text-emerald-400">Local room preview</span>
              <p className="text-xs text-ink-subtle mt-0.5">Preview code <strong className="text-white font-mono tracking-widest">{roomCreatedCode}</strong>. This preview does not connect to other listeners.</p>
            </div>
            <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-500/20 px-3 py-1 rounded-lg">
              Local only
            </span>
          </div>
        )}

        {/* Theme presets */}
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-accent" /> Player Theme Presets
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {HARBOR_MUSIC_THEMES.map((theme) => {
              const active = activeTheme === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => setActiveTheme(theme.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    active ? "border-accent bg-accent/10 shadow-sm" : "border-white/10 hover:border-white/20 bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{theme.name}</span>
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: theme.accentColor }}
                    />
                  </div>
                  <p className="text-[11px] text-ink-subtle mt-1">{theme.description}</p>
                  <div className="mt-2 text-[10px] text-ink-subtle font-mono">
                    Seekbar: {theme.seekBarStyle} · {theme.fontPairing}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
