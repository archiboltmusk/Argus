export type ExperienceMode = "balanced" | "fast-start" | "quality" | "reliable" | "data-saver";

export type StreamCandidate = {
  id: string;
  label: string;
  startupMs: number;
  quality: 480 | 720 | 1080 | 1440 | 2160;
  stability: number;
  estimatedMbps: number;
  compatible: boolean;
  recentFailures: number;
  observations: number;
};

export type RankedCandidate = StreamCandidate & {
  score: number;
  confidence: number;
  reasons: string[];
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const normalize = (value: number, max: number) => clamp01(value / max);

const WEIGHTS: Record<ExperienceMode, { speed: number; quality: number; stability: number; data: number }> = {
  balanced: { speed: 0.28, quality: 0.24, stability: 0.36, data: 0.12 },
  "fast-start": { speed: 0.52, quality: 0.12, stability: 0.28, data: 0.08 },
  quality: { speed: 0.12, quality: 0.52, stability: 0.28, data: 0.08 },
  reliable: { speed: 0.16, quality: 0.14, stability: 0.62, data: 0.08 },
  "data-saver": { speed: 0.18, quality: 0.12, stability: 0.28, data: 0.42 },
};

/**
 * Explainable ranking for the Argus Lab preview. This is deliberately deterministic:
 * incompatible candidates are excluded, reliability is confidence-adjusted, and the
 * returned reasons expose the largest weighted contributions. It never fetches streams.
 */
export function rankExperienceCandidates(
  candidates: StreamCandidate[],
  mode: ExperienceMode,
): RankedCandidate[] {
  const weights = WEIGHTS[mode];
  return candidates
    .filter((candidate) => candidate.compatible)
    .map((candidate) => {
      const speed = 1 - normalize(candidate.startupMs, 15_000);
      const quality = normalize(candidate.quality, 2160);
      const evidenceConfidence = candidate.observations / (candidate.observations + 4);
      const stability = clamp01(candidate.stability) * evidenceConfidence *
        (1 - Math.min(0.8, Math.max(0, candidate.recentFailures) * 0.12));
      const data = 1 - normalize(candidate.estimatedMbps, 30);
      const contributions = [
        { label: "startup", score: speed * weights.speed, detail: `Startup estimate ${Math.round(candidate.startupMs / 100) / 10}s` },
        { label: "quality", score: quality * weights.quality, detail: `${candidate.quality}p quality target` },
        { label: "stability", score: stability * weights.stability, detail: `Stability ${Math.round(stability * 100)}% with ${candidate.observations} observations` },
        { label: "data", score: data * weights.data, detail: `Estimated ${candidate.estimatedMbps} Mbps` },
      ];
      const score = contributions.reduce((sum, item) => sum + item.score, 0);
      const reasons = [...contributions]
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((item) => item.detail);
      return {
        ...candidate,
        score: Math.round(score * 1000) / 10,
        confidence: Math.round(evidenceConfidence * 100),
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score || a.startupMs - b.startupMs || a.id.localeCompare(b.id));
}

export type ExperienceAction = "auto-switch" | "external-ai" | "telemetry" | "auto-install";

export type ExperienceContract = Record<ExperienceAction, boolean>;

export const DEFAULT_EXPERIENCE_CONTRACT: ExperienceContract = {
  "auto-switch": true,
  "external-ai": false,
  telemetry: false,
  "auto-install": false,
};

export function isExperienceActionAllowed(
  contract: ExperienceContract,
  action: ExperienceAction,
): boolean {
  return contract[action] === true;
}

export function scoreConfidence(observations: number): number {
  if (!Number.isFinite(observations) || observations <= 0) return 0;
  return Math.round((observations / (observations + 4)) * 100);
}
