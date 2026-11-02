/**
 * ARGUS — Physiological Health & Energy Engine (Inspired by Bevel + Wearable Integration)
 * Connecting biological readiness (Recovery, Sleep, HRV, Strain, Energy Bank) directly to practical life decisions.
 */

export type PhysiologicalMetric = {
  recoveryScore: number; // 0 - 100%
  hrvMs: number; // Heart Rate Variability (RMSSD)
  restingHeartRate: number; // bpm
  sleepScore: number; // 0 - 100
  sleepDurationHours: number;
  dailyStrain: number; // 0.0 - 21.0 exertion score
  targetStrainRange: [number, number]; // e.g. [11.0, 14.5]
  energyBankCharged: number; // e.g. +85%
  energyBankDepleted: number; // e.g. -62%
  stressScore: number; // 0 - 100 physiological stress
  recoveryTrend: "climbing" | "stable" | "recovering_from_strain";
};

export type EnergyAwareScheduleRecommendation = {
  headline: string;
  energyLevelCategory: "peak_capacity" | "moderate_load" | "active_rest_required";
  actionRecommendation: string;
  rationale: string;
  taskSchedulingRule: string;
};

export function computeEnergyAwareRecommendation(
  m: PhysiologicalMetric,
  _demandingGoalsCount?: number,
): EnergyAwareScheduleRecommendation {
  if (m.recoveryScore < 45 || m.sleepDurationHours < 6.0) {
    return {
      headline: "Low Recovery Alert (Defend your biological baseline)",
      energyLevelCategory: "active_rest_required",
      actionRecommendation: "Cap deep cognitive sessions to 45m max; defer non-essential late meetings.",
      rationale: `HRV dropped to ${m.hrvMs}ms and sleep was only ${m.sleepDurationHours}h. High strain today risks immune and cognitive depletion.`,
      taskSchedulingRule: "Reschedule heavy decisions to morning peak; take a 20m restorative outdoor walk.",
    };
  }

  if (m.recoveryScore >= 75 && m.sleepScore >= 75) {
    return {
      headline: "High Readiness Day (Optimal for Peak Cognitive & Physical Load)",
      energyLevelCategory: "peak_capacity",
      actionRecommendation: `Tackle your single hardest strategic priority during your 08:00–11:30 peak. Target strain: ${m.targetStrainRange[1]}.`,
      rationale: `Recovery is at ${m.recoveryScore}% with stable resting HR (${m.restingHeartRate} bpm) and ${m.hrvMs}ms HRV. Your body has full capacity for breakthrough output.`,
      taskSchedulingRule: "Schedule a 90-minute uninterrupted deep work block; execute higher-difficulty physical training.",
    };
  }

  return {
    headline: "Steady Baseline (Sustain Intentional Rhythm)",
    energyLevelCategory: "moderate_load",
    actionRecommendation: "Complete today's 3 priority missions at a steady pace without evening overextension.",
    rationale: `Recovery is balanced (${m.recoveryScore}%). Energy bank has ${m.energyBankCharged - m.energyBankDepleted}% available margin.`,
    taskSchedulingRule: "Maintain regular focus intervals with 5m eye & posture breaks every hour.",
  };
}
