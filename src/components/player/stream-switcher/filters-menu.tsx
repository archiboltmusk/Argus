import { ChevronDown, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AddonLogo } from "@/components/addon-logo";
import { FormatBadge, type BadgeKind } from "@/components/format-badge";
import { useT } from "@/lib/i18n";
import type { StreamMode } from "@/components/stream-mode-toggle";
import { abbreviateLanguages } from "./lang-utils";
import { QUALITY_LABEL, type QualityKey } from "./quality";

const SOURCE_BADGE: Record<string, BadgeKind> = {
  Remux: "remux",
  BluRay: "bluray",
  "WEB-DL": "webdl",
  WEBRip: "webrip",
  HDTV: "hdtv",
  CAM: "cam",
};

type Opt = { id: string; name: string; count: number };
type QualOpt = { id: Exclude<QualityKey, "all">; name: string; count: number; badge: BadgeKind };

export type SwitcherFilters = {
  mode: StreamMode;
  setMode: (m: StreamMode) => void;
  quality: QualityKey;
  setQuality: (q: QualityKey) => void;
  qualityOptions: QualOpt[];
  source: string;
  setSource: (s: string) => void;
  sourceOptions: Opt[];
  addon: string;
  setAddon: (a: string) => void;
  addonOptions: Opt[];
  addonLogos: Map<string, string | null>;
  total: number;
  hasDebrid: boolean;
  cachedOnly: boolean;
  setCachedOnly: (v: boolean) => void;
  uncachedHidden: number;
  preferredLangs: string[];
  filterToPreferred: boolean;
  setFilterToPreferred: (v: boolean) => void;
  langHidden: number;
  rejectedCount: number;
  showFlagged: boolean;
  setShowFlagged: (v: boolean) => void;
};

export function activeCountOf(f: SwitcherFilters): number {
  return (
    (f.mode !== "both" ? 1 : 0) +
    (f.quality !== "all" ? 1 : 0) +
    (f.source !== "all" ? 1 : 0) +
    (f.addon !== "all" ? 1 : 0) +
    (f.cachedOnly ? 1 : 0) +
    (f.filterToPreferred ? 1 : 0) +
    (f.showFlagged ? 1 : 0)
  );
}

export function FiltersPanel({
  filters,
  onClose,
}: {
  filters: SwitcherFilters;
  onClose?: () => void;
}) {
  const t = useT();
  const active = activeCountOf(filters);

  const reset = () => {
    filters.setMode("both");
    filters.setQuality("all");
    filters.setSource("all");
    filters.setAddon("all");
    filters.setCachedOnly(false);
    filters.setFilterToPreferred(false);
    filters.setShowFlagged(false);
  };

  const showLangs = filters.preferredLangs.length > 0 && filters.langHidden > 0;
  const showCached = filters.hasDebrid && filters.uncachedHidden > 0;
  const showFlagged = filters.rejectedCount > 0;

  return (
    <div className="flex h-full flex-col bg-transparent text-ink selection:bg-accent/30">
      {/* Panel Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-[13px] font-bold text-white">
          <SlidersHorizontal size={14} className="text-accent" />
          <span>{t("Filters")}</span>
          {active > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold tabular-nums text-canvas">
              {active}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {active > 0 && (
            <button
              onClick={reset}
              className="text-[11px] font-semibold text-ink-muted hover:text-white transition-colors"
            >
              {t("Reset")}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-white/10 hover:text-white transition-colors"
              aria-label={t("Close filters")}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
        <Section label={t("Sources")}>
          <div className="flex gap-1.5">
            {(
              [
                ["both", t("Both")],
                ["addons", t("Direct/debrid")],
                ["p2p", t("P2P")],
              ] as Array<[StreamMode, string]>
            ).map(([v, label]) => (
              <Chip key={v} active={filters.mode === v} onClick={() => filters.setMode(v)} grow>
                {label}
              </Chip>
            ))}
          </div>
        </Section>

        {filters.qualityOptions.length > 0 && (
          <Section label={t("Quality")}>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={filters.quality === "all"} onClick={() => filters.setQuality("all")}>
                {t("Any")}
              </Chip>
              {filters.qualityOptions.map((o) => (
                <Chip
                  key={o.id}
                  active={filters.quality === o.id}
                  onClick={() => filters.setQuality(o.id)}
                >
                  <FormatBadge kind={o.badge} size="sm" />
                  <span>{QUALITY_LABEL[o.id]}</span>
                  <Count n={o.count} />
                </Chip>
              ))}
            </div>
          </Section>
        )}

        {filters.sourceOptions.length > 0 && (
          <Section label={t("Format")}>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={filters.source === "all"} onClick={() => filters.setSource("all")}>
                {t("Any")}
              </Chip>
              {filters.sourceOptions.map((o) => (
                <Chip
                  key={o.id}
                  active={filters.source === o.id}
                  onClick={() => filters.setSource(o.id)}
                >
                  {SOURCE_BADGE[o.id] && <FormatBadge kind={SOURCE_BADGE[o.id]} size="sm" />}
                  <span>{o.name}</span>
                  <Count n={o.count} />
                </Chip>
              ))}
            </div>
          </Section>
        )}

        {filters.addonOptions.length > 1 && (
          <Section label={t("Addon")}>
            <div className="flex max-h-52 flex-col gap-1 overflow-y-auto pr-1">
              <AddonRow
                active={filters.addon === "all"}
                onClick={() => filters.setAddon("all")}
                name={t("All addons")}
                count={filters.total}
              />
              {filters.addonOptions.map((o) => (
                <AddonRow
                  key={o.id}
                  active={filters.addon === o.id}
                  onClick={() => filters.setAddon(o.id)}
                  name={o.name}
                  count={o.count}
                  logo={
                    <AddonLogo
                      addonId={o.id}
                      addonName={o.name}
                      manifestLogo={filters.addonLogos.get(o.id) ?? null}
                      size="sm"
                    />
                  }
                />
              ))}
            </div>
          </Section>
        )}

        {(showCached || showLangs || showFlagged) && (
          <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
            {showCached && (
              <ToggleRow
                label={t("Cached only")}
                hint={t("{n} uncached hidden", { n: filters.uncachedHidden })}
                on={filters.cachedOnly}
                onClick={() => filters.setCachedOnly(!filters.cachedOnly)}
              />
            )}
            {showLangs && (
              <ToggleRow
                label={t("{langs} only", { langs: abbreviateLanguages(filters.preferredLangs) })}
                hint={t("{n} hidden", { n: filters.langHidden })}
                on={filters.filterToPreferred}
                onClick={() => filters.setFilterToPreferred(!filters.filterToPreferred)}
              />
            )}
            {showFlagged && (
              <ToggleRow
                label={t("Show flagged")}
                hint={t("{n} hidden by trust filter", { n: filters.rejectedCount })}
                on={filters.showFlagged}
                onClick={() => filters.setShowFlagged(!filters.showFlagged)}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer Reset */}
      {active > 0 && (
        <div className="shrink-0 border-t border-white/10 p-3 bg-white/[0.03]">
          <button
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/14 bg-white/12 py-2 text-[12px] font-semibold text-white transition-all hover:bg-white/20 hover:border-white/25 active:scale-98"
          >
            <RotateCcw size={13} strokeWidth={2.4} />
            {t("Reset filters")}
          </button>
        </div>
      )}
    </div>
  );
}

