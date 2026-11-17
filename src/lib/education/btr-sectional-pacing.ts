/**
 * Argus CoreBTR 2024 NEET-PG Sectional Time-Boxed Pacing Simulator
 *
 * Implements the official NBE 2024 Examination Scheme:
 * - 4 mandatory sections (A, B, C, D) of 50 questions each (total 200 questions).
 * - 42 minutes allocated per section (total 168 minutes).
 * - Mandatory Section Lockout: Once 42 minutes expire or candidate submits Section N,
 *   Section N is PERMANENTLY locked. Candidate CANNOT return to previous sections.
 * - Pacing Radar: Calculates second-by-second drift from the optimal 50.4s/question pace.
 */

export interface ExamSectionConfig {
  sectionId: "A" | "B" | "C" | "D";
  title: string;
  startIndex: number;
  endIndex: number; // inclusive
  totalQuestions: number;
  timeLimitSeconds: number; // default 42 mins = 2520s
}

export interface SectionalPacingState {
  currentSectionId: "A" | "B" | "C" | "D";
  sectionStates: Record<
    "A" | "B" | "C" | "D",
    {
      isLocked: boolean;
      timeSpentSeconds: number;
      submittedAt?: number;
      attemptedCount: number;
      markedForReviewCount: number;
    }
  >;
  isExamComplete: boolean;
}

export interface PacingRadarTelemetry {
  sectionId: "A" | "B" | "C" | "D";
  currentQuestionInSection: number;
  totalQuestionsInSection: number;
  sectionTimeRemainingSeconds: number;
  idealSecondsElapsed: number;
  actualSecondsElapsed: number;
  driftSeconds: number; // negative = ahead (rushing), positive = behind (sluggish)
  pacingStatus: "optimal" | "rushing" | "falling_behind" | "critical_time_deficit";
  warningBellTriggered?: "5_min_warning" | "1_min_warning" | "time_expired";
  recommendedSecondsPerRemainingQuestion: number;
  pacingMessage: string;
}

/**
 * Derives the 4 section configurations for any total question count
 */
export function buildNEETPGSectionConfigs(totalQuestions: number): ExamSectionConfig[] {
  const countPerSection = Math.ceil(totalQuestions / 4);
  const sections: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];

  return sections.map((secId, i) => {
    const start = i * countPerSection;
    const end = Math.min(totalQuestions - 1, (i + 1) * countPerSection - 1);
    const count = Math.max(0, end - start + 1);

    return {
      sectionId: secId,
      title: `Section ${secId} (Q${start + 1} - Q${end + 1})`,
      startIndex: start,
      endIndex: end,
      totalQuestions: count,
      timeLimitSeconds: Math.round((42 * 60 * count) / 50), // Scales proportionally to 42m/50Q
    };
  });
}

/**
 * Initializes the default sectional pacing state
 */
export function initSectionalPacingState(): SectionalPacingState {
  return {
    currentSectionId: "A",
    sectionStates: {
      A: { isLocked: false, timeSpentSeconds: 0, attemptedCount: 0, markedForReviewCount: 0 },
      B: { isLocked: true, timeSpentSeconds: 0, attemptedCount: 0, markedForReviewCount: 0 },
      C: { isLocked: true, timeSpentSeconds: 0, attemptedCount: 0, markedForReviewCount: 0 },
      D: { isLocked: true, timeSpentSeconds: 0, attemptedCount: 0, markedForReviewCount: 0 },
    },
    isExamComplete: false,
  };
}

/**
 * Calculates real-time pacing telemetry for the active question and section
 */
