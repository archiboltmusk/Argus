import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import type { DebridSlug } from "@/lib/streams/types";
import { Section, ToggleRow } from "../shared";
import { SettingRow } from "../kit";

const PROVIDERS: ReadonlyArray<{ slug: DebridSlug; name: string }> = [
  { slug: "rd", name: "Real-Debrid" },
  { slug: "tb", name: "TorBox" },
  { slug: "ad", name: "AllDebrid" },
  { slug: "pm", name: "Premiumize" },
  { slug: "dl", name: "Debrid-Link" },
];

const MASK = { WebkitTextSecurity: "disc" } as React.CSSProperties;

export function DebridBackupSection() {
  const t = useT();
  const { settings, update } = useSettings();
  const setKeys = (slug: DebridSlug, raw: string) => {
    const keys = raw.split("\n").map((k) => k.trim());
    update({ debridBackupKeys: { ...settings.debridBackupKeys, [slug]: keys } });
  };
  return (
    <Section
      title={t("Backup accounts")}
      subtitle={t(
        "Add more of your own accounts for a service. If the main account is out of quota, rate limited, expired or the service is down, Argus tries the next account for that service. Keys stay on this device.",
      )}
    >
      <ToggleRow
        label={t("Fall back to backup accounts")}
        value={settings.debridFailover}
        onChange={(debridFailover) => update({ debridFailover })}
      />
      {settings.debridFailover &&
        PROVIDERS.map((p) => (
          <SettingRow
            key={p.slug}
            wide
            label={t("{name} backup keys", { name: p.name })}
            desc={t("One key per line, tried top to bottom.")}
          >
            <textarea
              value={(settings.debridBackupKeys[p.slug] ?? []).join("\n")}
              onChange={(e) => setKeys(p.slug, e.target.value)}
              rows={2}
              spellCheck={false}
              autoComplete="off"
              style={MASK}
              className="block w-full resize-y rounded-[10px] border border-edge-soft bg-elevated px-3 py-2 font-mono text-[13px] text-ink outline-none focus-visible:border-edge"
            />
          </SettingRow>
        ))}
    </Section>
  );
}

export function StreamSpeedSection() {
  const t = useT();
  const { settings, update } = useSettings();
  return (
    <Section
      title={t("Stream speed test")}
      subtitle={t(
        "Adds a Test speed button to direct-link sources. It downloads the first 1.5 MB to show latency and throughput before you commit to a stream. Off by default because it contacts the source.",
      )}
    >
      <ToggleRow
        label={t("Show Test speed on sources")}
        value={settings.streamSpeedTest}
        onChange={(streamSpeedTest) => update({ streamSpeedTest })}
      />
    </Section>
  );
}
