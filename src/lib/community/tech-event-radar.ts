/**
 * Argus Unified Tech & Cultural Community Radar
 *
 * Combines two distinct tiers of live local discovery:
 * 1. Developer Community & Tech Hackathons (GDG Kolkata, CNCF, Devfolio, Unstop, FOSS United)
 * 2. Cultural, Cinema & Performing Arts (BookMyShow, KIFF, Dover Lane Music Conference)
 *
 * Core Features:
 * - Local-First Deduplication: Events merged across GDG, Apify/Hackathon Finder, and BookMyShow feeds.
 * - Noise Filter: Allows toggling between developer events and cultural arts so you only get alerts you want.
 * - Native OS Desktop Notification: Direct clickable alerts when registration/tickets go live.
 */

import { invoke } from "@tauri-apps/api/core";

export type EventSourceTier = "developer_community" | "hackathon_aggregator" | "cultural_ticketing";

export type CanonArchetype =
  | "career_inflection"       // Major conferences, flagship keynotes, career turnarounds (e.g. DevFest)
  | "creative_awakening"      // Rare retrospective screenings, auteur masterpieces, film festivals (e.g. KIFF)
  | "tribal_communion"        // Underground hacker groups, indie sprints, FOSS meetups
  | "serendipitous_wildcard"; // Cross-domain wildcard to loosen the filter and invite turning points

export type EventDomain =
  | "tech_devfest"
  | "tech_hackathon"
  | "tech_cloud_summit"
  | "tech_meetup"
  | "cultural_cinema"
  | "cultural_music"
  | "cultural_theatre";

export interface TechCommunityEvent {
  id: string;
  title: string;
  community: string; // e.g. "GDG Kolkata", "Devfolio", "BookMyShow Kolkata", "KIFF"
  sourceTier: EventSourceTier;
  domain: EventDomain;
  canonArchetype?: CanonArchetype;
  canonPotentialScore?: number; // 0 to 100 rating of transformative potential
  serendipityScore?: number; // 0.0 to 1.0 (loosened filter factor)
  dateDisplay: string; // e.g. "November 2026"
  startDateIso: string;
  venue: string; // e.g. "Biswa Bangla Convention Centre, Kolkata"
  city: string; // "Kolkata"
  rsvpUrl: string;
  status: "announced" | "tickets-live" | "early-bird" | "waitlist" | "completed";
  description: string;
  bannerUrl?: string;
  notified?: boolean;
  priceDisplay?: string; // e.g. "Free", "₹499 Early Bird"
}

export interface RadarNotificationPreferences {
  notifyDevFests: boolean;
  notifyHackathons: boolean;
  notifyCloudSummits: boolean;
  notifyTechMeetups: boolean;
  notifyCinemaFestivals: boolean;
  notifyCulturalPerformances: boolean;
}

export const DEFAULT_RADAR_PREFERENCES: RadarNotificationPreferences = {
  notifyDevFests: true,
  notifyHackathons: true,
  notifyCloudSummits: true,
  notifyTechMeetups: true,
  notifyCinemaFestivals: true,
  notifyCulturalPerformances: false, // Default off to reduce BookMyShow noise
};

