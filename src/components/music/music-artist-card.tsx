import { useState, type MouseEvent } from "react";
import { Play, UserRound } from "@/components/icons/music-icons";
import { MusicPlaylistCover } from "@/components/music/music-playlist-cover";
import { Poster } from "@/components/poster";
import { useT } from "@/lib/i18n";
import type { MusicArtistRef } from "@/lib/music/types";

const APPLE_MUSIC_GRADIENTS = [
  "linear-gradient(135deg, #FF2D55 0%, #7928CA 100%)", // Apple Crimson & Violet
  "linear-gradient(135deg, #FF375F 0%, #FF9F0A 100%)", // Sunset Rose & Amber
  "linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%)", // Electric Azure & Indigo
  "linear-gradient(135deg, #30D158 0%, #0A84FF 100%)", // Emerald Spring & Cyan
  "linear-gradient(135deg, #BF5AF2 0%, #FF375F 100%)", // Orchid & Neon Coral
  "linear-gradient(135deg, #FF9F0A 0%, #FFD60A 100%)", // Golden Solar
  "linear-gradient(135deg, #64D2FF 0%, #0A84FF 100%)", // Glacier & Deep Blue
  "linear-gradient(135deg, #5E5CE6 0%, #FF2D55 100%)", // Ultra Violet to Apple Red
  "linear-gradient(135deg, #FF453A 0%, #FF9F0A 100%)", // Lava Coral
  "linear-gradient(135deg, #32D74B 0%, #64D2FF 100%)", // Aurora Mint
];

function hashArtistName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function artistMonogram(name: string): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return "";
  const first = Array.from(trimmed)[0] ?? "";
  if (!first || first === " ") return "";
  const upper = first.toLocaleUpperCase();
  return Array.from(upper)[0] ?? first;
}

export function MusicArtistCard({
  artist,
  albumArtwork = [],
  subtitle,
  onPlay,
  onOpen,
  onMenu,
  className = "",
}: {
  artist: MusicArtistRef;
  albumArtwork?: readonly (string | null | undefined)[];
  subtitle?: string;
  onPlay?: () => void;
  onOpen?: () => void;
  onMenu?: (event: MouseEvent<HTMLElement>) => void;
  className?: string;
}) {
  const t = useT();
  const [deadArtwork, setDeadArtwork] = useState<string | null>(null);
  const name = artist.name?.trim() ?? "";
  const caption = subtitle ?? artist.subtitle ?? "";
  const seed = `artist:${artist.connectorId}:${artist.id}`;
  const artwork = typeof artist.artwork === "string" ? artist.artwork.trim() : "";
  const covers = albumArtwork.filter(
    (url): url is string => typeof url === "string" && url.trim().length > 0,
  );
  const mosaic = covers.length >= 4 ? covers.slice(0, 4) : covers.slice(0, 1);
  const showArtwork = artwork.length > 0 && deadArtwork !== artwork;
  const mono = artistMonogram(name);
  const activate = onPlay ?? onOpen;
  const label = onPlay
    ? t("music.card.playItem", { title: name })
    : t("music.card.openItem", { title: name });

  const gradient = APPLE_MUSIC_GRADIENTS[hashArtistName(name || "artist") % APPLE_MUSIC_GRADIENTS.length];

  return (
    <button
      type="button"
      onClick={activate}
      onContextMenu={onMenu}
      aria-label={label}
      className={`group flex w-full min-w-0 flex-col text-start ${className}`}
    >
      <span className="relative block w-full overflow-hidden rounded-full ring-1 ring-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-out group-hover:scale-[1.04] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
        {showArtwork ? (
          <Poster
            src={artwork}
            seed={seed}
            ratio="square"
            className="w-full rounded-full transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            onError={() => setDeadArtwork(artwork)}
          />
        ) : mosaic.length > 0 ? (
          <MusicPlaylistCover
            artwork={mosaic}
            seed={seed}
            className="rounded-full transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            glyphSize={22}
          />
        ) : (
          <span
            className="relative block w-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.35)]"
            style={{ background: gradient }}
          >
            <span aria-hidden="true" className="block" style={{ paddingTop: "100%" }} />
            <span className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/30 pointer-events-none" />
            <span className="absolute inset-0 grid place-items-center font-bold text-[36px] leading-none text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              {mono || <UserRound size={32} aria-hidden="true" className="text-white drop-shadow" />}
            </span>
          </span>
        )}
        {onPlay && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center rounded-full bg-black/40 backdrop-blur-[2px] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <span className="grid size-12 place-items-center rounded-full bg-white text-black shadow-xl transition-transform duration-200 ease-out group-hover:scale-105">
              <Play size={18} fill="currentColor" className="ml-0.5" />
            </span>
          </span>
        )}
      </span>
      <span className="mt-[12px] flex min-w-0 items-center justify-center gap-[5px]">
        <span className="truncate text-[13px] font-semibold text-ink group-hover:text-primary transition-colors duration-150" title={name}>
          {name}
        </span>
      </span>
      {caption && (
        <span className="mt-0.5 truncate text-center text-[12px] text-ink-subtle" title={caption}>
          {caption}
        </span>
      )}
    </button>
  );
}
