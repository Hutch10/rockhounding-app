# Decision Evidence Contracts R1 — implementation

Persistence-free contracts in `packages/shared/src/decision-evidence-contracts.ts`.

`evaluateDecisionEvidenceContract` clones the contract, admitted bundles, and caller context. It evaluates each requirement from Evidence Admission receipts, then aggregates groups.

A receipt counts only when its decision is `ADMITTED` or `ADMITTED_WITH_LIMITATIONS` and its domain and purpose match the requirement. Completeness is not a field outcome.

Builtin contracts cover collection permission, site access, route access, closure, safety, geological context, geological opportunity, mining claims, land ownership, land management, specimen identification, and field-visit readiness.
