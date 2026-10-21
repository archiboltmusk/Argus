import type { MetaPreview } from "../api";

let rpdbKey = "";
/** RatingPosterDB key: when set, IMDb-keyed posters get rating badges baked in. */
export function setRpdbKey(k: string) {
  rpdbKey = k.trim();
}

function posterUrl(item: MetaPreview) {
  if (rpdbKey && item.id.startsWith("tt")) {
    return `https://api.ratingposterdb.com/${encodeURIComponent(rpdbKey)}/imdb/poster-default/${item.id}.jpg?fallback=true`;
  }
  return item.poster;
}

export function Poster({ item, onOpen }: { item: MetaPreview; onOpen: (m: MetaPreview) => void }) {
  const src = posterUrl(item);
  return (
    <button className="poster" onClick={() => onOpen(item)} title={item.name}>
      {src ? <img src={src} alt="" loading="lazy" decoding="async" /> : <div className="poster-fallback">{item.name}</div>}
      <span className="poster-name">{item.name}</span>
    </button>
  );
}
