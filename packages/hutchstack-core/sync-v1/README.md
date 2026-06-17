# @hutchstack/core-sync-v1

## Responsibility

Client orchestrator and server batch-handler **contracts** for idempotent sync via `POST /api/v1/sync/batch`. Preserves `client_operation_id` idempotency and per-op result reporting.

**Phase 0:** Interfaces only. Rockhound `SyncManager` and batch handler remain authoritative.

## Public interfaces

| Symbol                | Kind      | Description                                         |
| --------------------- | --------- | --------------------------------------------------- |
| `SyncBatchRequest`    | Type      | Batch request shape (mirrors Rockhound v1 contract) |
| `SyncBatchResponse`   | Type      | Batch response shape                                |
| `SyncOrchestrator`    | Interface | Client flush/heartbeat contract                     |
| `EntityHandler`       | Interface | Server-side per-entity handler                      |
| `BatchHandlerFactory` | Type      | `createBatchHandler` config (Phase 1)               |
| `SyncTransport`       | Interface | HTTP transport abstraction                          |

## Dependencies

| Package                           | Purpose                               |
| --------------------------------- | ------------------------------------- |
| `@hutchstack/core-offline-ledger` | Ledger op summaries for batch mapping |
| `@hutchstack/core-provenance`     | Optional provenance hook (Phase 1)    |

## Extension points

| Extension           | Purpose                                               |
| ------------------- | ----------------------------------------------------- |
| `EntityHandlerMap`  | Register handlers by `entity_type` + `operation_type` |
| `SyncTransport`     | Inject fetch or custom transport                      |
| `BatchMapper`       | Map ledger ops → batch request                        |
| `IdempotencyStore`  | Server-side idempotency persistence                   |
| `ProvenanceEmitter` | Post-apply provenance events                          |

## Certified invariant

```
StorageManager → SyncManager → POST /api/v1/sync/batch
```

Phase 0 does **not** alter this path. Golden fixtures validate contract compatibility.

## Golden fixtures

- [`../fixtures/sync-batch-request.golden.json`](../fixtures/sync-batch-request.golden.json)
- [`../fixtures/sync-batch-response.golden.json`](../fixtures/sync-batch-response.golden.json)
