/**
 * Argus Local Tech Community & DevFest Radar
 *
 * Dedicated local radar for developer conferences, tech meetups, and developer gatherings
 * (e.g. Google Developer Group Kolkata / DevFest Kolkata, FOSS United, Luma tech mixers).
 *
 * Principles:
 * 1. Zero Cloud Profiling: Runs on-device; tracks event state in local storage.
 * 2. Native OS Notifications: Uses desktop_notify (notify-rust on macOS/Windows/Linux)
 *    to pop native notifications with deep links as soon as registrations or tickets drop.
 * 3. Never Miss an Event: Tracks "ticket-drop", "early-bird", and "call-for-speakers".
 */

import { invoke } from "@tauri-apps/api/core";

export interface TechCommunityEvent {
  id: string;
  title: string;
  community: string; // e.g. "GDG Kolkata", "Google Cloud Kolkata", "FOSS United Kolkata"
  category: "devfest" | "meetup" | "hackathon" | "io-extended" | "cloud-summit";
  dateDisplay: string; // e.g. "November 2026"
  startDateIso: string;
  venue: string; // e.g. "Biswa Bangla Convention Centre, Kolkata"
  city: string; // "Kolkata"
  rsvpUrl: string;
  status: "announced" | "tickets-live" | "early-bird" | "waitlist" | "completed";
  description: string;
  bannerUrl?: string;
  notified?: boolean;
}

export const CURATED_KOLKATA_TECH_RADAR: TechCommunityEvent[] = [
  {
    id: "gdg-kolkata-devfest-2026",
    title: "DevFest Kolkata 2026 — AI, Web & Cloud Odyssey",
    community: "GDG Kolkata",
    category: "devfest",
    dateDisplay: "November 2026",
    startDateIso: "2026-11-28T09:00:00+05:30",
    venue: "Biswa Bangla Convention Centre, New Town, Kolkata",
    city: "Kolkata",
    rsvpUrl: "https://gdg.community.dev/gdg-kolkata/",
    status: "tickets-live",
    description: "The flagship annual developer conference of Eastern India by GDG Kolkata. Keynotes on Gemini, Android, Flutter, and Google Cloud, hands-on tracks, and sponsor pavilions.",
    bannerUrl: "https://gdg.community.dev/images/devfest-banner.jpg",
  },
  {
    id: "gdg-cloud-kolkata-ccd-2026",
    title: "Cloud Community Day Kolkata",
    community: "Google Cloud Kolkata",
    category: "cloud-summit",
    dateDisplay: "December 2026",
    startDateIso: "2026-12-12T09:30:00+05:30",
    venue: "Science City Main Auditorium, Kolkata",
    city: "Kolkata",
    rsvpUrl: "https://gdg.community.dev/gdg-cloud-kolkata/",
    status: "announced",
    description: "Eastern India's largest community-driven Cloud Conference focusing on Kubernetes, Generative AI on GCP, and distributed cloud architecture.",
  },
  {
    id: "foss-united-kolkata-meetup",
    title: "FOSS United Kolkata Tech Gathering",
    community: "FOSS United Kolkata",
    category: "meetup",
    dateDisplay: "Monthly Saturday",
    startDateIso: "2026-12-05T14:00:00+05:30",
    venue: "Sector V, Salt Lake, Kolkata",
    city: "Kolkata",
    rsvpUrl: "https://fossunited.org/kolkata",
    status: "tickets-live",
    description: "Open source showcase, lightning talks on Linux, Rust, Python, and indie developer grants.",
  },
  {
    id: "wtm-kolkata-summit-2027",
    title: "Women Techmakers Kolkata Annual Summit",
    community: "WTM Kolkata",
    category: "meetup",
    dateDisplay: "March 2027",
    startDateIso: "2027-03-08T10:00:00+05:30",
    venue: "JW Marriott Hotel, Kolkata",
    city: "Kolkata",
    rsvpUrl: "https://gdg.community.dev/wtm-kolkata/",
    status: "announced",
    description: "Annual Women Techmakers gathering spotlighting women leaders in technology, AI ethics, and engineering careers.",
  },
];

