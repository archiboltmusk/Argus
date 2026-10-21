import type { MetaPreview } from "../api";

export function Poster({ item, onOpen }: { item: MetaPreview; onOpen: (m: MetaPreview) => void }) {
  return (
    <button className="poster" onClick={() => onOpen(item)} title={item.name}>
      {item.poster ? <img src={item.poster} alt="" loading="lazy" decoding="async" /> : <div className="poster-fallback">{item.name}</div>}
      <span className="poster-name">{item.name}</span>
    </button>
  );
}
