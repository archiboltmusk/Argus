import { useSettings } from "@/lib/settings";
import { parseHostList } from "@/lib/streams/dead-links";
import { useT } from "@/lib/i18n";
import { Section, ToggleRow } from "../shared";

const inputClass =
  "h-10 w-full max-w-sm rounded-xl bg-canvas/60 px-3 text-[13px] text-ink ring-1 ring-edge-soft outline-none focus:ring-accent";

function ListField({
  label,
  hint,
  value,
  placeholder,
  onChange,
  suggestion,
}: {
  suggestion?: string;
  label: string;
  hint: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 px-1 py-2">
      <div className="text-[14px] font-medium text-ink">{label}</div>
      <div className="text-[12.5px] text-ink-muted">{hint}</div>
      <input
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
      {suggestion && !parseHostList(value).includes(suggestion) && (
        <button
          type="button"
          onClick={() => onChange(value.trim() ? `${value.trim()}, ${suggestion}` : suggestion)}
          className="w-fit rounded-full bg-ink/[0.06] px-3 py-1 text-[12px] font-medium text-ink-muted hover:text-ink"
        >
          + {suggestion}
        </button>
      )}
    </div>
  );
}

export function BestLinkRows() {
  const t = useT();
  const { settings, update } = useSettings();
  return (
    <Section
      title={t("Best link")}
      subtitle={t("Tune which source Argus puts first. Nothing here adds sources.")}
    >
      <ToggleRow
        label={t("Prefer smooth, trusted releases")}
        sub={t(
          "Rank releases with a bitrate that plays cleanly (4K 14-30 Mbps, 1080p 4-8 Mbps), boost your preferred groups and hosts, and demote regional dubs that replace the original speech.",
        )}
        value={settings.bestLinkScoring}
        onChange={(v) => update({ bestLinkScoring: v })}
      />
      <ListField
        label={t("Preferred release groups")}
        hint={t("Comma-separated, for example FLUX, NTb, QxR. These get a bonus when Argus picks the top stream.")}
        value={settings.preferredReleaseGroups}
        placeholder="FLUX, NTb, QxR"
        onChange={(v) => update({ preferredReleaseGroups: v })}
      />
      <ListField
        label={t("Preferred hosts")}
        hint={t(
          "Comma-separated host names, for example pixeldrain.com. Direct links from these hosts get a bonus. You can also pin a host from the source list.",
        )}
        value={settings.preferredHosts}
        placeholder="pixeldrain.com"
        suggestion="pixeldrain.com"
        onChange={(v) => update({ preferredHosts: v })}
      />
      <ToggleRow
        label={t("Match your display and player")}
        sub={t("Demote HDR and Dolby Vision files your screen or player cannot show properly.")}
        value={settings.capabilityMatching}
        onChange={(v) => update({ capabilityMatching: v })}
      />
      <ToggleRow
        label={t("Demote links that fail fast")}
        sub={t(
          "If you back out of a stream within 20 seconds twice, Argus ranks it lower next time. Stored on this device only.",
        )}
        value={settings.deadLinkDemotion}
        onChange={(v) => update({ deadLinkDemotion: v })}
      />
    </Section>
  );
}
