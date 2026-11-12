import { useState } from "react";
import {
  Sparkles,
  Zap,
  Hand,
  Volume2,
  BookOpen,
  Film,
  ShieldCheck,
  Bot,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  History,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import {
  RECENT_UPGRADES,
  type UpgradeRelease,
  type UpgradeHighlight,
} from "@/lib/updater/recent-upgrades";
import { currentVersion } from "@/lib/updater/versions";
import { useUpdate } from "@/lib/updater/use-update";
import { Section } from "./shared";

function HighlightIcon({ icon }: { icon: UpgradeHighlight["icon"] }) {
  switch (icon) {
    case "gesture":
      return <Hand size={16} className="text-amber-400 shrink-0 mt-0.5" />;
    case "audio":
      return <Volume2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />;
    case "zap":
      return <Zap size={16} className="text-cyan-400 shrink-0 mt-0.5" />;
    case "book":
      return <BookOpen size={16} className="text-indigo-400 shrink-0 mt-0.5" />;
    case "film":
      return <Film size={16} className="text-rose-400 shrink-0 mt-0.5" />;
    case "shield":
      return <ShieldCheck size={16} className="text-teal-400 shrink-0 mt-0.5" />;
    case "bot":
      return <Bot size={16} className="text-purple-400 shrink-0 mt-0.5" />;
    default:
      return <Sparkles size={16} className="text-accent shrink-0 mt-0.5" />;
  }
}

function ReleaseCard({
  release,
  defaultExpanded = false,
}: {
  release: UpgradeRelease;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-xl border border-edge bg-elevated/40 p-4 transition-colors hover:border-edge-soft">
      <div
        className="flex cursor-pointer items-center justify-between gap-3 select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-[14px] font-bold text-ink">{release.version}</span>
          {release.badge && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${
                release.badge === "Latest"
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                  : release.badge === "Performance"
                    ? "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30"
                    : release.badge === "Major"
                      ? "bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30"
                      : "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"
              }`}
            >
              {release.badge}
            </span>
          )}
          <span className="text-[13.5px] font-medium text-ink-muted">{release.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-ink-subtle">{release.date}</span>
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted hover:bg-elevated hover:text-ink"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3.5 space-y-2.5 border-t border-edge-soft/60 pt-3.5">
          {release.highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
              <HighlightIcon icon={h.icon} />
              <div>
                <span className="font-semibold text-ink">{h.title}: </span>
                <span className="text-ink-muted">{h.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WhatsNewSection() {
  const t = useT();
  const [showAll, setShowAll] = useState(false);
  const update = useUpdate();

  const displayedReleases = showAll ? RECENT_UPGRADES : RECENT_UPGRADES.slice(0, 4);

  return (
    <Section
      title={t("What's New in Argus")}
      subtitle={t("Overview of recent upgrades, new features, and performance enhancements.")}
    >
      <div className="flex flex-col gap-3">
        {/* Active Version Status Bar */}
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-3.5 text-[13px]">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="font-semibold text-emerald-300">
              {t("Current Build: {ver}", { ver: currentVersion })}
            </span>
          </div>
          {update.status === "uptodate" && (
            <div className="flex items-center gap-1.5 font-medium text-emerald-400 text-[12px]">
              <CheckCircle2 size={14} />
              <span>{t("Up to date")}</span>
            </div>
          )}
        </div>

        {/* Release Cards */}
        <div className="space-y-2.5">
          {displayedReleases.map((release, idx) => (
            <ReleaseCard key={release.version} release={release} defaultExpanded={idx === 0} />
          ))}
        </div>

        {/* View All / Collapse Button */}
        {RECENT_UPGRADES.length > 4 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="flex items-center justify-center gap-2 rounded-xl border border-edge bg-elevated/30 py-2.5 text-[13px] font-semibold text-ink-muted transition-colors hover:bg-elevated hover:text-ink"
          >
            <History size={15} />
            <span>
              {showAll
                ? t("Show fewer releases")
                : t("View earlier updates ({count} more)", { count: RECENT_UPGRADES.length - 4 })}
            </span>
          </button>
        )}
      </div>
    </Section>
  );
}
