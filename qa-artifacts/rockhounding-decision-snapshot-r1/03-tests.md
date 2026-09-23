# Tests

`packages/shared/src/decision-snapshot.test.ts` covers identity, exact contract version, context references, evidence and receipt preservation, canonical order, completeness statuses, gaps, contradictions without a winner, temporal freeze, outcome absence, deep freeze, supersession, replay metadata, reanalysis separation, hashing, collection permission, field-visit readiness, and historical geology.

Registry and coordinator assertions require STABLE 1.0.0, a remaining DRAFT row, unchanged sibling versions, uppercase CLOSED for Decision Evidence Contracts, active Decision Snapshot, closed live ingestion, and `ROCKHOUNDING_DECISION_EVALUATOR_R1`.

Full `pnpm test:ci`: 63 files, 813 tests, exit 0. Prior baseline was 62 files, 806 tests.