export const CURATED_KOLKATA_RADAR: TechCommunityEvent[] = [
  // --- Developer & Tech Tier ---
  {
    id: "gdg-kolkata-devfest-2026",
    title: "DevFest Kolkata 2026 — AI, Web & Cloud Odyssey",
    community: "GDG Kolkata",
    sourceTier: "developer_community",
    domain: "tech_devfest",
    dateDisplay: "November 2026",
    startDateIso: "2026-11-28T09:00:00+05:30",
    venue: "Biswa Bangla Convention Centre, New Town, Kolkata",
    city: "Kolkata",
    rsvpUrl: "https://gdg.community.dev/gdg-kolkata/",
    status: "tickets-live",
    priceDisplay: "Free (RSVP Required)",
    description: "The flagship annual developer conference of Eastern India by GDG Kolkata. Keynotes on Gemini, Android, Flutter, and Google Cloud, hands-on tracks, and sponsor pavilions.",
    bannerUrl: "https://gdg.community.dev/images/devfest-banner.jpg",
  },
  {
    id: "gdg-cloud-kolkata-ccd-2026",
    title: "Cloud Community Day Kolkata",
    community: "Google Cloud Kolkata",
    sourceTier: "developer_community",
    domain: "tech_cloud_summit",
    dateDisplay: "December 2026",
    startDateIso: "2026-12-12T09:30:00+05:30",
    venue: "Science City Main Auditorium, Kolkata",
    city: "Kolkata",
    rsvpUrl: "https://gdg.community.dev/gdg-cloud-kolkata/",
    status: "announced",
    priceDisplay: "Free",
    description: "Eastern India's largest community-driven Cloud Conference focusing on Kubernetes, Generative AI on GCP, and distributed cloud architecture.",
  },
  {
    id: "cncf-kolkata-k8s-meetup",
    title: "CNCF Kolkata Kubernetes & Cloud Native Mixer",
    community: "CNCF Kolkata",
    sourceTier: "developer_community",
    domain: "tech_meetup",
    dateDisplay: "December 2026",
    startDateIso: "2026-12-19T11:00:00+05:30",
    venue: "Salt Lake Sector V, Kolkata",
    city: "Kolkata",
    rsvpUrl: "https://community.cncf.io/kolkata/",
    status: "tickets-live",
    priceDisplay: "Free",
    description: "Deep dive into eBPF, WebAssembly in cloud runtimes, and distributed service mesh architecture.",
  },
  {
    id: "devfolio-kolkata-hack-2026",
    title: "HackKolkata 2026 (Devfolio & Unstop)",
    community: "Devfolio / Unstop",
    sourceTier: "hackathon_aggregator",
    domain: "tech_hackathon",
    dateDisplay: "January 2027",
    startDateIso: "2027-01-23T10:00:00+05:30",
    venue: "Techno India University Campus, Kolkata",
    city: "Kolkata",
    rsvpUrl: "https://devfolio.co/hackathons",
    status: "early-bird",
    priceDisplay: "Free (Hackathon with ₹3L Pool)",
    description: "36-hour physical hackathon bringing together 800+ developers across Eastern India to build AI agents, open source tools, and web3 infrastructure.",
  },
  {
    id: "foss-united-kolkata-meetup",
    title: "FOSS United Kolkata Open Source Showcase",
    community: "FOSS United Kolkata",
    sourceTier: "developer_community",
    domain: "tech_meetup",
    dateDisplay: "Monthly Saturday",
    startDateIso: "2026-12-05T14:00:00+05:30",
    venue: "Salt Lake Sector V, Kolkata",
    city: "Kolkata",
    rsvpUrl: "https://fossunited.org/kolkata",
    status: "tickets-live",
    priceDisplay: "Free",
    description: "Open source showcase, lightning talks on Linux, Rust, Python, and indie developer grants.",
  },

  // --- Cultural, Cinema & Performing Arts Tier (BookMyShow / KIFF) ---
  {
    id: "kiff-kolkata-film-festival-2026",
    title: "32nd Kolkata International Film Festival (KIFF)",
    community: "KIFF & Nandan",
    sourceTier: "cultural_ticketing",
    domain: "cultural_cinema",
    dateDisplay: "December 2026",
    startDateIso: "2026-12-04T10:00:00+05:30",
    venue: "Nandan, Rabindra Sadan & Sisir Mancha, Kolkata",
    city: "Kolkata",
    rsvpUrl: "https://kiff.in",
    status: "announced",
    priceDisplay: "Delegate Passes",
    description: "Premier international cinema showcase screening 180+ restored world cinema classics, auteur retrospectives, and contemporary world premieres.",
  },
  {
    id: "bms-kolkata-tradition-music-2026",
    title: "The Kolkata Tradition Classical Music Festival",
    community: "BookMyShow Kolkata",
    sourceTier: "cultural_ticketing",
    domain: "cultural_music",
    dateDisplay: "January 2027",
    startDateIso: "2027-01-09T18:00:00+05:30",
    venue: "Nazrul Mancha, Southern Avenue, Kolkata",
    city: "Kolkata",
    rsvpUrl: "https://in.bookmyshow.com/kolkata/events",
    status: "tickets-live",
    priceDisplay: "From ₹499",
    description: "Legendary all-night Indian classical music conference featuring sarod, sitar, and vocal maestros.",
  },
];

export interface CanonFeedbackEntry {
  eventId: string;
  type: "attended_canon" | "attended_routine" | "regretted_missing";
  recordedAtEpochMs: number;
  personalNote?: string;
}

const STORAGE_EVENTS_KEY = "argus.community_radar.events";
const STORAGE_NOTIFIED_KEY = "argus.community_radar.notified_ids";
const STORAGE_PREFS_KEY = "argus.community_radar.preferences";
const STORAGE_FEEDBACK_KEY = "argus.community_radar.feedback";

