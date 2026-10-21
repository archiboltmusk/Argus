import { useEffect, useState } from "react";
import { api, type CalendarEntry, type MetaPreview } from "../api";

function dayLabel(date: string, today: string) {
  if (date === today) return "Today";
  const d = new Date(`${date}T00:00:00Z`);
  const diff = Math.round((d.getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86_400_000);
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
}

/** Episodes from the past week and next month for series in the library. */
export function Calendar({ profile, onOpen }: { profile: number; onOpen: (m: MetaPreview) => void }) {
  const [entries, setEntries] = useState<CalendarEntry[] | null>(null);
  useEffect(() => { api.calendar(profile).then(setEntries).catch(() => setEntries([])); }, [profile]);

  if (entries === null) return <div className="muted">Checking your shows…</div>;
  if (entries.length === 0) {
    return (
      <div className="empty">
        <h2>Nothing airing</h2>
        <p className="muted">Add series to your library to see their new episodes here.</p>
      </div>
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  const days = new Map<string, CalendarEntry[]>();
  entries.forEach((e) => days.set(e.date, [...(days.get(e.date) ?? []), e]));
  return (
    <>
      <h2>Calendar</h2>
      {[...days.entries()].map(([date, eps]) => (
        <section key={date} className={date < today ? "past" : undefined}>
          <h3>{dayLabel(date, today)}</h3>
          {eps.map((e) => (
            <button key={e.videoId} className="cal" onClick={() => onOpen({ id: e.showId, type: "series", name: e.showName, poster: e.poster })}>
              {e.poster && <img src={e.poster} alt="" loading="lazy" />}
              <span>
                <strong>{e.showName}</strong>
                <span className="muted"> · {e.season != null && e.episode != null ? `S${e.season}E${e.episode} · ` : ""}{e.title}</span>
              </span>
            </button>
          ))}
        </section>
      ))}
    </>
  );
}
