import { useMemo } from "react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { Section, ToggleRow, Segmented, RowTitle, RowDesc } from "./shared";
import { INDIAN_REGIONAL_LANGUAGES } from "@/lib/player/regional-audio-dub";
import { getNightOwlWindowStatus } from "@/lib/downloads/night-owl";
import {
  Smartphone,
  Radio,
  Moon,
  ShieldCheck,
  Languages,
  Film,
  Search,
  Wifi,
  Bell,
  BatteryCharging,
  Gamepad2,
  Sliders,
  Send,
} from "lucide-react";

export function SettingsIndia() {
  const t = useT();
  const { settings, update } = useSettings();

  const nightStatus = useMemo(() => getNightOwlWindowStatus(), []);

  const budgetOptions = [
    { value: "1000", label: "1.0 GB / day" },
    { value: "1500", label: "1.5 GB (Jio/Airtel standard)" },
    { value: "2000", label: "2.0 GB / day" },
    { value: "3000", label: "3.0 GB / day" },
  ];

  const langOptions = [
    { value: "", label: t("Off (Original Audio)") },
    ...INDIAN_REGIONAL_LANGUAGES.map((l) => ({
      value: l.code,
      label: `${l.label} (${l.nativeLabel})`,
    })),
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Hotspot & Mobile Data Saver */}
      <Section
        title={t("Hotspot & Mobile Data Frugal Mode")}
        subtitle={t(
          "Engineered for Indian daily mobile data plans (1.5 GB - 2.5 GB/day). Prevents sudden quota exhaustion.",
        )}
      >
        <ToggleRow
          label={t("Jio / Airtel Hotspot Data Saver")}
          sub={t(
            "Prioritizes high-efficiency HEVC (x265) and AV1 micro-encodes (<1.2 GB per film, <400 MB per episode) and displays a live data odometer in player.",
          )}
          value={settings.hotspotDataSaver}
          onChange={(v) => update({ hotspotDataSaver: v })}
          leading={<Smartphone size={18} />}
        />

        {settings.hotspotDataSaver && (
          <div className="p-4 rounded-xl bg-elevated/40 border border-edge-soft/60 flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-accent">
              {t("Daily Mobile Hotspot Budget")}
            </span>
            <Segmented
              value={String(settings.hotspotDailyBudgetMb || 1500)}
              options={budgetOptions}
              onChange={(val) => update({ hotspotDailyBudgetMb: parseInt(val, 10) })}
            />
          </div>
        )}
      </Section>

      {/* 2. Indian Regional Audio & Dub Auto-Selector */}
      <Section
        title={t("Regional Audio & Dual-Language Dubs")}
        subtitle={t(
          "Automatically detects and prioritizes Indian regional language tracks without manual switching on every title.",
        )}
      >
        <div className="p-4 rounded-xl bg-elevated/40 border border-edge-soft/60 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Languages size={18} className="text-accent" />
            <span className="text-sm font-semibold text-ink">
              {t("Preferred Indian Language")}
            </span>
          </div>
          <p className="text-xs text-ink-muted">
            {t(
              "When an Indian film or international release includes multi-audio, Argus will switch directly to this dialect.",
            )}
          </p>
          <select
            className="h-10 rounded-lg border border-edge-soft bg-surface px-3 text-sm text-ink outline-none"
            value={settings.preferredRegionalAudio}
            onChange={(e) => update({ preferredRegionalAudio: e.target.value })}
          >
            {langOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <ToggleRow
          label={t("Auto-Switch to Regional Dub")}
          sub={t(
            "Automatically activates dubbed audio when watching foreign films or South Indian blockbusters with multi-audio tracks.",
          )}
          value={settings.autoSelectRegionalDub}
          onChange={(v) => update({ autoSelectRegionalDub: v })}
        />
      </Section>

      {/* 3. Bengal Cinema & Tollywood Detective Universe */}
      <Section
        title={t("Bengal & Regional Media Ecosystem")}
        subtitle={t(
          "Curation and phonetic intelligence tailored for Purulia, West Bengal, and Indian cinema fans.",
        )}
      >
        <ToggleRow
          label={t("Tollywood & Bengali Detective Universe Rails")}
          sub={t(
            "Surfaces curated Feluda, Byomkesh Bakshi, Satyajit Ray classics, and modern Hoichoi/SVF thrillers directly on Home and Movies views.",
          )}
          value={settings.bengaliCinemaRails}
          onChange={(v) => update({ bengaliCinemaRails: v })}
          leading={<Film size={18} />}
        />

        <ToggleRow
          label={t("Bengali & Hindi Phonetic Transliteration Search")}
          sub={t(
            "Enables intelligent transliteration: searching Romanized titles ('Sonar Kella', 'Bhooter Bhabishyat') automatically resolves to native Bengali & Hindi titles.",
          )}
          value={settings.phoneticSearchEnabled}
          onChange={(v) => update({ phoneticSearchEnabled: v })}
          leading={<Search size={18} />}
        />

        <ToggleRow
          label={t("Indian Cinema Dialogue Clarity EQ")}
          sub={t(
            "Custom 10-band DSP profile that amplifies center-channel speech frequencies while taming explosive bass rumbles and loud song interludes.",
          )}
          value={settings.regionalDialogueEq}
          onChange={(v) => update({ regionalDialogueEq: v })}
          leading={<Sliders size={18} />}
        />
      </Section>

      {/* 4. Live Cricket Audio Commentary Sync & Dugout Mixer */}
      <Section
        title={t("Cricket Commentary & Radio Sync")}
        subtitle={t(
          "Allows overlaying All India Radio (AIR) or Sports Flashes live commentary onto video streams with audio delay synchronization.",
        )}
      >
        <div className="p-4 rounded-xl bg-elevated/40 border border-edge-soft/60 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio size={18} className="text-accent" />
              <RowTitle>{t("Default Cricket Commentary Delay")}</RowTitle>
            </div>
            <span className="text-sm font-bold tabular-nums text-accent">
              {settings.cricketRadioSyncDelaySec >= 0 ? `+${settings.cricketRadioSyncDelaySec}` : settings.cricketRadioSyncDelaySec}s
            </span>
          </div>
          <RowDesc>
            {t(
              "Default time offset to align live radio audio with broadcast video streams. Can also be adjusted live in the Sports Sidebar.",
            )}
          </RowDesc>
          <div className="flex items-center gap-2 pt-1">
            {[-2, -1, -0.5, 0, 0.5, 1, 2, 3].map((sec) => (
              <button
                key={sec}
                type="button"
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  settings.cricketRadioSyncDelaySec === sec
                    ? "bg-accent text-white shadow-sm"
                    : "bg-surface hover:bg-elevated text-ink-muted hover:text-ink"
                }`}
                onClick={() => update({ cricketRadioSyncDelaySec: sec })}
              >
                {sec >= 0 ? `+${sec}` : sec}s
              </button>
            ))}
          </div>
        </div>

        <ToggleRow
          label={t("Ball-by-Ball Live Desktop Alerts")}
          sub={t(
            "Dispatches lightweight native desktop toasts for wickets, sixes, fours, and centuries when Argus is minimized in the background.",
          )}
          value={settings.cricketLiveAlerts}
          onChange={(v) => update({ cricketLiveAlerts: v })}
          leading={<Bell size={18} />}
        />

        <ToggleRow
          label={t("Dugout Dual-Audio Channel Mixer")}
          sub={t(
            "Preserves ambient stadium crowd noise while overlaying regional radio commentary with custom audio balance.",
          )}
          value={settings.cricketDugoutMixer}
          onChange={(v) => update({ cricketDugoutMixer: v })}
          leading={<Radio size={18} />}
        />
      </Section>

      {/* 5. Network Resilience & Campus Mesh */}
      <Section
        title={t("Network Resilience & LAN Peer Mesh")}
        subtitle={t(
          "Zero-data local network transfers and adaptive buffering for cell tower fluctuations.",
        )}
      >
        <ToggleRow
          label={t("Local LAN Peer-Share (Hostel / Campus Mesh)")}
          sub={t(
            "Streams or transfers downloaded game archives and 4K media across local Wi-Fi at 1 Gbps LAN speeds without consuming external ISP data.",
          )}
          value={settings.lanPeerShareEnabled}
          onChange={(v) => update({ lanPeerShareEnabled: v })}
          leading={<Wifi size={18} />}
        />

        <ToggleRow
          label={t("Peak-Hour Cellular Traffic Prefetching")}
          sub={t(
            "Aggressively pre-buffers 3 to 5 minutes of stream data ahead during clean bursts between 7:00 PM and 11:00 PM IST to counter cell tower congestion.",
          )}
          value={settings.adaptiveBufferPrefetch}
          onChange={(v) => update({ adaptiveBufferPrefetch: v })}
          leading={<Smartphone size={18} />}
        />

        <ToggleRow
          label={t("Telegram Remote Download Dispatcher")}
          sub={t(
            "Allows queueing downloads remotely by sending magnet or media links to your personal Telegram bot.",
          )}
          value={settings.telegramRemoteEnabled}
          onChange={(v) => update({ telegramRemoteEnabled: v })}
          leading={<Send size={18} />}
        />
      </Section>

      {/* 6. Night-Owl 12 AM - 6 AM Free Unlimited Data Scheduler */}
      <Section
        title={t("Night-Owl Unlimited Data Scheduler")}
        subtitle={t(
          "Tailored for Indian telcos offering free, uncapped high-speed data between 12:00 AM and 6:00 AM (e.g. Vi Binge All Night, Airtel/Jio off-peak).",
        )}
      >
        <ToggleRow
          label={t("Schedule Downloads for Midnight Window")}
          sub={t(
            "Queues media downloads during the day and automatically executes them between 12:00 AM and 6:00 AM.",
          )}
          value={settings.nightOwlDownloads}
          onChange={(v) => update({ nightOwlDownloads: v })}
          leading={<Moon size={18} />}
        />

        {settings.nightOwlDownloads && (
          <div className="flex items-center justify-between rounded-xl bg-surface/80 p-3.5 border border-edge-soft">
            <span className="text-xs font-medium text-ink-muted flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${nightStatus.isNightWindowActive ? "bg-success animate-pulse" : "bg-amber-400"}`} />
              {nightStatus.message}
            </span>
            <span className="text-[11px] text-ink-subtle">00:00 - 06:00 IST</span>
          </div>
        )}
      </Section>

      {/* 7. Gaming & Hardware Optimization */}
      <Section
        title={t("Gaming & Power Optimization")}
        subtitle={t(
          "Embedded retro emulation and battery management for MacBooks and handheld PCs.",
        )}
      >
        <ToggleRow
          label={t("Embedded WebAssembly Retro Gaming Engine")}
          sub={t(
            "Enables 1-click playable emulation for GBA, SNES, PS1, and PSP classics directly inside Argus with zero external emulator configuration.",
          )}
          value={settings.retroEmulatorEnabled}
          onChange={(v) => update({ retroEmulatorEnabled: v })}
          leading={<Gamepad2 size={18} />}
        />

        <ToggleRow
          label={t("Battery & Thermal Power-Saver Optimizer")}
          sub={t(
            "Automatically switches to high-efficiency hardware decoding profiles and throttles heavy shaders when running on laptop battery power.",
          )}
          value={settings.batteryPowerSaveMode}
          onChange={(v) => update({ batteryPowerSaveMode: v })}
          leading={<BatteryCharging size={18} />}
        />
      </Section>

      {/* 8. Indian OTT Availability Badges */}
      <Section
        title={t("Indian OTT Availability Badges")}
        subtitle={t(
          "Shows official streaming home in India (JioHotstar, SonyLIV, FanCode, Hoichoi, ZEE5) directly on match and title cards.",
        )}
      >
        <ToggleRow
          label={t("Display Indian Streaming Rights Badges")}
          sub={t(
            "Displays official broadcaster badges and one-click launch links on sports match cards and movie detail pages.",
          )}
          value={settings.showIndiaOttBadges}
          onChange={(v) => update({ showIndiaOttBadges: v })}
          leading={<ShieldCheck size={18} />}
        />
      </Section>
    </div>
  );
}
