# Rockhounding Field Platform Coordinator

**Role:** Orchestrator for this repository. Not a source of scientific, legal, or geological truth.

**Governing principle:** Increase execution autonomy without increasing epistemic authority.

**Validated repository state:**

- Branch: `feat/sprint-4-field-mode`
- `ROCKHOUNDING_EVIDENCE_QUARANTINE_R1` is closed and STABLE
- `ROCKHOUNDING_OFFLINE_FIXTURE_ADAPTERS_R1` is closed at `27d5eeb050d61321f04fcb749a9bdc905edd978e` (60 files, 781 tests)
- This document travels with `ROCKHOUNDING_EVIDENCE_ADMISSION_ENGINE_R1`
- Evidence Admission is the active purpose-specific gate
- Fixture success does not imply source admission
- Live ingestion stays closed
- Network access stays prohibited
- Next phase after that pass: `ROCKHOUNDING_DECISION_EVIDENCE_CONTRACTS_R1`

Reconfirm branch, HEAD, origin, and `git status` before every implementation phase. This snapshot goes stale the moment the branch moves.

## Operating model

- One implementation owner per foundational schema.
- Parallel work is limited to read-only research, review, adversarial test design, documentation audit, security review, and UI validation.
- Do not let two agents mutate the same foundational domain contract.
- Prefer a fresh environment before accepting a foundational change.
- Repository evidence outranks UI status. A wrapper timeout is not a failure until Git and process state are checked independently.
- For a foundation change, a reviewer who did not implement it asks: What assumption is wrong? Did authority increase through transformation? Was uncertainty collapsed? Was raw evidence overwritten? Did source, observation, sample, assertion, provenance, or decision semantics blur? Did a hidden dependency appear? Did the change exceed the phase? Did tests prove semantics or only execution?

## Stable contracts

These are governed interfaces. Do not silently change their semantics.

| Contract                                                         | Version               | Export                                            |
| ---------------------------------------------------------------- | --------------------- | ------------------------------------------------- |
| UGES                                                             | 1.1.0                 | `@rockhounding/shared/uges`                       |
| Geological Layer Registry                                        | 1.0.0                 | `@rockhounding/shared/geological-layer-registry`  |
| Resource Catalog                                                 | 1.0.0                 | `@rockhounding/shared/resource-catalog`           |
| Source Governance Contract                                       | 1.0.0                 | `@rockhounding/shared/source-governance-contract` |
| Building Block Registry                                          | registry of the above | `@rockhounding/shared/building-block-registry`    |
| Observation, Sample, Sampling Event                              | 1.0.0 each            | `@rockhounding/shared/observation-sample-model`   |
| Provenance Activity                                              | 1.0.0                 | `@rockhounding/shared/provenance-activity-kernel` |
| Truth Clock / Evidence Availability                              | 1.0.0                 | `@rockhounding/shared/truth-clock-availability`   |
| Source Adapter Contract (`rockhounding:source-adapter-contract`) | 1.0.0                 | `@rockhounding/shared/source-adapter-contract`    |
| Evidence Quarantine (`rockhounding:evidence-quarantine`)         | 1.0.0                 | `@rockhounding/shared/evidence-quarantine`        |
| Evidence Admission (`rockhounding:evidence-admission`)           | 1.0.0                 | `@rockhounding/shared/evidence-admission`         |

Truth Clock is STABLE because R1 passed. `rockhounding:evidence-availability` and `rockhounding:decision-snapshot` remain DRAFT. Prior DRAFT 0.1.0 rows stay queryable when a block is promoted. Do not change other STABLE versions while promoting one block.

## Invariants