export class TechEventRadarEngine {
  private events: Map<string, TechCommunityEvent> = new Map();
  private notifiedIds: Set<string> = new Set();
  private preferences: RadarNotificationPreferences = { ...DEFAULT_RADAR_PREFERENCES };
  private feedbackEntries: Map<string, CanonFeedbackEntry> = new Map();

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    // Always initialize with curated radar events
    for (const ev of CURATED_KOLKATA_RADAR) {
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

        const storedPrefs = localStorage.getItem(STORAGE_PREFS_KEY);
        if (storedPrefs) {
          this.preferences = { ...DEFAULT_RADAR_PREFERENCES, ...JSON.parse(storedPrefs) };
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

        const storedFeedback = localStorage.getItem(STORAGE_FEEDBACK_KEY);
        if (storedFeedback) {
          const parsedFeedback = JSON.parse(storedFeedback) as CanonFeedbackEntry[];
          for (const f of parsedFeedback) {
            this.feedbackEntries.set(f.eventId, f);
          }
        }
      }
    } catch {}

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
        localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(this.preferences));
        localStorage.setItem(STORAGE_FEEDBACK_KEY, JSON.stringify(Array.from(this.feedbackEntries.values())));
      }
    } catch {}
  }

  public getPreferences(): RadarNotificationPreferences {
    return { ...this.preferences };
  }

  public updatePreferences(prefs: Partial<RadarNotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
    this.saveState();
  }

  /**
   * Evaluates whether an event should trigger an OS toast notification based on user preferences.
   */
  public isNotificationAllowed(event: TechCommunityEvent): boolean {
    switch (event.domain) {
      case "tech_devfest":
        return this.preferences.notifyDevFests;
      case "tech_hackathon":
        return this.preferences.notifyHackathons;
      case "tech_cloud_summit":
        return this.preferences.notifyCloudSummits;
      case "tech_meetup":
        return this.preferences.notifyTechMeetups;
      case "cultural_cinema":
        return this.preferences.notifyCinemaFestivals;
      case "cultural_music":
      case "cultural_theatre":
        return this.preferences.notifyCulturalPerformances;
      default:
        return true;
    }
  }

  /**
   * Scans local events and triggers OS notifications for eligible events.
   */
  public async scanAndNotifyNewEvents(): Promise<{ notifiedCount: number; newEvents: TechCommunityEvent[] }> {
    const unnotified = Array.from(this.events.values()).filter(
      (ev) =>
        !this.notifiedIds.has(ev.id) &&
        (ev.status === "tickets-live" || ev.status === "early-bird") &&
        this.isNotificationAllowed(ev)
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
    const icon = event.sourceTier === "cultural_ticketing" ? "🎭" : "🎟️";
    const title = `${icon} ${event.community}: ${event.title}`;
    const priceText = event.priceDisplay ? ` [${event.priceDisplay}]` : "";
    const body = `Date: ${event.dateDisplay} · Venue: ${event.venue}${priceText}\nClick to view registration & ticket details.`;

    try {
      await invoke("send_clickable_notification", {
        title,
        body,
        deepLink: event.rsvpUrl,
        imageBytes: null,
      });
      return true;
    } catch {
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

  /**
   * Ingests external scraping results (from Apify BookMyShow, Hackathon Finder, or GDG JSON)
   * into the local radar ledger with deduplication.
   */
  public ingestExternalFeed(
    rawEvents: Array<Partial<TechCommunityEvent> & { title: string; rsvpUrl: string }>,
    sourceTier: EventSourceTier
  ): number {
    let newCount = 0;
    for (const raw of rawEvents) {
      const id = raw.id || `ext_${sourceTier}_${Math.abs(hashString(raw.title + raw.rsvpUrl))}`;
      if (!this.events.has(id)) {
        const domain: EventDomain =
          raw.domain ||
          (sourceTier === "hackathon_aggregator"
            ? "tech_hackathon"
            : sourceTier === "cultural_ticketing"
            ? "cultural_cinema"
            : "tech_meetup");

        const event: TechCommunityEvent = {
          id,
          title: raw.title,
          community: raw.community || (sourceTier === "cultural_ticketing" ? "BookMyShow" : "Community"),
          sourceTier,
          domain,
          dateDisplay: raw.dateDisplay || "Upcoming",
          startDateIso: raw.startDateIso || new Date().toISOString(),
          venue: raw.venue || "Kolkata, India",
          city: "Kolkata",
          rsvpUrl: raw.rsvpUrl,
          status: raw.status || "tickets-live",
          description: raw.description || raw.title,
          priceDisplay: raw.priceDisplay,
          notified: false,
        };
        this.events.set(id, event);
        newCount++;
      }
    }

    if (newCount > 0) {
      this.saveState();
    }
    return newCount;
  }

  public getUpcomingEvents(filterTier?: EventSourceTier): TechCommunityEvent[] {
    let list = Array.from(this.events.values());
    if (filterTier) {
      list = list.filter((e) => e.sourceTier === filterTier);
    }
    return list.sort((a, b) => new Date(a.startDateIso).getTime() - new Date(b.startDateIso).getTime());
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

  public logEventFeedback(entry: Omit<CanonFeedbackEntry, "recordedAtEpochMs">): void {
    const record: CanonFeedbackEntry = {
      ...entry,
      recordedAtEpochMs: Date.now(),
    };
    this.feedbackEntries.set(entry.eventId, record);
    this.saveState();
  }

  public getEventFeedback(eventId: string): CanonFeedbackEntry | undefined {
    return this.feedbackEntries.get(eventId);
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export const techEventRadar = new TechEventRadarEngine();
