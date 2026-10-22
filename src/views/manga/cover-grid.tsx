import { BookOpen } from "lucide-react";

export type GridItem = {
  key: string;
  title: string;
  cover?: string;
  subtitle?: string;
};

export function CoverGrid({
  items,
  onOpen,
}: {
  items: GridItem[];
  onOpen: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-5">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onOpen(it.key)}
          className="group flex flex-col gap-2 text-start outline-none"
        >
          <div className="aspect-[2/3] overflow-hidden rounded-xl bg-elevated ring-1 ring-edge-soft transition-shadow group-hover:ring-accent group-focus-visible:ring-accent">
            {it.cover ? (
              <img
                src={it.cover}
                alt=""
                referrerPolicy="no-referrer"
                loading="lazy"
                draggable={false}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ink-subtle">
                <BookOpen size={28} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="line-clamp-2 text-[13px] font-medium text-ink">{it.title}</div>
            {it.subtitle && (
              <div className="truncate text-[11.5px] text-ink-subtle">{it.subtitle}</div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
