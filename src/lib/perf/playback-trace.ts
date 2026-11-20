import { dlog } from "@/lib/debug";

export type PlaybackMilestone =
  | "recovery-start"
  | "rollback-ready"
  | "first-search-result"
  | "candidate-selected"
  | "resolve-start"
  | "resolve-ready"
  | "torrent-add-ready"
  | "torrent-file-ready"
  | "preflight-start"
  | "preflight-ready"
  | "player-opened"
  | "bridge-load"
  | "loadfile-accepted"
  | "file-loaded"
  | "first-frame";

export type PlaybackDecision = {
  mode: "automatic" | "manual";
  score: number;
  candidates: number;
  rejected: number;
  reasons: Array<{ signal: string; delta: number }>;
};

type ActiveTrace = {
  decision?: PlaybackDecision;
  startedAt: number;
  sourceClass: "direct" | "debrid" | "p2p" | "unknown";
  milestones: Partial<Record<PlaybackMilestone, number>>;
};

export type PlaybackTraceReport = {
  id: string;
  sourceClass: ActiveTrace["sourceClass"];
  outcome: "ready" | "failed" | "aborted" | "replaced";
  totalMs: number;
  decision?: PlaybackDecision;
  milestones: Partial<Record<PlaybackMilestone, number>>;
};

const reports: PlaybackTraceReport[] = [];
const listeners = new Set<() => void>();
const active = new Map<string, ActiveTrace>();

// Memory only: never retain media identifiers, URLs, headers, or account details.
export function readPlaybackTraceReports(): readonly PlaybackTraceReport[] {
  return reports.map((report) => ({
    ...report,
    milestones: { ...report.milestones },
    ...(report.decision
      ? {
          decision: {
            ...report.decision,
            reasons: report.decision.reasons.map((reason) => ({ ...reason })),
          },
        }
      : {}),
  }));
}

export function subscribePlaybackTraceReports(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function recordPlaybackDecision(
  traceId: string | undefined,
  decision: PlaybackDecision,
): void {
  const trace = traceId ? active.get(traceId) : null;
  if (!trace) return;
  const allowed = new Set([
    "cached",
    "direct url",
    "direct-free-stream",
    "easynews-direct",
    "dead-link",
    "verified-correct-link",
    "zero-seeders-soft",
    "zero-seeders-stale-meta",
    "seeders",
    "group-pref",
    "prev-episode-group",
    "year-mismatch",
    "year-off-by-1",
    "REMUX",
    "regional-dub",
    "AV1-efficiency",
    "HEVC-efficiency",
  ]);
  trace.decision = {
    mode: decision.mode,
    score: Number.isFinite(decision.score) ? decision.score : 0,
    candidates: Math.max(0, Math.floor(decision.candidates)),
    rejected: Math.max(0, Math.floor(decision.rejected)),
    reasons: decision.reasons.slice(0, 30).flatMap((reason) => {
      const category = reason.signal.split(/[:=]/)[0];
      return allowed.has(category) && Number.isFinite(reason.delta)
        ? [{ signal: category, delta: reason.delta }]
        : [];
    }),
  };
}

export function clearPlaybackTraceReports(): void {
  reports.length = 0;
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* diagnostic observer */
    }
  }
}

let nextTraceId = 0;

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function markName(traceId: string, milestone: string): string {
  return `argus:playback:${traceId}:${milestone}`;
}

export function beginPlaybackTrace(
  sourceClass: ActiveTrace["sourceClass"],
  startedAt = now(),
): string {
  const traceId = `${Date.now().toString(36)}-${(++nextTraceId).toString(36)}`;
  // Bound abandoned traces as well as completed reports.
  if (active.size >= 50) {
    const oldest = active.keys().next().value!;
    const abandoned = active.get(oldest)!;
    for (const milestone of ["committed", ...Object.keys(abandoned.milestones)]) {
      performance?.clearMarks?.(markName(oldest, milestone));
    }
    active.delete(oldest);
  }
  active.set(traceId, { startedAt, sourceClass, milestones: {} });
  performance?.mark?.(markName(traceId, "committed"), { startTime: startedAt });
  dlog(`[perf][playback] ${traceId} committed source=${sourceClass}`);
  return traceId;
}

export function markPlaybackTrace(
  traceId: string | null | undefined,
  milestone: PlaybackMilestone,
  observedAt = now(),
): void {
  if (!traceId || !active.has(traceId)) return;
  performance?.mark?.(markName(traceId, milestone), { startTime: observedAt });
  const trace = active.get(traceId)!;
  trace.milestones[milestone] ??= Math.round(observedAt - trace.startedAt);
  dlog(
    `[perf][playback] ${traceId} ${milestone} elapsed_ms=${Math.round(now() - trace.startedAt)}`,
  );
}

export function finishPlaybackTrace(
  traceId: string | null | undefined,
  outcome: "ready" | "failed" | "aborted" | "replaced" = "ready",
): void {
  if (!traceId) return;
  const trace = active.get(traceId);
  if (!trace) return;
  const end = markName(traceId, outcome);
  performance?.mark?.(end);
  try {
    performance?.measure?.(markName(traceId, "total"), {
      start: markName(traceId, "committed"),
      end,
    });
  } catch {
    // Performance marks are diagnostic only and must never affect playback.
  }
  dlog(
    `[perf][playback] ${traceId} ${outcome} source=${trace.sourceClass} total_ms=${Math.round(
      now() - trace.startedAt,
    )}`,
  );
  reports.unshift({
    id: traceId,
    sourceClass: trace.sourceClass,
    outcome,
    decision: trace.decision,
    totalMs: Math.round(now() - trace.startedAt),
    milestones: { ...trace.milestones },
  });
  reports.splice(20);
  active.delete(traceId);
  // The marks have served their purpose; long viewing sessions must stay bounded.
  for (const milestone of ["committed", ...Object.keys(trace.milestones), outcome]) {
    performance?.clearMarks?.(markName(traceId, milestone));
  }
  performance?.clearMeasures?.(markName(traceId, "total"));
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* diagnostic observer */
    }
  }
}