const STORAGE_EVENTS_KEY = "argus.community_radar.events";
const STORAGE_NOTIFIED_KEY = "argus.community_radar.notified_ids";

export class TechEventRadarEngine {
  private events: Map<string, TechCommunityEvent> = new Map();
  private notifiedIds: Set<string> = new Set();

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    // Always initialize with default curated radar events first
    for (const ev of CURATED_KOLKATA_TECH_RADAR) {
      this.events.set(ev.id, {
        ...ev,
        notified: false,
      });
    }

    try {
      if (typeof localStorage !== "undefined" && localStorage != null) {
        const storedNotified = localStorage.getItem(STORAGE_NOTIFIED_KEY);
        if (storedNotified) {
          this.notifiedIds = new Set(JSON.parse(storedNotified));
        }

        const storedEvents = localStorage.getItem(STORAGE_EVENTS_KEY);
        if (storedEvents) {
          const parsed = JSON.parse(storedEvents) as TechCommunityEvent[];
          for (const ev of parsed) {
            this.events.set(ev.id, {
              ...ev,
              notified: this.notifiedIds.has(ev.id),
            });
          }
        }
      }
    } catch {}

    // Synchronize notified status for memory map
    for (const ev of this.events.values()) {
      if (this.notifiedIds.has(ev.id)) {
        ev.notified = true;
      }
    }
  }

  private saveState(): void {
    try {
      if (typeof localStorage !== "undefined" && localStorage != null) {
        const list = Array.from(this.events.values());
        localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(list));
        localStorage.setItem(STORAGE_NOTIFIED_KEY, JSON.stringify(Array.from(this.notifiedIds)));
      }
    } catch {}
  }

  /**
   * Scans local events and triggers OS notifications for unnotified events
   * with live registration/ticket drops.
   */
  public async scanAndNotifyNewEvents(): Promise<{ notifiedCount: number; newEvents: TechCommunityEvent[] }> {
    const unnotified = Array.from(this.events.values()).filter(
      (ev) => !this.notifiedIds.has(ev.id) && (ev.status === "tickets-live" || ev.status === "early-bird")
    );

    let count = 0;
    for (const ev of unnotified) {
      const sent = await this.dispatchOsNotification(ev);
      if (sent) {
        this.notifiedIds.add(ev.id);
        ev.notified = true;
        count++;
      }
    }

    if (count > 0) {
      this.saveState();
    }

    return { notifiedCount: count, newEvents: unnotified };
  }

  /**
   * Dispatches a native desktop toast notification via Argus desktop_notify.
   */
  public async dispatchOsNotification(event: TechCommunityEvent): Promise<boolean> {
    const title = `🎟️ ${event.community}: ${event.title}`;
    const body = `Date: ${event.dateDisplay} · Venue: ${event.venue}\nClick to view and secure your registration.`;

    try {
      await invoke("send_clickable_notification", {
        title,
        body,
        deepLink: event.rsvpUrl,
        imageBytes: null,
      });
      return true;
    } catch {
      // Browser fallback if running outside Tauri
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(title, { body });
          return true;
        } else if (Notification.permission !== "denied") {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            new Notification(title, { body });
            return true;
          }
        }
      }
      return false;
    }
  }

  public getUpcomingEvents(): TechCommunityEvent[] {
    return Array.from(this.events.values()).sort(
      (a, b) => new Date(a.startDateIso).getTime() - new Date(b.startDateIso).getTime()
    );
  }

  public registerCustomEvent(event: Omit<TechCommunityEvent, "id" | "notified">): TechCommunityEvent {
    const id = `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newEvent: TechCommunityEvent = {
      ...event,
      id,
      notified: false,
    };
    this.events.set(id, newEvent);
    this.saveState();
    return newEvent;
  }

  public markNotified(eventId: string): void {
    this.notifiedIds.add(eventId);
    const ev = this.events.get(eventId);
    if (ev) ev.notified = true;
    this.saveState();
  }
}

export const techEventRadar = new TechEventRadarEngine();
