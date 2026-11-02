/**
 * ARGUS — Dharma Engine & Sage Mentor Mode
 * "I will not live your life for you. I will help you see clearly enough to live it deliberately."
 *
 * Grounded in four pillars:
 * 1. Duty (What must this person do?)
 * 2. Direction (What future are they trying to build?)
 * 3. Reality (What biological and clinical constraints exist right now?)
 * 4. Wisdom (What action balances immediate responsibility with compounding consequences?)
 */

export type ClinicalShiftScenario = "normal_study_day" | "hospital_duty_24h" | "post_duty_recovery";

export type MentorGuidanceBlock = {
  time: string; // e.g. "07:00"
  tag: string; // "MORNING COUNSEL", "FOCUS DEFENSE", "WEALTH ENGINE", "NIGHTLY REFLECTION"
  headline: string;
  advice: string;
  actionMove: string;
};

export type DharmaEngineOutput = {
  scenario: ClinicalShiftScenario;
  dutyConstraint: string;
  directionTarget: string;
  realityCheck: string;
  wisdomPrescription: string;
  primaryAllocation: {
    examPrepHours: number;
    wealthEngineHours: number;
    recoveryAndDutyHours: number;
  };
  dailySageTimeline: MentorGuidanceBlock[];
};

export function runDharmaEngine(scenario: ClinicalShiftScenario): DharmaEngineOutput {
  switch (scenario) {
    case "hospital_duty_24h":
      return {
        scenario,
        dutyConstraint: "Active 24-hour in-hospital emergency & clinical rounds. Zero margin for deep study fatigue.",
        directionTarget: "Patient safety & clinical excellence come first. INI-CET and ₹10 Cr are secondary today.",
        realityCheck: "Cognitive bandwidth will be depleted by critical patient decisions. Forcing 4 hours of revision tonight causes medical error.",
        wisdomPrescription: "Protect mandatory clinical duties. Do NOT attempt speculative business or marathon study. Keep revision limited to 30 mins of quick high-yield flashcards during breaks.",
        primaryAllocation: {
          examPrepHours: 0.5,
          wealthEngineHours: 0.0,
          recoveryAndDutyHours: 23.5,
        },
        dailySageTimeline: [
          {
            time: "07:30",
            tag: "DUTY ANCHOR",
            headline: "Your hospital rounds hold absolute precedence today",
            advice: "Do not feel guilty about not studying for 6 hours today. A doctor's primary dharma today is patient care and presence.",
            actionMove: "Put books away. Full presence on the floor.",
          },
          {
            time: "14:00",
            tag: "MICRO RETENTION",
            headline: "15 minutes of clinical flashcard review during lunch",
            advice: "Review 25 pharmacology/pathology high-yield cards. Nothing more.",
            actionMove: "Review 25 cards, then step outside for 5 mins of fresh air.",
          },
          {
            time: "21:00",
            tag: "BIOLOGICAL DEFENSE",
            headline: "Protect on-call rest windows",
            advice: "Do not browse venture capital or startup podcasts while on duty. Rest whenever the pager is quiet.",
            actionMove: "Rest your eyes, hydrate, and maintain situational readiness.",
          },
        ],
      };

    case "post_duty_recovery":
      return {
        scenario,
        dutyConstraint: "Acute sleep deprivation & high biological strain from the 24h duty.",
        directionTarget: "Restore neural baseline and consolidate clinical learning.",
        realityCheck: "Your HRV is suppressed and reaction time is compromised. Trying to force heavy startup modeling or 8h of study will trigger burnout.",
        wisdomPrescription: "Sleep 7+ hours first. Wake up, take a brisk 20m sunlight walk, and complete ONE 90-minute high-yield question bank session once rested. Zero business calls.",
        primaryAllocation: {
          examPrepHours: 1.5,
          wealthEngineHours: 0.0,
          recoveryAndDutyHours: 22.5,
        },
        dailySageTimeline: [
          {
            time: "10:00",
            tag: "RECOVERY COMMAND",
            headline: "Deep physiological sleep before any ambition",
            advice: "Ambition without sleep is delusion. Your brain consolidates memory only during slow-wave and REM sleep.",
            actionMove: "Dark room, phone on silent, sleep until natural waking.",
          },
          {
            time: "16:00",
            tag: "CIRCADIAN RESET",
            headline: "Sunlight, movement, hydration",
            advice: "Get 20 minutes of outdoor photons to reset your circadian clock.",
            actionMove: "Take a quiet 20-minute walk without headphones.",
          },
          {
            time: "18:00",
            tag: "TARGETED SPRINT",
            headline: "One 90-minute INI-CET Question Bank block",
            advice: "Solve 50 high-yield questions with full error analysis. Stop when the timer strikes 90 mins.",
            actionMove: "Solve 50 questions. No venture work today.",
          },
        ],
      };

    case "normal_study_day":
    default:
      return {
        scenario: "normal_study_day",
        dutyConstraint: "Regular clinical shift (4-6h) with protected discretionary study windows.",
        directionTarget: "Top INI-CET rank is the primary locomotive. Wealth engine is an active, secondary 45-minute experiment.",
        realityCheck: "8 discretionary hours available. You risk diluting exam intensity if you chase unvalidated startup ideas for 4 hours.",
        wisdomPrescription: "Allocate 6.0h strictly to INI-CET question banks and revision. Reserve 45m in the evening to validate one healthcare problem with a real user. 1.2h for recovery, movement, and reflection.",
        primaryAllocation: {
          examPrepHours: 6.0,
          wealthEngineHours: 0.8,
          recoveryAndDutyHours: 17.2,
        },
        dailySageTimeline: [
          {
            time: "07:00",
            tag: "MORNING COUNSEL",
            headline: "Two ambitions compete; only one earns your freshest focus",
            advice: "Finish your revision and test questions before touching your business. Great futures are constructed through correct priorities, not constant scattered activity.",
            actionMove: "Initiate 3-hour morning revision block immediately.",
          },
          {
            time: "13:30",
            tag: "FOCUS DEFENSE",
            headline: "Friction against avoidance",
            advice: "You planned 90 minutes for clinical vignettes. You are tempted to open Twitter or startup forums. Is this necessary, or are you avoiding a difficult question bank?",
            actionMove: "Take 3 deep breaths, close all extra tabs, and do 10 questions.",
          },
          {
            time: "19:00",
            tag: "WEALTH COUNSEL",
            headline: "Your ₹10 Cr goal needs an economic engine, not motivational content",
            advice: "Do not watch tech videos. Spend 30 minutes speaking with one clinician or patient about an administrative bottleneck worth paying to solve.",
            actionMove: "Message or call 1 prospective user for customer discovery.",
          },
          {
            time: "22:00",
            tag: "NIGHTLY REFLECTION",
            headline: "Review commitments kept vs rationalizations made",
            advice: "You finished 80% of your targets today. What caused the remaining 20% to slip? Tomorrow, remove the single obstacle rather than piling on more unrealistic goals.",
            actionMove: "Write 1 honest reflection line and sleep by 23:00.",
          },
        ],
      };
  }
}
