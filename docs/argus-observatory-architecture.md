# Argus Observatory: experience engine architecture

## Purpose

Observatory is a local-first control surface for understanding and configuring the user's Argus experience. The initial vertical slice includes a deterministic ranking simulator, a persisted user policy contract, and local capability signals. It intentionally does not claim to inspect live streams or enforce policies across every existing subsystem yet.

## Architecture

```text
UI (Argus Observatory)
  ├── Decision Lab ──> rankExperienceCandidates()
  ├── Experience Contract ──> isExperienceActionAllowed()
  └── Local Signals ──> browser capability probes
            │
            └── localStorage (versioned keys; no network calls)
```

Future production integration should preserve these boundaries:

1. **Observe**: collect the minimum signal needed, behind an explicit permission boundary.
2. **Normalize**: bound values to comparable ranges and represent missing evidence as unknown.
3. **Constrain**: discard incompatible candidates before scoring; user policy is a hard constraint, not a ranking weight.
4. **Score**: calculate a deterministic weighted score for a user-selected intent.
5. **Explain**: return the top contributing factors and evidence confidence.
6. **Authorize**: check the Experience Contract before any consequential action.
7. **Act**: run a bounded, cancellable operation.
8. **Verify and undo**: confirm the outcome, retain a reversible action record, and offer recovery.

## Ranking algorithm

For each compatible candidate:

- `speed = clamp(1 - startupMs / 15000, 0, 1)`
- `quality = clamp(qualityP / 2160, 0, 1)`
- `evidenceConfidence = observations / (observations + 4)`
- `stability = clamp(rawStability, 0, 1) × evidenceConfidence × failurePenalty`
- `data = clamp(1 - estimatedMbps / 30, 0, 1)`

`score = 100 × (wSpeed×speed + wQuality×quality + wStability×stability + wData×data)`

Weights are selected by mode and sum to one. Incompatible candidates are excluded before scoring. Ties break by lower startup estimate and then stable ID order. This is a preview algorithm; synthetic demo inputs are clearly labeled and are not evidence about actual streams.

## Experience Contract

The contract uses explicit boolean policy decisions for automatic switching, external AI, telemetry, and unattended installation. A policy check is fail-closed: only a literal `true` authorizes an action. Defaults disable external AI, telemetry, and unattended installs. To become enforceable, callers in playback, telemetry, AI, and integration-install subsystems must consult this policy at their action boundary; the UI alone is not a security boundary.

## Privacy and safety invariants

- No stream URL, viewing history, credentials, or addon manifest is accessed by the Observatory page.
- Local signals describe browser capabilities, not verified internet health.
- Storage keys are versioned and profile-local; no synchronization is performed.
- User policy cannot make an incompatible stream compatible.
- No source is contacted by the ranking demo.
- External AI, telemetry, and automatic installation remain denied by default.
- Actual policy enforcement requires follow-up integration tests at each subsystem boundary.

## Validation plan

- Unit-test weight profiles, compatibility filtering, confidence decay, deterministic tie-breaking, and fail-closed policy checks.
- UI-test keyboard navigation, tab semantics, storage failure, and offline/online transitions.
- Integrate the contract into actual action boundaries only in separate reviewed changes.
- Benchmark the ranking algorithm against anonymized, opt-in playback outcomes before changing production defaults.
