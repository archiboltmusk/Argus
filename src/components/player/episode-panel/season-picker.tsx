import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

export function SeasonPicker({
  seasons,
  active,
  onChange,
}: {
  seasons: number[];
  active: number;
  onChange: (n: number) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-full bg-white/10 ps-3.5 pe-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-white/[0.15]"
      >
        {active === 0 ? t("Specials") : t("Season {n}", { n: active })}
        <ChevronDown
          size={15}
          strokeWidth={2.4}
          className={`text-ink-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute end-0 top-full z-30 mt-2 max-h-[52vh] w-44 overflow-y-auto apple-liquid-glass p-1.5 animate-menu-pop text-white">
          <div className="flex flex-col gap-0.5">
            {seasons.map((n) => (
              <button
                key={n}
                onClick={() => {
                  onChange(n);
                  setOpen(false);
                }}
                className={`flex w-full items-center rounded-xl px-3.5 py-2 text-start text-[13px] transition-all ${
                  n === active
                    ? "bg-white/20 font-semibold text-white ring-1 ring-white/25 shadow-xs"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {n === 0 ? t("Specials") : t("Season {n}", { n })}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
