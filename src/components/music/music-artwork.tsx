import { useState, type ImgHTMLAttributes } from "react";
import placeholder from "@/assets/music-placeholder.svg";

/** Only retry a known equivalent cover-art endpoint; never guess another artist's image. */
export function musicArtworkCandidates(src?: string): string[] {
  if (!src) return [];
  const urls = [src];
  const match =
    /^https:\/\/archive\.org\/download\/mbid-([a-f0-9-]{36})\/mbid-\1-\d+_thumb\d+\.jpg(?:\?.*)?$/i.exec(
      src,
    );
  if (match) urls.push(`https://coverartarchive.org/release/${match[1]}/front-500`);
  return urls;
}

export function MusicArtwork({
  src,
  alt = "",
  onError,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState<{ src?: string; count: number }>({ count: 0 });
  const candidates = musicArtworkCandidates(src);
  const index = failed.src === src ? failed.count : 0;
  const url = candidates[index] ?? placeholder;
  return (
    <img
      {...props}
      alt={alt}
      src={url}
      referrerPolicy="no-referrer"
      onError={(event) => {
        if (url !== placeholder)
          setFailed((current) => ({ src, count: (current.src === src ? current.count : 0) + 1 }));
        onError?.(event);
      }}
    />
  );
}