export function FiltersMenu({
  filters,
  isOpen,
  onToggle,
}: {
  filters: SwitcherFilters;
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  const t = useT();
  const [localOpen, setLocalOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = activeCountOf(filters);

  const open = isOpen !== undefined ? isOpen : localOpen;
  const toggle = onToggle !== undefined ? onToggle : () => setLocalOpen((v) => !v);

  useEffect(() => {
    if (onToggle !== undefined || !localOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setLocalOpen(false);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [localOpen, onToggle]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggle}
        className={`flex h-9 items-center gap-2 rounded-md px-3.5 text-[11.5px] font-semibold tracking-[0.04em] transition-all ${
          open
            ? "bg-accent text-canvas ring-1 ring-accent font-bold"
            : active > 0
              ? "bg-elevated text-ink ring-1 ring-edge hover:bg-raised"
              : "bg-raised text-ink-muted hover:bg-elevated hover:text-ink"
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <SlidersHorizontal size={13} strokeWidth={2.2} />
        <span>{t("Filters")}</span>
        {active > 0 && (
          <span
            className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
              open ? "bg-canvas text-accent" : "bg-accent text-canvas"
            }`}
          >
            {active}
          </span>
        )}
        <ChevronDown
          size={12}
          strokeWidth={2.4}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Fallback floating dropdown if parent doesn't handle side-panel docking */}
      {onToggle === undefined && localOpen && (
        <div
          className="absolute end-0 top-full z-50 mt-2 max-h-[70vh] w-[320px] overflow-hidden apple-liquid-glass p-1"
        >
          <FiltersPanel filters={filters} onClose={() => setLocalOpen(false)} />
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 px-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/55">
        {label}
      </div>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  grow,
  children,
}: {
  active: boolean;
  onClick: () => void;
  grow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11.5px] transition-all border ${
        grow ? "flex-1 justify-center" : ""
      } ${
        active
          ? "bg-white text-black font-semibold border-white shadow-xs"
          : "bg-white/10 text-white/85 font-medium border-white/12 hover:bg-white/18 hover:border-white/20 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Count({ n }: { n: number }) {
  return <span className="text-[10px] font-mono tabular-nums opacity-60">({n})</span>;
}

function AddonRow({
  active,
  onClick,
  name,
  count,
  logo,
}: {
  active: boolean;
  onClick: () => void;
  name: string;
  count: number;
  logo?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-start text-[12px] transition-all ${
        active
          ? "bg-white/22 font-semibold text-white border border-white/30 shadow-xs"
          : "text-white/80 hover:bg-white/10 hover:text-white border border-transparent"
      }`}
    >
      <span className="shrink-0">{logo}</span>
      <span className="flex-1 truncate">{name}</span>
      <span className="text-[11px] font-mono tabular-nums text-white/60">{count}</span>
    </button>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  onClick,
}: {
  label: string;
  hint: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-start transition-colors hover:bg-white/10"
    >
      <span className="flex min-w-0 flex-col">
        <span className={`text-[12px] ${on ? "font-semibold text-white" : "text-white/75"}`}>
          {label}
        </span>
        <span className="truncate text-[10px] text-white/50">{hint}</span>
      </span>
      <span
        className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
          on ? "bg-white shadow-xs" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full transition-all ${
            on ? "start-3.5 bg-black" : "start-0.5 bg-white"
          }`}
        />
      </span>
    </button>
  );
}
