import type { ClinicalCaseSimulation, PatientVitalSigns } from "./simulator-types";
export type SimulationState = {
  elapsedSec: number;
  vitals: PatientVitalSigns;
  ordered: Record<string, number>;
  performed: string[];
  timeline: { at: number; action: string }[];
  fatal: boolean;
  resolved: boolean;
  reassessedAt?: number;
};
export type SimulationAction =
  | { type: "order" | "perform"; id: string }
  | { type: "advance"; seconds: number }
  | { type: "reassess" };
export function initialSimulation(caseData: ClinicalCaseSimulation): SimulationState {
  return {
    elapsedSec: 0,
    vitals: { ...caseData.initialVitals },
    ordered: {},
    performed: [],
    timeline: [],
    fatal: false,
    resolved: false,
  };
}
export function investigationReady(state: SimulationState, id: string): boolean {
  return state.ordered[id] !== undefined && state.elapsedSec >= state.ordered[id];
}
export function transitionSimulation(
  caseData: ClinicalCaseSimulation,
  previous: SimulationState,
  action: SimulationAction,
): SimulationState {
  if (previous.fatal || previous.resolved) return previous;
  const state: SimulationState = {
    ...previous,
    ordered: { ...previous.ordered },
    performed: [...previous.performed],
    timeline: [...previous.timeline],
  };
  let description = "";
  if (action.type === "advance") {
    if (!Number.isFinite(action.seconds) || action.seconds <= 0) return previous;
    state.elapsedSec += Math.min(action.seconds, 3600);
    description = `Advanced ${Math.min(action.seconds, 3600)} simulated seconds`;
  } else if (action.type === "order") {
    const investigation = caseData.availableInvestigations.find((item) => item.id === action.id);
    if (!investigation || state.ordered[action.id] !== undefined) return previous;
    state.ordered[action.id] = state.elapsedSec + investigation.turnaroundTimeSec;
    description = `Ordered ${investigation.name}`;
  } else if (action.type === "perform") {
    const intervention = caseData.availableInterventions.find((item) => item.id === action.id);
    if (!intervention || state.performed.includes(action.id)) return previous;
    if (
      intervention.requiresInterventions?.some((id) => !state.performed.includes(id)) ||
      intervention.requiresInvestigations?.some((id) => !investigationReady(state, id))
    )
      return previous;
    state.performed.push(action.id);
    state.vitals = { ...state.vitals, ...intervention.hemodynamicDelta };
    state.fatal = !!intervention.isFatal;
    state.reassessedAt = undefined;
    description = `Performed ${intervention.name}`;
  } else {
    state.reassessedAt = state.elapsedSec;
    // A successful action alone does not finish a case: require an explicit reassessment.
    const goals =
      caseData.requiredInterventions ??
      caseData.availableInterventions.filter((item) => item.isCorrect).map((item) => item.id);
    state.resolved = goals.length > 0 && goals.every((id) => state.performed.includes(id));
    description = state.resolved
      ? "Reassessed: scenario goals completed"
      : "Reassessed: scenario goals remain incomplete";
  }
  state.timeline.push({ at: state.elapsedSec, action: description });
  return state;
}
