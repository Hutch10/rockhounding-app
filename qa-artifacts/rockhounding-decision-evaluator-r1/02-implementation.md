# Implementation

Decision Evaluator R1 lives in `packages/shared/src/decision-evaluator.ts`.

`evaluateDecision` validates a Decision Snapshot, pins the rule-set version, and applies a completeness gate before synthetic rule effects. It does not call adapters, Evidence Admission, Truth Clock, Source Governance, or UGES.

`rockhounding:decision-evaluator` is registered STABLE 1.0.0 in `DECISION_MODEL` with REFERENCES to decision-snapshot, decision-evidence-contract, evidence-admission, truth-clock, and provenance-activity. Other STABLE versions are unchanged. `rockhounding:evidence-availability` stays DRAFT.
