# Offline Fixture Adapters R1 — red-first

Command:

`pnpm exec vitest run packages/shared/src/offline-fixture-adapters.test.ts`

Result: exit 1. The suite failed to load because `./offline-fixture-adapters` did not exist.

```
FAIL  packages/shared/src/offline-fixture-adapters.test.ts
Error: Failed to load url ./offline-fixture-adapters
Test Files  1 failed (1)
Tests  no tests
```

No adapter implementation was present. Baseline before this file was 59 files / 758 tests.
