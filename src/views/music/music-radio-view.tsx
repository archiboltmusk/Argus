import { useState } from "react";
import { Play, Radio, Globe, Disc3, Pause } from "lucide-react";
import { playMusic, useMusicPlayer } from "@/lib/music/player";
import { directMusicStream } from "@/lib/music/direct-stream";
import type { MusicTrack } from "@/lib/music/types";
import { getCurrentDaylistVibe } from "@/lib/music/all-music-apps-features";

export type LiveStation = {
  id: string;
  name: string;
  genre: string;
  tagline: string;
  streamUrl: string;
  artwork: string;
  badge: string;
  listeners?: string;
  color: string;
};

export const LIVE_RADIO_STATIONS: LiveStation[] = [
  {
    id: "groove-salad",
    name: "Groove Salad",
    genre: "Ambient & Chillout",
    tagline: "A nicely chilled plate of ambient/downtempo beats and grooves.",
    streamUrl: "https://ice1.somafm.com/groovesalad-128-mp3",
    artwork: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    badge: "24/7 Live",
    listeners: "Top Rated",
    color: "#00E5FF",
  },
  {
    id: "defcon-radio",
    name: "DEF CON Radio",
    genre: "Cyberpunk & Synthwave",
    tagline: "Music for hacking, coding, and nocturnal electronic exploration.",
    streamUrl: "https://ice1.somafm.com/defcon-128-mp3",
    artwork: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    badge: "Special Event",
    listeners: "Worldwide",
    color: "#FF0055",
  },
  {
    id: "drone-zone",
    name: "Drone Zone",
    genre: "Atmospheric & Space",
    tagline: "Served best chilled, safe with most medications. Atmospheric textures.",
    streamUrl: "https://ice1.somafm.com/dronezone-128-mp3",
    artwork: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    badge: "Deep Focus",
    listeners: "Calm",
    color: "#7928CA",
  },
  {
    id: "indie-pop",
    name: "Indie Pop Rocks!",
    genre: "Indie Rock & Pop",
    tagline: "New and favorite independent pop and alternative rock tracks.",
    streamUrl: "https://ice1.somafm.com/indiepop-128-mp3",
    artwork: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    badge: "Curated",
    listeners: "Trending",
    color: "#FFB800",
  },
  {
    id: "linn-classical",
    name: "Linn Classical HQ",
    genre: "Classical & Acoustic",
    tagline: "Audiophile-grade 320kbps classical masterpieces recorded in pristine quality.",
    streamUrl: "http://radio.linnrecords.com:8000/stream",
    artwork: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600&auto=format&fit=crop&q=80",
    badge: "Audiophile 320k",
    listeners: "Lossless Grade",
    color: "#10B981",
  },
  {
    id: "secret-agent",
    name: "Secret Agent",
    genre: "Spy & Lounge",
    tagline: "The soundtrack for your stylish, mysterious cloak-and-dagger lifestyle.",
    streamUrl: "https://ice1.somafm.com/secretagent-128-mp3",
    artwork: "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=600&auto=format&fit=crop&q=80",
    badge: "Retro Cool",
    listeners: "Classic",
    color: "#EC4899",
  },
  {
    id: "sonic-universe",
    name: "Sonic Universe",
    genre: "Nu-Jazz & Avant-Garde",
    tagline: "Transcending the world of jazz with avant-garde, eclectic, and nu-grooves.",
    streamUrl: "https://ice1.somafm.com/sonicuniverse-128-mp3",
    artwork: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    badge: "Eclectic",
    listeners: "Underground",
    color: "#3B82F6",
  },
  {
    id: "kexp-live",
    name: "KEXP 90.3 FM",
    genre: "Variety & Discovery",
    tagline: "Where the music matters. Legendary Seattle listener-powered independent broadcast.",
    streamUrl: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",
    artwork: "https://images.unsplash.com/photo-1520523839898-507121c00a64?w=600&auto=format&fit=crop&q=80",
    badge: "FM Simulcast",
    listeners: "Seattle WA",
    color: "#F97316",
  },
];

