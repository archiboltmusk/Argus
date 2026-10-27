import { useState } from "react";
import malLogo from "@/assets/mal.png";
import { useT } from "@/lib/i18n";
import { useMalMangaRails } from "@/lib/use-mal-manga-rails";
import type { MangaSummary } from "@/lib/manga/types";
import { CollapsibleSection } from "./collapsible-section";
import { MangaPosterRow } from "./manga-poster-row";

export function MalMangaRows({ onOpen }: { onOpen: (item: MangaSummary) => void }) {
  const { rails, loading } = useMalMangaRails();
  const [active, setActive] = useState(0);
  const t = useT();
  if (rails.length === 0 && !loading) return null;

  const idx = Math.min(active, Math.max(0, rails.length - 1));
  const current = rails[idx];

  return (
    <CollapsibleSection
      storageKey="argus.manga.malRowOpen"
      className="mt-8"
      title={t("Your MyAnimeList")}
      leading={
        <img
          src={malLogo}
          alt=""
          className="h-5 w-5 shrink-0 rounded-[4px] object-contain"
        />
      }
      trailing={
        current ? (
          <span className="text-[13px] text-ink-subtle">
            {current.title} <span className="tabular-nums">· {current.items.length}</span>
          </span>
        ) : undefined
      }
    >
      {rails.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {rails.map((r, i) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === idx}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium transition-all duration-200 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 ${
                i === idx
                  ? "bg-accent text-canvas"
                  : "bg-elevated/40 text-ink-muted ring-1 ring-edge-soft hover:bg-elevated/70 hover:text-ink"
              }`}
            >
              {r.title}
              <span className="tabular-nums text-[11px] opacity-70">{r.items.length}</span>
            </button>
          ))}
        </div>
      )}
      {current ? (
        <div key={current.key} className="argus-rise">
          <MangaPosterRow items={current.items} onOpen={onOpen} />
        </div>
      ) : (
        <MangaPosterRow items={null} onOpen={onOpen} />
      )}
    </CollapsibleSection>
  );
}