export function computePacingRadar(params: {
  sectionConfig: ExamSectionConfig;
  currentQuestionIndex: number;
  sectionElapsedSeconds: number;
}): PacingRadarTelemetry {
  const { sectionConfig, currentQuestionIndex, sectionElapsedSeconds } = params;
  const qNumInSection = Math.max(1, currentQuestionIndex - sectionConfig.startIndex + 1);
  const totalQ = Math.max(1, sectionConfig.totalQuestions);
  const timeLimit = sectionConfig.timeLimitSeconds;
  const timeRemaining = Math.max(0, timeLimit - sectionElapsedSeconds);

  // Standard NBE Pace: 2520s / 50Q = 50.4s/Q
  const standardSecondsPerQ = timeLimit / totalQ;
  const idealSecondsElapsed = Math.round(qNumInSection * standardSecondsPerQ);
  const driftSeconds = sectionElapsedSeconds - idealSecondsElapsed;

  const remainingQuestions = Math.max(1, totalQ - qNumInSection);
  const recommendedSecondsPerRemainingQuestion = Math.max(
    5,
    Math.round(timeRemaining / remainingQuestions)
  );

  let pacingStatus: PacingRadarTelemetry["pacingStatus"] = "optimal";
  let pacingMessage = "Cadence is optimal. Maintain diagnostic composure.";

  if (timeRemaining <= 0) {
    pacingStatus = "critical_time_deficit";
    pacingMessage = "Time expired for this section! Auto-locking section.";
  } else if (driftSeconds > 120) {
    pacingStatus = "critical_time_deficit";
    pacingMessage = `CRITICAL DEFICIT: ${Math.round(driftSeconds / 60)}m behind target pace! Acceleration needed.`;
  } else if (driftSeconds > 45) {
    pacingStatus = "falling_behind";
    pacingMessage = "Falling slightly behind schedule. Avoid spending > 60s on complex stems.";
  } else if (driftSeconds < -90) {
    pacingStatus = "rushing";
    pacingMessage = "Rushing detected! Rushing increases silly errors by 40%. Verify all 4 options.";
  }

  let warningBellTriggered: PacingRadarTelemetry["warningBellTriggered"];
  if (timeRemaining === 0) {
    warningBellTriggered = "time_expired";
  } else if (timeRemaining <= 60) {
    warningBellTriggered = "1_min_warning";
  } else if (timeRemaining <= 300) {
    warningBellTriggered = "5_min_warning";
  }

  return {
    sectionId: sectionConfig.sectionId,
    currentQuestionInSection: qNumInSection,
    totalQuestionsInSection: totalQ,
    sectionTimeRemainingSeconds: timeRemaining,
    idealSecondsElapsed,
    actualSecondsElapsed: sectionElapsedSeconds,
    driftSeconds,
    pacingStatus,
    warningBellTriggered,
    recommendedSecondsPerRemainingQuestion,
    pacingMessage,
  };
}

/**
 * Transitions candidate to the next section and permanently locks the previous section
 */
export function lockAndAdvanceSection(
  currentState: SectionalPacingState,
  configs: ExamSectionConfig[]
): {
  nextState: SectionalPacingState;
  nextQuestionIndex: number;
  isFinished: boolean;
} {
  const currentId = currentState.currentSectionId;
  const sectionsOrder: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
  const currentIdx = sectionsOrder.indexOf(currentId);

  const updatedSectionStates = {
    ...currentState.sectionStates,
    [currentId]: {
      ...currentState.sectionStates[currentId],
      isLocked: true,
      submittedAt: Date.now(),
    },
  };

  if (currentIdx >= sectionsOrder.length - 1) {
    // Last section complete
    return {
      nextState: {
        ...currentState,
        sectionStates: updatedSectionStates,
        isExamComplete: true,
      },
      nextQuestionIndex: -1,
      isFinished: true,
    };
  }

  const nextSectionId = sectionsOrder[currentIdx + 1];
  updatedSectionStates[nextSectionId] = {
    ...updatedSectionStates[nextSectionId],
    isLocked: false,
  };

  const nextConfig = configs.find((c) => c.sectionId === nextSectionId);
  const nextQIndex = nextConfig ? nextConfig.startIndex : 0;

  return {
    nextState: {
      ...currentState,
      currentSectionId: nextSectionId,
      sectionStates: updatedSectionStates,
      isExamComplete: false,
    },
    nextQuestionIndex: nextQIndex,
    isFinished: false,
  };
}
