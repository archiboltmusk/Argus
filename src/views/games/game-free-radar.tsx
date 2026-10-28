import { useState } from "react";
import { ArrowUpRight, Flame, Gift, Globe, Monitor, Play, Sparkles, Wand2 } from "lucide-react";
import { openUrl } from "@/lib/window";
import type { GameSummary } from "@/lib/games/types";

export type FreeRadarItem = {
  id: string;
  title: string;
  source: string;
  badge: string;
  description: string;
  category: "giveaways" | "f2p" | "archive" | "hacks" | "cloud";
  url: string;
  image: string;
  steamId?: number;
  macNative?: boolean;
};

export const FREE_RADAR_ITEMS: FreeRadarItem[] = [
  // Giveaways & Promos
  {
    id: "epic-weekly",
    title: "Epic Games Weekly Free Mystery Game",
    source: "Epic Games Store",
    badge: "100% Free · Keep Forever",
    description: "Epic Games gives away 1–2 commercial games every Thursday (past titles include GTA V, Death Stranding, and Control). Claim once to keep forever.",
    category: "giveaways",
    url: "https://store.epicgames.com/free-games",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "gog-free-classics",
    title: "GOG Free Classics Collection",
    source: "GOG.com",
    badge: "DRM-Free · Zero Launcher",
    description: "Dozens of classic PC titles (Beneath a Steel Sky, Tyrian 2000, Ultima IV, Shadow Warrior) available permanently DRM-free with Mac wrappers.",
    category: "giveaways",
    url: "https://www.gog.com/partner/free_games",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "steam-next-fest",
    title: "Steam Next Fest & Prologues",
    source: "Steam",
    badge: "Free Multi-Hour Demos",
    description: "Hundreds of full playable game demos, developer livestreams, and standalone prologue editions released directly on Steam for free.",
    category: "giveaways",
    url: "https://store.steampowered.com/sale/nextfest",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
  },

  // Free to Play
  {
    id: "dota-2",
    title: "Dota 2",
    source: "Valve / Steam",
    badge: "macOS Native (Metal 3)",
    description: "Valve's legendary competitive MOBA. Complete hero roster is 100% free with zero pay-to-win mechanics and native Apple Silicon Metal graphics.",
    category: "f2p",
    url: "https://store.steampowered.com/app/570/Dota_2/",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80",
    steamId: 570,
    macNative: true,
  },
  {
    id: "war-thunder",
    title: "War Thunder",
    source: "Gaijin / Steam",
    badge: "macOS Native",
    description: "Comprehensive cross-platform military vehicle combat featuring aircraft, armored vehicles, and naval craft with full Apple Silicon optimization.",
    category: "f2p",
    url: "https://warthunder.com",
    image: "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80",
    steamId: 236390,
    macNative: true,
  },
  {
    id: "apex-legends",
    title: "Apex Legends",
    source: "EA / Respawn",
    badge: "Free Cloud Stream",
    description: "High-octane hero battle royale. Play instantly on Mac through GeForce NOW's free tier with zero installation required.",
    category: "f2p",
    url: "https://play.geforcenow.com",
    image: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
    steamId: 1172470,
  },

  // Archive & Open Source
  {
    id: "archive-dos",
    title: "Internet Archive MS-DOS Library",
    source: "Internet Archive",
    badge: "In-Browser Emulation",
    description: "Over 10,000 vintage PC titles (Prince of Persia, Doom, Oregon Trail, SimCity 2000, Wolfenstein 3D) playable in 1 click in your Mac browser.",
    category: "archive",
    url: "https://archive.org/details/softwarelibrary_msdos_games",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "openra",
    title: "OpenRA (Classic RTS Re-Engine)",
    source: "Open Source",
    badge: "Native Mac App",
    description: "Free, open-source re-implementation of Command & Conquer, Red Alert, and Dune 2000 with modern 4K widescreen and online multiplayer.",
    category: "archive",
    url: "https://www.openra.net",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    macNative: true,
  },
  {
    id: "itch-free",
    title: "itch.io Free Indie Hub",
    source: "itch.io",
    badge: "100,000+ Indie Games",
    description: "Discover innovative indie games, game jam winners, visual novels, and experimental prototypes directly downloadable for macOS.",
    category: "archive",
    url: "https://itch.io/games/free/platform-osx",
    image: "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=600&auto=format&fit=crop&q=80",
    macNative: true,
  },

  // Community ROM Hacks
  {
    id: "pokemon-unbound",
    title: "Pokémon Unbound",
    source: "Skeli / Community",
    badge: "Community Masterpiece",
    description: "Widely regarded as the pinnacle of fan-made RPGs. Custom Borrius region, Generation 8 battle engine, difficulty modes, and rich post-game.",
    category: "hacks",
    url: "https://www.pokecommunity.com/showthread.php?t=382178",
    image: "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "sm64-land",
    title: "Super Mario 64 Land",
    source: "Kaze Emanuar",
    badge: "Complete Remake",
    description: "Full-length community 3D platformer featuring 32 all-new stages, custom power-ups, and modern camera mechanics playable on Mac emulators.",
    category: "hacks",
    url: "https://archive.org",
    image: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=600&auto=format&fit=crop&q=80",
  },

  // Cloud Tiers
  {
    id: "gfn-free",
    title: "GeForce NOW Free Gaming Tier",
    source: "NVIDIA",
    badge: "Zero Download · Cloud RTX",
    description: "Stream games from your connected Steam and Epic libraries on Mac with 1-hour free sessions. Ideal for testing gameplay without purchasing hardware.",
    category: "cloud",
    url: "https://play.geforcenow.com",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
  },
];