- Certainty and confidence are independent.
- `PROHIBITED` is permission, not certainty.
- Resource or source authority does not become assertion authority.
- An observation is not a UGES assertion. A sample is not an observation. A sampling event does not authorize collection.
- Model-generated analysis is not direct observation.
- Provenance explains lineage and does not manufacture truth. Processing does not elevate authority.
- Source accessibility does not authorize ingestion or redistribution.
- Community evidence does not silently become authoritative evidence.
- Geological promise does not imply collection permission.
- Unknown or partial evidence stays explicitly unresolved.
- Historical evidence is corrected by a new record or supersession, not by erasure.
- Retrieved time is not source-update time. Published time is not effective time. Fresh is not true. Stale is not false. Missing is not fetch-failed. A coverage gap is not “no matching record.” Unavailable is not prohibited. Unresolved is not contradicted.
- A zero-result query does not establish confirmed absence.
- Absence of a timestamp does not invent one.

## Phase protocol

1. Preflight: branch, required HEAD, HEAD versus origin, `git status`, preserve unrelated dirty paths, baseline tests.
2. Inspect existing contracts.
3. Add red-first tests where practical.
4. Implement the smallest coherent contract.
5. Targeted tests, then `pnpm test:ci`.
6. Shared type-check, `pnpm build:core`, shared build, `pnpm --filter web run build`, targeted eslint, `git diff --check`.
7. Adversarial semantic review.
8. Update documentation and `qa-artifacts/<phase>/`.
9. Verify repository state independently.
10. Commit only phase-owned files. Push only when the phase asks for it. Confirm HEAD equals origin afterward.
11. Return one explicit decision token and the residual limitations.

Root `pnpm lint` currently fails outside these contracts (last characterized run: 271 errors, 14 warnings, no hits in the foundational shared modules). Characterize it. Do not repair unrelated lint.

Stop instead of improvising when branch or HEAD identity differs, a destructive or production action would be required, a STABLE contract would need a semantic revision outside the phase, evidence is insufficient, external source terms are unresolved, or repository state cannot be established.

## Repository conventions

Known unrelated dirty paths. Do not clean, reset, stage, or commit them:

- `.gitignore`
- `apps/web/app/login/LoginForm.tsx`
- `apps/web/public/sw.js`
- `apps/web/public/workbox-01fd22c6.js`
- `packages/shared/src/index.ts`
- unrelated `qa-artifacts/*` from earlier preview and schema work

`.cursor/` and `.claude/` are gitignored local tooling. Canonical decisions live in `docs/`, not in ignored agent folders.

On PowerShell, pass commit messages with `git commit -m @'... '@`. Do not use a bash heredoc.

Package exports for foundational modules are subpath exports in `packages/shared/package.json`. Do not fold them into `packages/shared/src/index.ts` unless a phase owns that file.

## Recurring lessons

- A Cursor wrapper timeout can hide a command that already exited 0. Read the terminal file and Git state before classifying failure.
- Building-block tests that say “this category is still non-STABLE” must be retargeted when a block in that category is promoted. Do not weaken the assertion; point it at the next unimplemented block.
- Freshness, availability, and fitness evaluations must not mutate the source clock, observation, resource, provenance activity, or UGES assertion.
- Provider-specific ages and legal conclusions do not belong in a generic kernel. Example policies belong in tests and docs.
- Pre-commit lint-staged may rewrite staged files. That rewrite belongs in the same commit when the hook succeeds. If the hook rejects the commit, fix it with a new commit.

## Next phase boundary

`rockhounding:evidence-admission` is the active STABLE 1.0.0 gate. It answers whether candidate evidence may support a specified purpose. Offline fixture adapters are closed and remain an implementation of `rockhounding:source-adapter-contract`. Fixture success does not imply admission. Live ingestion stays closed. Network access stays prohibited.

If admission passes, the next phase is `ROCKHOUNDING_DECISION_EVIDENCE_CONTRACTS_R1`. That phase defines, for each decision class, the required domains, roles, authority, time, coverage, independence, contradiction policy, and unresolved factors. A live read-only provider waits until those contracts exist.

`.cursor/` is local orchestration configuration only. This document is the portable repository coordinator contract.
