# Evidence Admission Engine R1 — implementation

Persistence-free gate in `packages/shared/src/evidence-admission.ts`.

`evaluateEvidenceAdmission` clones and parses the request, then returns a frozen receipt. The candidate is not written back.

Evaluation order:

1. Active quarantine, unless the policy explicitly allows it
2. Contradiction policy
3. Allowed role
4. Purpose membership
5. Domain-scoped authority minimum
6. Temporal fitness already computed by Truth Clock
7. Coverage axes
8. Absence prerequisites when the role is NEGATIVE or the purpose is ABSENCE_INFERENCE
9. Provenance completeness
10. Source Governance, only when the policy requires permitted use
11. Unique upstream lineage count
12. Availability and candidate kind

`ADMITTED` means the candidate may support the stated purpose. It does not mean the proposition is true, verified, or legally sufficient.

The engine does not call `evaluateFreshness`, does not use `Date.now()`, and does not emit a numeric score.
