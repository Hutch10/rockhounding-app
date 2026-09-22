# Offline Fixture Adapters R1 — tests

`pnpm test:ci`: 60 files, 781 tests, exit 0.

Baseline before this phase: 59 files, 758 tests.

Added `packages/shared/src/offline-fixture-adapters.test.ts` (23 tests) covering fixture infrastructure, geology, observation, sample, truth clock, coverage, governance, authority, unknown semantics, source version, provenance, determinism, and network/admission boundaries.

Replay of the fixture catalog is deterministic. Repeated runs match status, adapter result, and activity hash.
