# HutchStack Core — Phase 1 Contract Extraction Report

**Date:** 2026-06-07  
**Status:** COMPLETE  
**Verdict:** PASS — no runtime behavior changes; public contracts backward-compatible

---

## Summary

Phase 1 moved Zod contract schemas from `@rockhounding/shared` into HutchStack Core packages and wired **shim re-exports** so Rockhound imports remain unchanged. No production runtime migration (`StorageManager`, `SyncManager`, batch handler untouched).

---

## Extracted contracts

| Core package                      | Schemas / artifacts moved                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@hutchstack/core-sync-v1`        | `SyncOperationStatusSchema`, `SyncBatchRequestSchema`, `SyncBatchResponseSchema`                 |
| `@hutchstack/core-telemetry`      | `BaseTelemetryEventSchema`, event union, `TelemetryBatchSchema`, `FIELD_OPS_EVENT_CATALOG`       |
| `@hutchstack/core-offline-ledger` | `QueueItemStatusSchema`, `CoreQueueStatusSchema`, `LedgerOperationSummarySchema`, status mapping |

## Rockhound shims (approved)

| File                                 | Re-exports from                                                  |
| ------------------------------------ | ---------------------------------------------------------------- |
| `packages/shared/src/v1-contract.ts` | `@hutchstack/core-sync-v1`                                       |
| `packages/shared/src/telemetry.ts`   | `@hutchstack/core-telemetry` (contracts); helpers stay in shared |
| `packages/shared/src/sync-engine.ts` | `@hutchstack/core-offline-ledger` (`QueueItemStatus`)            |

## Policy YAML fixtures (docs preserved)

| Fixture                                     | Source doc                     |
| ------------------------------------------- | ------------------------------ |
| `fixtures/policy/dashboard-base.yaml`       | Ops plan §2                    |
| `fixtures/policy/alerts-base.yaml`          | Ops plan §3                    |
| `fixtures/policy/meta-003.yaml`             | META-003 gate                  |
| `fixtures/policy/regression-base.yaml`      | Ops plan §5 (R-01, R-02, R-09) |
| `fixtures/policy/rockhound-regression.yaml` | Rockhound extensions           |
| `fixtures/policy/readiness-v1.yaml`         | Ops plan §6                    |
| `fixtures/policy/incidents-base.yaml`       | Ops plan §3.3                  |

Original markdown docs **not replaced**.

---

## Verification results

| Gate                                    | Result                                             |
| --------------------------------------- | -------------------------------------------------- |
| `pnpm test:core`                        | **38/38 PASS**                                     |
| `pnpm build:core`                       | PASS                                               |
| `pnpm type-check:core`                  | PASS                                               |
| Sprint 3 regression (18 tests)          | **18/18 PASS**                                     |
| Sprint 4 E2E (6 tests)                  | **6/6 PASS**                                       |
| Boundary (apps/web no core imports)     | PASS                                               |
| Shim parity (Core ≡ shared schema refs) | PASS                                               |
| `telemetry.test.ts`                     | **13/13 PASS** (UUID fixtures aligned to contract) |

---

## Certified invariant

```
StorageManager → SyncManager → POST /api/v1/sync/batch
```

Unchanged. `orchestrator.ts` and batch route not modified.

---

## Out of scope (Phase 2+)

- Runtime adapter migration
- `hutchstack-cli certify evaluate`
- Telemetry wiring in Quick Log / Field Mode

---

## Next phase

Phase 2: wrap `StorageManager` / `SyncManager` with Core interfaces behind adapters (META-001A gate required).
