import type {
  DailyPriorityMission,
  DailyReflection,
  EnergySlot,
  LifeDimension,
  SocraticPrompt,
} from "./types";

const STORAGE_KEY_MISSIONS = "argus_life_os_missions";
const STORAGE_KEY_REFLECTIONS = "argus_life_os_reflections";

export const DEFAULT_DIMENSIONS: LifeDimension[] = [
  {
    id: "mind",
    name: "Mind",
    tagline: "Focus & Deep Learning",
    score: 84,
    metricLabel: "Deep Work Ratio",
    metricValue: "3h 45m",
    status: "optimal",
  },
  {
    id: "body",
    name: "Body",
    tagline: "Health & Vital Recovery",
    score: 72,
    metricLabel: "Sleep Rest & Movement",
    metricValue: "7.8h / 8.5k steps",
    status: "balanced",
  },
  {
    id: "character",
    name: "Character",
    tagline: "Values, Duty & Self-Discipline",
    score: 89,
    metricLabel: "Commitments Kept",
    metricValue: "92%",
    status: "optimal",
  },
  {
    id: "relationships",
    name: "Relationships",
    tagline: "Real Human Connection",
    score: 68,
    metricLabel: "Uninterrupted Time",
    metricValue: "1h 15m",
    status: "needs_attention",
  },
  {
    id: "wealth",
    name: "Wealth",
    tagline: "Financial Resilience & Stewardship",
    score: 80,
    metricLabel: "Intentional Ratio",
    metricValue: "88%",
    status: "balanced",
  },
  {
    id: "purpose",
    name: "Purpose",
    tagline: "Meaningful Service & Legacy",
    score: 76,
    metricLabel: "Long-term Alignment",
    metricValue: "On Track",
    status: "balanced",
  },
];

export const TODAY_ENERGY_RHYTHM: EnergySlot[] = [
  {
    timeWindow: "08:00 - 11:30",
    phase: "peak_focus",
    label: "Peak Cognitive Window (Protect for Deep Work)",
    energyLevel: 92,
  },
  {
    timeWindow: "11:30 - 14:00",
    phase: "social_execution",
    label: "Execution & Collaborative Syncs",
    energyLevel: 75,
  },
  {
    timeWindow: "14:00 - 16:30",
    phase: "dip_recovery",
    label: "Circadian Dip (Walk, Read, or Rest)",
    energyLevel: 55,
  },
  {
    timeWindow: "16:30 - 19:30",
    phase: "peak_focus",
    label: "Secondary Analytical Focus Window",
    energyLevel: 82,
  },
  {
    timeWindow: "19:30 - 22:30",
    phase: "reflective_winddown",
    label: "Family, Connection & Socratic Reflection",
    energyLevel: 65,
  },
];

export const SOCRATIC_INQUIRIES: SocraticPrompt[] = [
  {
    id: "clarity-1",
    question: "If you could only accomplish one thing before nightfall, which action renders all other worries trivial?",
    context: "Eliminates low-value busyness masquerading as productivity.",
    category: "clarity",
  },
  {
    id: "impulse-1",
    question: "Are you reacting to immediate stimulation, or responding to long-term duty?",
    context: "Creates conscious pause before entering digital distraction loops.",
    category: "impulse_check",
  },
  {
    id: "connection-1",
    question: "Whom in your inner circle has not felt your full, undivided presence this week?",
    context: "Deepens foundational human bonds without screen intermediaries.",
    category: "courage",
  },
];

export const INITIAL_DAILY_MISSIONS: DailyPriorityMission[] = [
  {
    id: "mission-1",
    dimension: "mind",
    title: "Protect a 90-minute Deep Focus Block",
    subtext: "Conquer the single hardest cognitive task of the day with zero notification interruptions.",
    completed: false,
    estimatedMinutes: 90,
  },
  {
    id: "mission-2",
    dimension: "body",
    title: "Movement or Meaningful Nature Walk",
    subtext: "Circulate fresh oxygen, reset dopamine receptors, and avoid sedentary stagnation.",
    completed: false,
    estimatedMinutes: 45,
  },
  {
    id: "mission-3",
    dimension: "relationships",
    title: "One Uninterrupted Face-to-Face Conversation",
    subtext: "Be genuinely present with family, friend, or teammate with all screens faced down.",
    completed: false,
    estimatedMinutes: 30,
  },
];

export function getStoredMissions(): DailyPriorityMission[] {
  if (typeof window === "undefined") return INITIAL_DAILY_MISSIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MISSIONS);
    if (!raw) return INITIAL_DAILY_MISSIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DAILY_MISSIONS;
  } catch {
    return INITIAL_DAILY_MISSIONS;
  }
}

export function saveStoredMissions(missions: DailyPriorityMission[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_MISSIONS, JSON.stringify(missions));
  } catch (e) {
    console.warn("[argus-life-os] Failed to persist missions", e);
  }
}

export function getStoredReflections(): DailyReflection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REFLECTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDailyReflection(reflection: DailyReflection): void {
  if (typeof window === "undefined") return;
  try {
    const history = getStoredReflections();
    const updated = [reflection, ...history.filter((r) => r.date !== reflection.date)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY_REFLECTIONS, JSON.stringify(updated));
  } catch (e) {
    console.warn("[argus-life-os] Failed to persist reflection", e);
  }
}
