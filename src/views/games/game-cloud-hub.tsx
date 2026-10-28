import { useState } from "react";
import { Cloud, ExternalLink, Gamepad2, Laptop, MonitorPlay, Sparkles, Tv, Wifi } from "lucide-react";
import {
  CLOUD_PROVIDERS,
  launchCloudGame,
  type CloudProviderInfo,
} from "@/lib/games/cloud-gaming";

const FEATURED_CLOUD_GAMES = [
  {
    name: "Fortnite",
    service: "Xbox Cloud & GeForce NOW",
    badge: "100% Free",
    url: "https://www.xbox.com/play/games/fortnite/BT5P2X999VH2",
    accent: "border-green-500/30 bg-green-500/10 text-green-400",
  },
  {
    name: "Cyberpunk 2077",
    service: "GeForce NOW RTX",
    badge: "Ray Tracing",
    url: "https://play.geforcenow.com",
    accent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  {
    name: "Grand Theft Auto V",
    service: "GeForce NOW & Boosteroid",
    badge: "Instant Play",
    url: "https://play.geforcenow.com",
    accent: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  {
    name: "Starfield",
    service: "Xbox Game Pass Cloud",
    badge: "Game Pass",
    url: "https://www.xbox.com/play/games/starfield/9NCVJGNZT9SN",
    accent: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  },
  {
    name: "Genshin Impact",
    service: "GeForce NOW Cloud",
    badge: "Free to Play",
    url: "https://play.geforcenow.com",
    accent: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  },
  {
    name: "Forza Horizon 5",
    service: "Xbox Cloud & GeForce NOW",
    badge: "4K 60FPS",
    url: "https://www.xbox.com/play/games/forza-horizon-5-standard-edition/9NKX70BBC2TN",
    accent: "border-pink-500/30 bg-pink-500/10 text-pink-400",
  },
];

export function GameCloudHub() {
  const [activeTab, setActiveTab] = useState<"services" | "games">("services");
  const providers = Object.values(CLOUD_PROVIDERS) as CloudProviderInfo[];

  return (
    <section className="games-cloud-hub space-y-6 px-4 py-2">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-r from-sky-950/40 via-surface/90 to-surface p-6 shadow-sm">
        <div className="relative z-10 flex flex-col gap-3 md:max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
              <Cloud size={16} />
            </span>
            <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-sky-300">
              Zero Local Storage Needed
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
            Cloud Gaming & Remote In-Home Streaming
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            Launch AAA games instantly directly in high-framerate WebRTC streams. Stream your owned PC games on high-end RTX 4080 rigs, play Xbox Game Pass titles with a controller, or stream from your desktop PC via Sunshine & Moonlight with sub-5ms latency.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveTab("services")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "services"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "bg-canvas text-ink-subtle hover:text-ink"
              }`}
            >
              Cloud Platforms
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("games")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "games"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "bg-canvas text-ink-subtle hover:text-ink"
              }`}
            >
              Popular Cloud Titles
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      {activeTab === "services" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <div
              key={p.id}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition-all hover:scale-[1.01] hover:shadow-lg ${p.accentColor}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas/60">
                      {p.id === "moonlight" ? (
                        <Wifi size={18} />
                      ) : p.id === "xbox_cloud" ? (
                        <Tv size={18} />
                      ) : p.id === "luna" ? (
                        <Gamepad2 size={18} />
                      ) : (
                        <MonitorPlay size={18} />
                      )}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-ink">{p.name}</h3>
                      <p className="text-[11px] font-medium opacity-80">{p.tagline}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-canvas/70 px-2 py-0.5 text-[10px] font-mono font-semibold">
                    {p.badge}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-relaxed opacity-90">{p.description}</p>
              </div>

              <div className="mt-5 border-t border-current/10 pt-3">
                <div className="mb-3 flex items-center justify-between text-[11px] opacity-75">
                  <span>{p.resolutionInfo}</span>
                  {p.freeTier && (
                    <span className="flex items-center gap-1 font-semibold text-emerald-400">
                      <Sparkles size={11} /> Free tier
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => launchCloudGame(p)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-canvas/80 py-2.5 text-xs font-bold text-ink shadow-sm transition-transform hover:bg-canvas active:scale-[0.98]"
                >
                  <span>Launch {p.name}</span>
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>
          ))}

          {/* Moonlight / Sunshine Host Setup Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-edge-soft bg-surface/70 p-5 text-xs transition-colors hover:border-edge">
            <div>
              <div className="flex items-center gap-2 text-ink">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas">
                  <Laptop size={18} className="text-accent" />
                </span>
                <div>
                  <h3 className="text-base font-bold">Personal Sunshine Host</h3>
                  <p className="text-[11px] text-ink-subtle">Stream from your desktop GPU</p>
                </div>
              </div>
              <p className="mt-3 text-ink-muted leading-relaxed">
                Install Sunshine on your gaming rig (Windows/Linux/macOS) and pair with Moonlight in Argus. Enjoy full HDR, 120 FPS, and zero cloud latency over your local Wi-Fi.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-edge-soft flex items-center justify-between">
              <a
                href="https://app.sunshinedev.eth.limo"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-accent hover:underline flex items-center gap-1"
              >
                Sunshine Guide <ExternalLink size={11} />
              </a>
              <button
                type="button"
                onClick={() => launchCloudGame(CLOUD_PROVIDERS.moonlight)}
                className="rounded-lg bg-elevated px-3 py-1.5 font-semibold text-ink hover:bg-elevated/90"
              >
                Open Host Manager
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Featured Games Grid */
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {FEATURED_CLOUD_GAMES.map((game) => (
            <div
              key={game.name}
              className={`flex items-center justify-between rounded-2xl border p-4 transition-all hover:scale-[1.01] ${game.accent}`}
            >
              <div>
                <h4 className="text-sm font-bold text-ink">{game.name}</h4>
                <p className="text-[11.5px] opacity-80">{game.service}</p>
                <span className="mt-1 inline-block rounded-md bg-canvas/80 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
                  {game.badge}
                </span>
              </div>
              <button
                type="button"
                onClick={() => launchCloudGame({ baseUrl: game.url } as CloudProviderInfo)}
                className="flex items-center gap-1.5 rounded-xl bg-canvas/90 px-3.5 py-2 text-xs font-bold text-ink shadow-sm transition-all hover:bg-canvas active:scale-[0.98]"
              >
                <span>Play</span>
                <ExternalLink size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
