import { useEffect, useState } from "react";
import { Bell, Calendar, ExternalLink, MapPin, Radio, Sparkles, X, CheckCircle2 } from "lucide-react";
import {
  techEventRadar,
  TechCommunityEvent,
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
  const [events, setEvents] = useState<TechCommunityEvent[]>([]);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEvents(techEventRadar.getUpcomingEvents());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestNotification = async (event: TechCommunityEvent) => {
    await techEventRadar.dispatchOsNotification(event);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex h-full max-h-[82vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl bg-[#111215] border border-white/10 shadow-[0_28px_80px_rgba(0,0,0,0.95)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#14151a]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20">
              <Radio size={20} className="animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-white tracking-tight">
                  {t("Tech Community & DevFest Radar")}
                </h2>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10.5px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Kolkata Active
                </span>
              </div>
              <p className="text-[12px] text-zinc-400">
                {t("Local zero-telemetry radar for GDG Kolkata, DevFest, and developer gatherings.")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label={t("Close")}
          >
            <X size={16} />
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-white/10 text-accent border border-white/10">
                      {ev.community}
                    </span>
                    {ev.status === "tickets-live" ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <Sparkles size={10} />
                        {t("Tickets Live")}
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
                    <span>{t("RSVP")}</span>
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
                  <span className="truncate max-w-[360px] text-zinc-400">{ev.venue}</span>
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
            gdg.community.dev · Zero Telemetry
          </span>
        </div>
      </div>
    </div>
  );
}
