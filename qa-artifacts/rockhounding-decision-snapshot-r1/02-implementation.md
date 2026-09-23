# Implementation

Decision Snapshot R1 lives in `packages/shared/src/decision-snapshot.ts`.

`createDecisionSnapshot` consumes a supplied Decision Evidence Contract evaluation and already-produced admission bundles. It does not call the contract evaluator, Evidence Admission, or Truth Clock.

The result is validated, canonically ordered, SHA-256 hashed under `canonical-decision-snapshot-v1`, and deep-frozen. No persistence.

`rockhounding:decision-snapshot` is registered STABLE 1.0.0 in `DECISION_MODEL` with REFERENCES to decision-evidence-contract, evidence-admission, truth-clock, and provenance-activity. The DRAFT 0.1.0 row remains. `rockhounding:evidence-availability` stays DRAFT.

Existing assertions that every `DECISION_MODEL` block is non-STABLE were retargeted to `AVAILABILITY_MODEL`, which is the remaining unimplemented placeholder.
