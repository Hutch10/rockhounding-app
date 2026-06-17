# HutchStack Core

Reusable field-platform modules extracted from Rockhound operational maturity. **Phase 0** provides package scaffolding, interface definitions, documentation, and golden compatibility tests only — no production code migration.

## Packages

| Package                                                 | Responsibility                                |
| ------------------------------------------------------- | --------------------------------------------- |
| [`@hutchstack/core-offline-ledger`](./offline-ledger)   | Client-side durable operation queue           |
| [`@hutchstack/core-sync-v1`](./sync-v1)                 | Idempotent batch sync orchestration contracts |
| [`@hutchstack/core-telemetry`](./telemetry)             | Versioned telemetry event contract            |
| [`@hutchstack/core-field-telemetry`](./field-telemetry) | Field-session aggregation and flush patterns  |
| [`@hutchstack/core-provenance`](./provenance)           | Provenance hook contracts for sync and audit  |
| [`@hutchstack/core-ops`](./ops)                         | Dashboard specs, alert rules (policy-as-code) |
| [`@hutchstack/core-ops-incident`](./ops-incident)       | Incident response templates and lifecycle     |
| [`@hutchstack/core-certification`](./certification)     | Milestone gate and sign-off framework         |
| [`@hutchstack/core-regression`](./regression)           | Pre-promote regression watchlist framework    |
| [`@hutchstack/core-readiness`](./readiness)             | Release readiness scorecards                  |

## Phase 0 constraints

- No Rockhound runtime changes
- Certified sync invariant unchanged: `StorageManager` → `SyncManager` → `POST /api/v1/sync/batch`
- Public contracts in `@rockhounding/shared` unchanged

## Documentation

- [Phase 0 record](./docs/PHASE_0.md)
- [Dependency graph](./docs/DEPENDENCY_GRAPH.md)
- [Risk assessment](./docs/RISK_ASSESSMENT.md)
- [Phase 1 extraction checklist](./docs/PHASE_1_CHECKLIST.md)
- [Platform extraction plan](../../docs/hutchstack/HUTCHSTACK_CORE_PLATFORM_EXTRACTION.md)

## Golden fixtures

Shared compatibility fixtures live in [`fixtures/`](./fixtures/). Tests validate fixtures against Rockhound contracts without migrating schemas.
