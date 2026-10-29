import { useMemo } from "react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { Section, ToggleRow, Segmented, RowTitle, RowDesc } from "./shared";
import { INDIAN_REGIONAL_LANGUAGES } from "@/lib/player/regional-audio-dub";
import { getNightOwlWindowStatus } from "@/lib/downloads/night-owl";
import { VINTAGE_CINEMA_PRESETS } from "@/lib/player/vintage-cinema-shaders";
import { COMMENTARY_CHOICES } from "@/lib/sports/multi-commentary-switcher";
import { VOICE_CLARIFIER_PROFILES, type VoiceClarifierProfileId } from "@/lib/player/neural-voice-clarifier";
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
  Zap,
  Save,
  Headphones,
  FastForward,
  QrCode,
  Sparkles,
  Network,
  Volume2,
  Eye,
  Bookmark,
  Share2,
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
      {/* 1. Wi-Fi Broadband vs Metered Hotspot Engine */}
      <Section
        title={t("Broadband & Data Efficiency Policy")}
        subtitle={t(
          "Configures bandwidth policies for uncapped home broadband versus daily metered mobile hotspots.",
        )}
      >
        <ToggleRow
          label={t("Wi-Fi Broadband is Always Unlimited")}
          sub={t(
            "Wi-Fi and Ethernet connections are 100% unmetered and uncapped: enables maximum 4K Remux / Dolby Vision fidelity, 24/7 unthrottled seeding, and suppresses budget warnings.",
          )}
          value={settings.wifiBroadbandUnlimited}
          onChange={(v) => update({ wifiBroadbandUnlimited: v })}
          leading={<Zap size={18} className="text-emerald-400" />}
        />

        {settings.wifiBroadbandUnlimited && (
          <div className="flex items-center justify-between rounded-xl bg-surface/80 p-3.5 border border-edge-soft">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {t("Unlimited Broadband Active: Zero Bitrate Caps & Uncapped Speeds")}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              {t("4K HDR Ready")}
            </span>
          </div>
        )}

        <ToggleRow
          label={t("Multi-Chunk Turbo Streamer (Zero-Wait 4K Seeking)")}
          sub={t(
            "Leverages unlimited broadband with a 4GB demuxer cache and 3600s forward readahead for instant (<200ms) seeks in massive 40GB–80GB Remux releases.",
          )}
          value={settings.turboStreamer4k}
          onChange={(v) => update({ turboStreamer4k: v })}
          leading={<Zap size={18} className="text-accent" />}
        />

        <ToggleRow
          label={t("Jio / Airtel Hotspot Data Saver (Metered Tethering)")}
          sub={t(
            "Engages only when tethering on a mobile hotspot: prioritizes HEVC/AV1 micro-encodes and displays a live quota odometer in the player.",
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

        <ToggleRow
          label={t("Audio-Only Stream Mode (--vid=no)")}
          sub={t(
            "Strips video decoding to reduce bandwidth footprint to ~25 MB / hour for cricket commentary, concerts, podcasts, or extreme data saving.",
          )}
          value={settings.audioOnlyStreamMode}
          onChange={(v) => update({ audioOnlyStreamMode: v })}
          leading={<Volume2 size={18} />}
        />

        <ToggleRow
          label={t("Smart Daytime-Leech / Midnight-Seed Torrent Policy")}
          sub={t(
            "Keeps torrent seeding uncapped 24/7 on unlimited Wi-Fi, but throttles background upload to 1 KB/s during the daytime on mobile hotspots to save daily quota.",
          )}
          value={settings.torrentTimePolicyEnabled}
          onChange={(v) => update({ torrentTimePolicyEnabled: v })}
          leading={<Network size={18} />}
        />
      </Section>

      {/* 2. Regional Audio & Dual-Language Dubs */}
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

      {/* 3. Vintage Cinema AI Shader Suite & Bengal Ecosystem */}
      <Section
        title={t("Bengal & Vintage Cinema Restoration Suite")}
        subtitle={t(
          "Neural restoration shaders and curation tailored for Purulia, West Bengal, and classic Indian cinema.",
        )}
      >
        <ToggleRow
          label={t("Vintage Cinema AI Shader Suite (Satyajit Ray & Golden Era Tollywood)")}
          sub={t(
            "Reconstructs 35mm silver-gelatin contrast, debands vintage DVD transfers, and sharpens micro-contours without plastic digital smoothing.",
          )}
          value={settings.vintageCinemaShaders}
          onChange={(v) => update({ vintageCinemaShaders: v })}
          leading={<Film size={18} className="text-amber-400" />}
        />

        {settings.vintageCinemaShaders && (
          <div className="p-4 rounded-xl bg-elevated/40 border border-edge-soft/60 flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              {t("Film Restoration Profile")}
            </span>
            <select
              className="h-10 rounded-lg border border-edge-soft bg-surface px-3 text-sm text-ink outline-none"
              value={settings.vintageCinemaPresetId}
              onChange={(e) => update({ vintageCinemaPresetId: e.target.value })}
            >
              {VINTAGE_CINEMA_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.directorOrEra}
                </option>
              ))}
            </select>
          </div>
        )}

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

        <ToggleRow
          label={t("Indian Serial Recap & Dramatic Filler Skipper")}
          sub={t(
            "Automatically detects and skips 4-minute recaps of yesterday's episode and prolonged multi-angle slow-motion dramatic reaction shots in daily soaps.",
          )}
          value={settings.serialFillerSkipper}
          onChange={(v) => update({ serialFillerSkipper: v })}
          leading={<FastForward size={18} />}
        />

        <ToggleRow
          label={t("Offline Regional Subtitles (Whisper Embedded)")}
          sub={t(
            "Uses on-device neural transcription to generate offline subtitles for rare Bengali, Hindi, and regional classics lacking subtitle files online.",
          )}
          value={settings.whisperSubtitlesEnabled}
          onChange={(v) => update({ whisperSubtitlesEnabled: v })}
          leading={<Languages size={18} />}
        />
      </Section>

      {/* 3. Live Cricket Audio Commentary & Multi-Commentary Switcher */}
      <Section
        title={t("Cricket Commentary & Multi-Language Switcher")}
        subtitle={t(
          "Seamlessly toggle between Bangla, Hindi, and English commentary feeds on the same live broadcast.",
        )}
      >
        <ToggleRow
          label={t("Multi-Commentary Instant Audio Switcher (Bangla / Hindi / English)")}
          sub={t(
            "Enables 1-click toggling between Akashvani Kolkata (বাংলা), Sports Flashes (हिंदी), and official broadcast TV audio with auto-delay lipsync.",
          )}
          value={settings.multiCommentarySwitcher}
          onChange={(v) => update({ multiCommentarySwitcher: v })}
          leading={<Radio size={18} className="text-accent" />}
        />

        {settings.multiCommentarySwitcher && (
          <div className="p-4 rounded-xl bg-elevated/40 border border-edge-soft/60 flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-accent">
              {t("Default Commentary Language")}
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {COMMENTARY_CHOICES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`flex flex-col items-center justify-center rounded-xl p-3 border transition-all ${
                    settings.preferredCommentaryLanguage === c.id
                      ? "border-accent bg-accent/15 text-ink font-bold shadow-sm"
                      : "border-edge-soft bg-surface text-ink-muted hover:bg-elevated hover:text-ink"
                  }`}
                  onClick={() => update({ preferredCommentaryLanguage: c.id })}
                >
                  <span className="text-sm">{c.label}</span>
                  <span className="text-xs text-accent">{c.nativeLabel}</span>
                  <span className="text-[10px] text-ink-subtle mt-0.5">{c.badge}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
          label={t("Smart Cricket Highlight Reel Markers")}
          sub={t(
            "Synthesizes live ball-by-ball milestone telemetry (wickets, 6s, 4s, 50s, 100s) into chapter markers on the player seekbar for instant event jumping.",
          )}
          value={settings.cricketHighlightReel}
          onChange={(v) => update({ cricketHighlightReel: v })}
          leading={<Sparkles size={18} />}
        />

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

      {/* 4. Night-Owl Cinema & Subtitle Glare Dimmer */}
      <Section
        title={t("Night-Owl Cinema & Audio Tamer")}
        subtitle={t(
          "Late-night quiet watching: suppresses explosive commercial/gunshot spikes and dims subtitles.",
        )}
      >
        <ToggleRow
          label={t("Night-Owl Cinema Mode (Dynamic Explosion & Ad Ducking)")}
          sub={t(
            "Applies dynamic range compression (DRC) to clamp loud movie explosions and blasted TV commercials while boosting dialogue whispers (+5 dB @ 2.5 kHz).",
          )}
          value={settings.nightCinemaMode}
          onChange={(v) => update({ nightCinemaMode: v })}
          leading={<Moon size={18} className="text-indigo-400" />}
        />

        <ToggleRow
          label={t("Auto-Engage Night Mode During Late Hours (00:00 - 05:00 IST)")}
          sub={t(
            "Automatically activates ad-ducking and tints subtitles to a soft warm amber (#FFD7A0 at 75% opacity) during midnight hours to prevent eye strain in dark rooms.",
          )}
          value={settings.nightCinemaAutoWindow}
          onChange={(v) => update({ nightCinemaAutoWindow: v })}
          leading={<Moon size={18} />}
        />
      </Section>

      {/* 5. Infrastructure, Power Outage & Mirror Failover */}
      <Section
        title={t("Infrastructure & Outage Resilience")}
        subtitle={t(
          "Protects playback progress and download queues against sudden power blackouts and voltage fluctuations.",
        )}
      >
        <ToggleRow
          label={t("Power-Cut & Sudden Blackout Snapshot Vault")}
          sub={t(
            "Atomically journals stream URL, millisecond timestamp, audio track, and playlist queue every 5 seconds. Offers instant 1-click restore after unexpected power cuts.",
          )}
          value={settings.powerCutVaultEnabled}
          onChange={(v) => update({ powerCutVaultEnabled: v })}
          leading={<Save size={18} />}
        />

        <ToggleRow
          label={t("Multi-CDN Stream Stitcher & Mirror Failover")}
          sub={t(
            "Seamlessly switches to alternate Debrid / CDN edge mirrors without resetting player position if local ISP routing experiences packet loss or gateway timeouts.",
          )}
          value={settings.streamMirrorFailover}
          onChange={(v) => update({ streamMirrorFailover: v })}
          leading={<Network size={18} />}
        />

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

      {/* 6. Hardware, Earbuds & Device Handoff */}
      <Section
        title={t("Hardware, Earbuds & Device Handoff")}
        subtitle={t(
          "Bluetooth audio latency compensation, local QR streaming handoff, and battery optimization.",
        )}
      >
        <ToggleRow
          label={t("Bluetooth Earbuds Lipsync Auto-Profiler")}
          sub={t(
            "Applies calibrated negative audio delay offset (-160ms to -240ms) for boAt Airdopes, Noise Buds, Boult Audio, and Realme earphones to eliminate dialogue lag.",
          )}
          value={settings.bluetoothLatencyProfiler}
          onChange={(v) => update({ bluetoothLatencyProfiler: v })}
          leading={<Headphones size={18} />}
        />

        <ToggleRow
          label={t("Zero-Install QR Couch Handoff")}
          sub={t(
            "Displays a local LAN QR code inside the player: scan with your phone camera to take over stream playback at the exact second without installing any mobile app.",
          )}
          value={settings.qrCouchHandoffEnabled}
          onChange={(v) => update({ qrCouchHandoffEnabled: v })}
          leading={<QrCode size={18} />}
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

        <ToggleRow
          label={t("Embedded WebAssembly Retro Gaming Engine")}
          sub={t(
            "Enables 1-click playable emulation for GBA, SNES, PS1, and PSP classics directly inside Argus with zero external emulator configuration.",
          )}
          value={settings.retroEmulatorEnabled}
          onChange={(v) => update({ retroEmulatorEnabled: v })}
          leading={<Gamepad2 size={18} />}
        />
      </Section>

      {/* 7. Night-Owl 12 AM - 6 AM Free Unlimited Data Scheduler */}
      <Section
        title={t("Night-Owl Unlimited Data Scheduler")}
        subtitle={t(
          "Tailored for Indian telcos offering free, uncapped high-speed data between 12:00 AM and 6:00 AM (e.g. Vi Binge All Night, Airtel/Jio off-peak).",
        )}
      >
        <ToggleRow
          label={t("Schedule Downloads for Midnight Window")}
          sub={t(
            "Queues media downloads during the day and automatically executes them between 12:00 AM and 6:00 AM when mobile hotspot tethering is active.",
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

      {/* 9. Next-Gen Playback, AI Voice & P2P Swarm Suite */}
      <Section
        title={t("Next-Gen Playback, AI Voice & P2P Swarm Suite")}
        subtitle={t(
          "Neural voice clarification, local subnet P2P streaming cache, face/letterbox subtitle dodging, and automatic chaptering.",
        )}
      >
        <ToggleRow
          label={t("Neural Voice Clarifier (AI Dialogue Lift)")}
          sub={t(
            "Isolates center-channel speech frequencies (+6dB @ 2.5kHz–3.5kHz) and cuts optical audio hiss for classic Ray cinema, 90s Tollywood, and compact single-speaker projectors (Portronics Beem 470).",
          )}
          value={settings.neuralVoiceClarifier}
          onChange={(v) => update({ neuralVoiceClarifier: v })}
          leading={<Volume2 size={18} className="text-amber-400" />}
        />

        {settings.neuralVoiceClarifier && (
          <div className="p-4 rounded-xl bg-elevated/40 border border-edge-soft/60 flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              {t("Acoustic Clarifier Profile")}
            </span>
            <select
              className="h-10 rounded-lg border border-edge-soft bg-surface px-3 text-sm text-ink outline-none"
              value={settings.voiceClarifierProfileId}
              onChange={(e) => update({ voiceClarifierProfileId: e.target.value as VoiceClarifierProfileId })}
            >
              {Object.values(VOICE_CLARIFIER_PROFILES).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (+{p.presenceGainDb}dB)
                </option>
              ))}
            </select>
          </div>
        )}

        <ToggleRow
          label={t("Local LAN P2P Swarm Cache (Multi-Screen Bandwidth Saver)")}
          sub={t(
            "Shares buffered 4K video pieces across Smart TVs, laptops, and mobiles on the home Wi-Fi at 800+ Mbps LAN speeds, preventing redundant Debrid/WAN downloads.",
          )}
          value={settings.lanSwarmCache}
          onChange={(v) => update({ lanSwarmCache: v })}
          leading={<Share2 size={18} className="text-emerald-400" />}
        />

        <ToggleRow
          label={t("Face & Letterbox-Aware Subtitle Dodging")}
          sub={t(
            "Places subtitles in lower letterbox bars with warm amber (#FFD180) to eliminate projector light bleed; dynamically dodges actor faces on full-bleed 16:9 streams.",
          )}
          value={settings.letterboxSubtitleDodging}
          onChange={(v) => update({ letterboxSubtitleDodging: v })}
          leading={<Eye size={18} className="text-sky-400" />}
        />

        <ToggleRow
          label={t("Automatic Scene & Song Chapter Synthesizer")}
          sub={t(
            "Synthesizes instant seekbar jump markers for Indian cinema and catalog titles lacking MKV chapters: Prologue, Title Song, Intermission, Climax, and End Credits.",
          )}
          value={settings.syntheticChapters}
          onChange={(v) => update({ syntheticChapters: v })}
          leading={<Bookmark size={18} className="text-indigo-400" />}
        />

        <ToggleRow
          label={t("Hybrid Debrid + Official Free Legal Streaming Fallback")}
          sub={t(
            "Checks verified studio YouTube channels (SVF Cinema, Angel Digital, Zee Bangla) when torrent seeders are dead or poor quality, routing pristine 1080p feeds seamlessly.",
          )}
          value={settings.hybridLegalFallback}
          onChange={(v) => update({ hybridLegalFallback: v })}
          leading={<Film size={18} className="text-rose-400" />}
        />

        <ToggleRow
          label={t("Edge Zero-Shot Indic Dubbing Overlay")}
          sub={t(
            "Generates real-time neural speech dubbing for world cinema and foreign festival films with automated 15% soundtrack ducking.",
          )}
          value={settings.indicDubbingOverlay}
          onChange={(v) => update({ indicDubbingOverlay: v })}
          leading={<Languages size={18} className="text-violet-400" />}
        />

        {settings.indicDubbingOverlay && (
          <div className="p-4 rounded-xl bg-elevated/40 border border-edge-soft/60 flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
              {t("Dubbing Target Language")}
            </span>
            <Segmented
              value={settings.indicDubbingLanguage}
              options={[
                { value: "bengali", label: "বাংলা (Bengali)" },
                { value: "hindi", label: "हिंदी (Hindi)" },
                { value: "english", label: "English" },
              ]}
              onChange={(val) => update({ indicDubbingLanguage: val as "bengali" | "hindi" | "english" })}
            />
          </div>
        )}
      </Section>
    </div>
  );
}
