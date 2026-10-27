import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_EXPERIENCE_CONTRACT,
  isExperienceActionAllowed,
  rankExperienceCandidates,
  scoreConfidence,
  type StreamCandidate,
} from "../src/lib/experience-engine";

const candidates: StreamCandidate[] = [
  { id: "slow", label: "Slow 4K", startupMs: 9000, quality: 2160, stability: 0.9, estimatedMbps: 22, compatible: true, recentFailures: 0, observations: 20 },
  { id: "fast", label: "Fast 1080p", startupMs: 900, quality: 1080, stability: 0.9, estimatedMbps: 7, compatible: true, recentFailures: 0, observations: 20 },
  { id: "bad", label: "Incompatible", startupMs: 100, quality: 2160, stability: 1, estimatedMbps: 1, compatible: false, recentFailures: 0, observations: 50 },
];

test("ranking excludes incompatible candidates before scoring", () => {
  const result = rankExperienceCandidates(candidates, "balanced");
  assert.equal(result.length, 2);
  assert.ok(result.every((candidate) => candidate.id !== "bad"));
});

test("ranking is deterministic and includes human-readable reasons", () => {
  const first = rankExperienceCandidates(candidates, "balanced");
  const second = rankExperienceCandidates(candidates, "balanced");
  assert.deepEqual(first.map((item) => [item.id, item.score, item.reasons]), second.map((item) => [item.id, item.score, item.reasons]));
  assert.ok(first[0].reasons.length > 0);
});

test("confidence increases with evidence and remains zero without observations", () => {
  assert.equal(scoreConfidence(0), 0);
  assert.ok(scoreConfidence(20) > scoreConfidence(1));
});

test("experience contract fails closed for absent permissions", () => {
  assert.equal(isExperienceActionAllowed(DEFAULT_EXPERIENCE_CONTRACT, "external-ai"), false);
  assert.equal(isExperienceActionAllowed(DEFAULT_EXPERIENCE_CONTRACT, "auto-install"), false);
  assert.equal(isExperienceActionAllowed(DEFAULT_EXPERIENCE_CONTRACT, "auto-switch"), true);
});
