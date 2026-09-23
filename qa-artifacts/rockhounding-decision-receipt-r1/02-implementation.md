# Implementation

Decision Receipt R1 lives in `packages/shared/src/decision-receipt.ts`.

`createDecisionReceipt` validates an existing Decision Evaluation Result against its snapshot id and hash, then freezes the outcome, reasons, limitations, rule-set version, and evaluator version. It does not call `evaluateDecision`.

`rockhounding:decision-receipt` is registered STABLE 1.0.0 in `DECISION_MODEL` with REFERENCES to decision-evaluator, decision-snapshot, decision-evidence-contract, and provenance-activity. Other STABLE versions are unchanged. `rockhounding:evidence-availability` stays DRAFT.