export function GameFreeRadar({
  open,
}: {
  open?: (game: GameSummary) => void;
}) {
  const [filter, setFilter] = useState<"all" | "giveaways" | "f2p" | "archive" | "hacks" | "cloud">("all");

  const categories = [
    { key: "all", label: "All Free Ways", icon: Sparkles },
    { key: "giveaways", label: "Weekly Giveaways", icon: Gift },
    { key: "f2p", label: "Free-to-Play Blockbusters", icon: Flame },
    { key: "archive", label: "Internet Archive & Open Source", icon: Globe },
    { key: "hacks", label: "Community ROM Hacks", icon: Wand2 },
    { key: "cloud", label: "Free Cloud Sessions", icon: Monitor },
  ] as const;

  const items = filter === "all" ? FREE_RADAR_ITEMS : FREE_RADAR_ITEMS.filter((i) => i.category === filter);

  return (
    <section className="flex flex-col gap-4 my-6 games-inset">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase font-bold text-accent tracking-wider flex items-center gap-1.5">
            <Gift size={15} />
            100% Free Play Hub
          </span>
          <h2 className="text-xl font-bold text-ink">Free Games, Giveaways & Open Web Catalogs</h2>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-surface/60 p-1 rounded-xl border border-edge/40">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const active = filter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setFilter(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? "bg-accent text-canvas font-semibold shadow-sm"
                    : "text-ink-muted hover:text-ink hover:bg-elevated/50"
                }`}
              >
                <Icon size={13} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-surface/70 border border-edge/50 hover:border-accent/40 transition-all p-4"
          >
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-accent/15 text-accent border border-accent/20">
                  {item.badge}
                </span>
                <span className="text-[11px] font-medium text-ink-subtle">
                  {item.source}
                </span>
              </div>
              <h3 className="text-base font-bold text-ink group-hover:text-accent transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-ink-muted line-clamp-3 leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-edge/30">
              {item.macNative && (
                <span className="text-[11px] font-medium text-ink-subtle flex items-center gap-1">
                  <Play size={12} className="text-success" />
                  macOS Native
                </span>
              )}
              <div className="flex items-center gap-2 ms-auto">
                {item.steamId && open && (
                  <button
                    onClick={() =>
                      open({
                        id: `steam:${item.steamId}`,
                        name: item.title,
                        capsule: item.image,
                        steamId: item.steamId,
                        platforms: item.macNative ? ["Windows", "macOS"] : ["Windows"],
                      })
                    }
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-ink transition-colors"
                  >
                    View in Argus
                  </button>
                )}
                <button
                  onClick={() => void openUrl(item.url)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-accent text-canvas hover:brightness-110 shadow-sm transition-all"
                >
                  <span>Launch & Claim</span>
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
