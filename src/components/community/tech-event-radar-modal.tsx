import { useEffect, useState } from "react";
import {
  Bell,
  Calendar,
  ExternalLink,
  MapPin,
  Radio,
  Sparkles,
  X,
  CheckCircle2,
  SlidersHorizontal,
  Code2,
  Film,
  Trophy,
} from "lucide-react";
import {
  techEventRadar,
  TechCommunityEvent,
  EventSourceTier,
  RadarNotificationPreferences,
} from "@/lib/community/tech-event-radar";
import { useT } from "@/lib/i18n";

export function TechEventRadarModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<"all" | EventSourceTier>("all");
  const [events, setEvents] = useState<TechCommunityEvent[]>([]);
  const [testSent, setTestSent] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [prefs, setPrefs] = useState<RadarNotificationPreferences>(techEventRadar.getPreferences());

  useEffect(() => {
    if (isOpen) {
      const tierFilter = activeTab === "all" ? undefined : activeTab;
      setEvents(techEventRadar.getUpcomingEvents(tierFilter));
      setPrefs(techEventRadar.getPreferences());
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleTestNotification = async (event: TechCommunityEvent) => {
    await techEventRadar.dispatchOsNotification(event);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const togglePref = (key: keyof RadarNotificationPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    techEventRadar.updatePreferences(updated);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex h-full max-h-[86vh] w-full max-w-[820px] flex-col overflow-hidden rounded-2xl bg-[#111215] border border-white/10 shadow-[0_28px_80px_rgba(0,0,0,0.95)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#14151a]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20">
              <Radio size={20} className="animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-white tracking-tight">
                  {t("Kolkata Tech & Cultural Event Radar")}
                </h2>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10.5px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync
                </span>
              </div>
              <p className="text-[12px] text-zinc-400">
                {t("Tracking GDG Kolkata, DevFest, Devfolio Hackathons & BookMyShow Cultural Festivals.")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreferences((v) => !v)}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-semibold border transition-all ${
                showPreferences
                  ? "bg-accent text-canvas border-accent"
                  : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>{t("Alert Filters")}</span>
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label={t("Close")}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Preferences Drawer */}
        {showPreferences && (
          <div className="border-b border-white/10 bg-[#0d0e11] px-6 py-3.5 animate-in slide-in-from-top-2 duration-150">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
              {t("Notification Preferences (Reduce Noise)")}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-[12px]">
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.notifyDevFests}
                  onChange={() => togglePref("notifyDevFests")}
                  className="rounded border-white/20 bg-white/10 text-accent focus:ring-0"
                />
                <span>DevFest & GDG Conferences</span>
              </label>
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.notifyHackathons}
                  onChange={() => togglePref("notifyHackathons")}
                  className="rounded border-white/20 bg-white/10 text-accent focus:ring-0"
                />
                <span>Devfolio / Unstop Hackathons</span>
              </label>
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.notifyCloudSummits}
                  onChange={() => togglePref("notifyCloudSummits")}
                  className="rounded border-white/20 bg-white/10 text-accent focus:ring-0"
                />
                <span>Cloud Summits & K8s</span>
              </label>
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.notifyCinemaFestivals}
                  onChange={() => togglePref("notifyCinemaFestivals")}
                  className="rounded border-white/20 bg-white/10 text-accent focus:ring-0"
                />
                <span>Kolkata Film Festival (KIFF)</span>
              </label>
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.notifyCulturalPerformances}
                  onChange={() => togglePref("notifyCulturalPerformances")}
                  className="rounded border-white/20 bg-white/10 text-accent focus:ring-0"
                />
                <span>BookMyShow Music/Concerts</span>
              </label>
            </div>
          </div>
        )}

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 px-6 py-2.5 bg-[#121317]">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-all border ${
              activeTab === "all"
                ? "bg-white text-black border-white shadow-sm font-bold"
                : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span>{t("All Radar ({n})", { n: events.length })}</span>
          </button>
          <button
            onClick={() => setActiveTab("developer_community")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-all border ${
              activeTab === "developer_community"
                ? "bg-white text-black border-white shadow-sm font-bold"
                : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Code2 size={13} />
            <span>GDG & Developer Meetups</span>
          </button>
          <button
            onClick={() => setActiveTab("hackathon_aggregator")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-all border ${
              activeTab === "hackathon_aggregator"
                ? "bg-white text-black border-white shadow-sm font-bold"
                : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Trophy size={13} />
            <span>Hackathons (Devfolio/Unstop)</span>
          </button>
          <button
            onClick={() => setActiveTab("cultural_ticketing")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-semibold transition-all border ${
              activeTab === "cultural_ticketing"
                ? "bg-white text-black border-white shadow-sm font-bold"
                : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Film size={13} />
            <span>BookMyShow & Cultural</span>
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="group relative flex flex-col gap-3 rounded-xl border border-white/10 bg-[#16171d] p-5 transition-all hover:border-accent/40 hover:bg-[#1a1b22]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-white/10 text-accent border border-white/10">
                      {ev.community}
                    </span>
                    {ev.priceDisplay && (
                      <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10">
                        {ev.priceDisplay}
                      </span>
                    )}
                    {ev.status === "tickets-live" ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <Sparkles size={10} />
                        {t("Tickets Live")}
                      </span>
                    ) : ev.status === "early-bird" ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {t("Early Bird Active")}
                      </span>
                    ) : (
                      <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-zinc-400">
                        {ev.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h3 className="text-[16px] font-bold text-white group-hover:text-accent transition-colors leading-snug">
                    {ev.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleTestNotification(ev)}
                    title={t("Test native desktop notification for this event")}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[11.5px] font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {testSent ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Bell size={13} />}
                    <span>{testSent ? t("Sent!") : t("Notify Me")}</span>
                  </button>
                  <a
                    href={ev.rsvpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-[12px] font-bold text-canvas shadow-sm hover:opacity-90 transition-opacity"
                  >
                    <span>{ev.sourceTier === "cultural_ticketing" ? t("Book Tickets") : t("RSVP")}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <p className="text-[13px] text-zinc-400 leading-relaxed">
                {ev.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-[12px] text-zinc-400 border-t border-white/5 mt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-zinc-500" />
                  <strong className="text-zinc-300 font-medium">{ev.dateDisplay}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-zinc-500" />
                  <span className="truncate max-w-[400px] text-zinc-400">{ev.venue}</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-3.5 bg-[#0e0f13] text-[12px] text-zinc-400">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            {t("Directly connected to Argus native OS toast notifications")}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            GDG · Devfolio · Unstop · BookMyShow · Zero Telemetry
          </span>
        </div>
      </div>
    </div>
  );
}