export function MusicRadioView({ onExploreTrack }: { onExploreTrack?: (track: MusicTrack) => void }) {
  const [activeStationId, setActiveStationId] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState("");
  const [directError, setDirectError] = useState("");
  const [directBusy, setDirectBusy] = useState(false);
  const player = useMusicPlayer();
  const currentTrack = player.current;
  const isPlaying = player.phase === "playing";
  const daylist = getCurrentDaylistVibe();

  const handlePlayStation = async (station: LiveStation) => {
    setActiveStationId(station.id);
    const track: MusicTrack = {
      id: `station:${station.id}`,
      connectorId: "direct",
      playbackUrl: station.streamUrl,
      title: station.name,
      artist: station.genre,
      album: "Argus Live Radio",
      artwork: station.artwork,
      durationSeconds: 0,
      durationLabel: "LIVE",
      mediaKind: "audio",
      quality: {
        codec: "mp3",
        bitrateKbps: 128,
        lossless: false,
        sampleRateHz: 44100,
      },
    };
    try {
      await playMusic(track, [track]);
      onExploreTrack?.(track);
    } catch (e) {
      console.error("Failed to play radio station", e);
    }
  };

  const handleStartArtistRadio = async () => {
    if (!currentTrack) return;
    try {
      await playMusic(currentTrack, [currentTrack, ...player.recents]);
    } catch (e) {
      console.error("Failed to tune artist radio", e);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Apple Music Style Radio Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-red-600/25 via-surface to-purple-600/20 p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-red-400">
                Argus Radio 1 · Live Worldwide
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/80">
                Flow: {daylist.title}
              </span>
            </div>
            <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight text-white">
              Curated Broadcasts & Live Audio
            </h2>
            <p className="max-w-xl text-sm text-ink-subtle">
              Commercial-free worldwide live stations, ambient chillout streams, and smart algorithmic stations built from your listening flow.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handlePlayStation(LIVE_RADIO_STATIONS[0])}
              className="inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-xl transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              <Play className="h-4 w-4 fill-current ml-0.5" />
              Tune Live Broadcast
            </button>
          </div>
        </div>

        {/* Subtle background glow */}
        <div className="pointer-events-none absolute -end-16 -top-16 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />
      </section>

      {/* Smart Artist Radio Tuning (if current track exists) */}
      {currentTrack && (
        <section className="flex items-center justify-between rounded-2xl border border-white/10 bg-surface/60 p-5 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="grid size-11 place-items-center rounded-xl bg-accent/20 text-accent ring-1 ring-accent/30">
              <Disc3 className="h-6 w-6 animate-spin duration-3000" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Infinite Radio based on {currentTrack.title}
              </h3>
              <p className="text-xs text-ink-subtle">
                Automatically finds complementary harmonic tracks by {currentTrack.artist} and related artists.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStartArtistRadio}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold text-white transition-all hover:bg-white hover:text-black hover:scale-105"
          >
            <Radio className="h-3.5 w-3.5" />
            Start Artist Station
          </button>
        </section>
      )}

      {/* Live Global Stations Grid */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Featured Stations</h3>
            <p className="text-xs text-ink-subtle">Streamed live in high fidelity with zero interruption.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {LIVE_RADIO_STATIONS.map((station) => {
            const isPlayingThis = activeStationId === station.id && isPlaying;
            return (
              <div
                key={station.id}
                onClick={() => handlePlayStation(station)}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-surface/50 p-4 cursor-pointer transition-all duration-300 hover:border-white/20 hover:scale-[1.02] hover:shadow-xl backdrop-blur-md"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-xl mb-3 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                  <img
                    src={station.artwork}
                    alt={station.name}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="absolute top-2.5 start-2.5 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-white/10">
                    {station.badge}
                  </span>

                  <span className="absolute bottom-2.5 end-2.5 grid size-10 place-items-center rounded-full bg-white text-black shadow-lg transition-transform duration-200 group-hover:scale-110">
                    {isPlayingThis ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white group-hover:text-accent transition-colors">
                      {station.name}
                    </h4>
                    <span className="text-[11px] font-mono text-ink-subtle">{station.listeners}</span>
                  </div>
                  <p className="text-xs font-medium text-accent">{station.genre}</p>
                  <p className="text-[11px] text-ink-subtle line-clamp-2 leading-relaxed">
                    {station.tagline}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Direct HTTPS Stream Player */}
      <section className="rounded-2xl border border-white/10 bg-surface/40 p-6 backdrop-blur-md space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-accent" />
          <h3 className="text-base font-semibold text-white">Tune Custom Audio Stream</h3>
        </div>
        <p className="text-xs text-ink-subtle leading-relaxed">
          Listen to any private shoutcast, icecast, or direct HTTPS FLAC/AAC/MP3 stream by entering its direct URL.
        </p>

        <form
          className="mt-3 flex flex-wrap gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (directBusy || !directUrl.trim()) return;
            setDirectError("");
            setDirectBusy(true);
            try {
              const track = directMusicStream(directUrl);
              await playMusic(track, [track]);
              onExploreTrack?.(track);
            } catch (error) {
              setDirectError(error instanceof Error ? error.message : "Could not open this stream.");
            } finally {
              setDirectBusy(false);
            }
          }}
        >
          <input
            type="url"
            required
            value={directUrl}
            onChange={(event) => setDirectUrl(event.target.value)}
            placeholder="https://icecast.example.com/radio.mp3"
            className="flex-1 min-w-[260px] rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-xs text-white placeholder-ink-muted outline-none focus:border-accent transition-colors"
          />
          <button
            type="submit"
            disabled={directBusy}
            className="rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-black transition-transform duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {directBusy ? "Tuning…" : "Play Stream"}
          </button>
        </form>
        {directError && <p role="alert" className="text-xs text-red-400">{directError}</p>}
      </section>
    </div>
  );
}
