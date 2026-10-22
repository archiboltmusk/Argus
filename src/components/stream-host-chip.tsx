import { Pin } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { parseHostList, streamHost } from "@/lib/streams/dead-links";

/** Shows where a direct link is hosted and lets the user pin that host as preferred. */
export function StreamHostChip({ url }: { url: string | null | undefined }) {
  const t = useT();
  const { settings, update } = useSettings();
  const host = streamHost(url);
  if (!host) return null;
  const bare = host.replace(/^www\./, "");
  const pinned = parseHostList(settings.preferredHosts).some(
    (h) => bare === h || bare.endsWith(`.${h}`),
  );
  const toggle = () => {
    const list = parseHostList(settings.preferredHosts);
    const next = pinned
      ? list.filter((h) => !(bare === h || bare.endsWith(`.${h}`)))
      : [...list, bare];
    update({ preferredHosts: next.join(", ") });
  };
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      title={pinned ? t("Unpin this host") : t("Prefer links from this host")}
      aria-pressed={pinned}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 transition-colors ${
        pinned
          ? "bg-accent-soft text-accent ring-accent/30"
          : "bg-ink/[0.04] text-ink-muted ring-ink/[0.06] hover:text-ink"
      }`}
    >
      <Pin size={11} strokeWidth={2.2} />
      {bare}
    </button>
  );
}
