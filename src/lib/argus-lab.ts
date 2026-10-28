import {
  DEFAULT_EXPERIENCE_CONTRACT,
  type ExperienceContract,
  type ExperienceMode,
} from "./experience-engine";

const CONTRACT_KEY = "argus.experience-contract.v1";
const MODE_KEY = "argus.experience-mode.v1";
const EXPERIMENTS_KEY = "argus.lab.experiments.v1";
const MAX_EXPERIMENTS = 20;

export type LabExperiment = {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: number;
};

export type LabState = {
  contract: ExperienceContract;
  mode: ExperienceMode;
  experiments: LabExperiment[];
};

const modes = new Set<ExperienceMode>(["balanced", "fast-start", "quality", "reliable", "data-saver"]);
const actions = Object.keys(DEFAULT_EXPERIENCE_CONTRACT) as Array<keyof ExperienceContract>;

function storage(): Storage | null {
  try { return localStorage; } catch { return null; }
}

function contract(value: unknown): ExperienceContract {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(actions.map((key) => [key, raw[key] === true])) as ExperienceContract;
}

function experiment(value: unknown): LabExperiment | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.name !== "string" || !raw.name.trim()) return null;
  return { id: raw.id, name: raw.name.trim().slice(0, 80), enabled: raw.enabled === true, createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : 0 };
}

export function loadLabState(): LabState {
  const local = storage();
  if (!local) return { contract: { ...DEFAULT_EXPERIENCE_CONTRACT }, mode: "balanced", experiments: [] };
  try {
    const savedMode = local.getItem(MODE_KEY);
    const parsedContract = JSON.parse(local.getItem(CONTRACT_KEY) ?? "null");
    const parsedExperiments = JSON.parse(local.getItem(EXPERIMENTS_KEY) ?? "[]");
    return {
      contract: contract(parsedContract),
      mode: modes.has(savedMode as ExperienceMode) ? savedMode as ExperienceMode : "balanced",
      experiments: Array.isArray(parsedExperiments) ? parsedExperiments.map(experiment).filter((item): item is LabExperiment => !!item).slice(0, MAX_EXPERIMENTS) : [],
    };
  } catch {
    return { contract: { ...DEFAULT_EXPERIENCE_CONTRACT }, mode: "balanced", experiments: [] };
  }
}

export function saveLabState(state: LabState): boolean {
  const local = storage();
  if (!local) return false;
  try {
    local.setItem(CONTRACT_KEY, JSON.stringify(contract(state.contract)));
    local.setItem(MODE_KEY, state.mode);
    local.setItem(EXPERIMENTS_KEY, JSON.stringify(state.experiments.slice(0, MAX_EXPERIMENTS)));
    return true;
  } catch { return false; }
}

export function resetLabState(): LabState {
  const state: LabState = { contract: { ...DEFAULT_EXPERIENCE_CONTRACT }, mode: "balanced", experiments: [] };
  saveLabState(state);
  return state;
}

export function exportLabState(state: LabState): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...state }, null, 2);
}

export function importLabState(value: string): LabState | null {
  try {
    const raw = JSON.parse(value) as Record<string, unknown>;
    if (raw.version !== 1 || !modes.has(raw.mode as ExperienceMode)) return null;
    const experiments = Array.isArray(raw.experiments)
      ? raw.experiments.map(experiment).filter((item): item is LabExperiment => !!item).slice(0, MAX_EXPERIMENTS)
      : [];
    return { contract: contract(raw.contract), mode: raw.mode as ExperienceMode, experiments };
  } catch { return null; }
}

export function createExperiment(name: string, now = Date.now()): LabExperiment | null {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > 80) return null;
  return { id: `lab-${now.toString(36)}`, name: trimmed, enabled: false, createdAt: now };
}
