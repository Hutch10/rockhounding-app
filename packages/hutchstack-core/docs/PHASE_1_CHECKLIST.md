# HutchStack Core — Phase 1 Extraction Checklist

**Scope:** Move Zod schemas and types to Core; Rockhound re-exports via shim. **No runtime migration.**  
**Status:** COMPLETE (2026-06-07) — see [PHASE_1_REPORT.md](./PHASE_1_REPORT.md)

## Pre-flight

- [x] Phase 0 tests green (`pnpm test:core`)
- [x] Boundary test green
- [x] Golden fixtures committed and frozen
- [x] Baseline: Sprint 3 regression 18/18 PASS

## 1. `@hutchstack/core-sync-v1`

- [x] Copy `SyncBatchRequestSchema`, `SyncBatchResponseSchema`, `SyncOperationStatusSchema` to Core
- [x] Add `zod` dependency to Core package
- [x] Golden tests parse fixtures with **Core** schemas
- [x] `@rockhounding/shared` re-exports from Core (shim, identical exports)
- [x] `apps/web/app/api/v1/sync/batch/route.test.ts` unchanged (4/4 PASS)

## 2. `@hutchstack/core-offline-ledger`

- [x] Extract queue status types aligned with `QueueItemStatus` from sync-engine
- [x] Document mapping table in package README
- [x] Golden fixture validates against extracted types
- [x] **Do not** move `StorageManager` implementation

## 3. `@hutchstack/core-telemetry`

- [x] Copy `BaseTelemetryEventSchema`, `TelemetryBatchSchema`, category/severity enums
- [x] Copy field-ops event catalog constants (ops plan §2.2)
- [x] `@rockhounding/shared` re-export shim
- [x] `telemetry.test.ts` in shared passes (13/13)

## 4. `@hutchstack/core-field-telemetry`

- [x] Aggregation rollup types only (no aggregator move)
- [x] Link event catalog entries for `quick_log_completed`, `sync_queue_depth`

## 5. `@hutchstack/core-provenance`

- [x] Align `ProvenanceRecord` with Harness types (reference doc only)
- [x] Document hook registration point for sync batch handler (Phase 3)

## 6. `@hutchstack/core-ops`

- [x] Convert ops plan §2 panels to `dashboard-base.yaml`
- [x] Convert ops plan §3 alerts to `alerts-base.yaml`
- [x] Golden JSON fixtures match YAML structure

## 7. `@hutchstack/core-ops-incident`

- [x] Convert P0/P1 incident templates from ops plan
- [x] Golden fixture parity

## 8. `@hutchstack/core-certification`

- [x] Convert `META-003` gate to `meta-003.yaml`
- [x] Define `GateEvaluator` stub (`evaluateGateStub`, read-only)

## 9. `@hutchstack/core-regression`

- [x] Convert R-01, R-02, R-09 base watchlist YAML
- [x] Rockhound extends with `rockhound-regression.yaml`

## 10. `@hutchstack/core-readiness`

- [x] Convert V1.0 scorecard from ops plan §6
- [x] Link gates to certification YAML ids

## Exit criteria (Phase 1 complete)

| Check                              | Command / evidence          |
| ---------------------------------- | --------------------------- |
| Core schemas parse golden fixtures | `pnpm test:core` — 38/38    |
| Rockhound public API unchanged     | Sprint 3 18/18, shim parity |
| Sync batch contract identical      | golden + route tests        |
| No Rockhound runtime imports Core  | boundary test               |
| Type-check clean                   | `pnpm type-check:core`      |

## Explicitly out of scope (Phase 2+)

- Moving `StorageManager`, `SyncManager`, batch handler implementations
- Changing `POST /api/v1/sync/batch` URL or auth
- Wiring telemetry events in Quick Log / Field Mode
- `hutchstack-cli certify evaluate` CLI
