# Decision Snapshot R1 — red-first

Command:

`pnpm exec vitest run packages/shared/src/decision-snapshot.test.ts`

Result: exit 1. The suite failed to load because `./decision-snapshot` did not exist.

Baseline before the suite was 62 files / 806 tests.
