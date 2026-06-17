# @hutchstack/core-offline-ledger

## Responsibility

Durable client-side ledger for field captures when connectivity is intermittent. Manages operation enqueue, dependency ordering, queue status transitions (`PENDING` → `IN_FLIGHT` → terminal), and queue depth observability.

**Phase 0:** Interface definitions only. Rockhound `StorageManager` remains the runtime implementation.

## Public interfaces

| Symbol                   | Kind      | Description                                                      |
| ------------------------ | --------- | ---------------------------------------------------------------- |
| `OfflineLedger`          | Interface | Primary ledger contract                                          |
| `LedgerOperationSummary` | Type      | Minimal op view for sync orchestration                           |
| `QueueStatus`            | Type      | `PENDING` \| `IN_FLIGHT` \| `APPLIED` \| `FAILED` \| `CANCELLED` |
| `LedgerConfig`           | Type      | TTL, max queue depth, retry defaults                             |
| `LedgerQueueDepth`       | Type      | `{ pending, inFlight, failed }` counts                           |

### `OfflineLedger`

```typescript
enqueue(operation: LedgerEnqueueInput): Promise<string>
getReadyOperations(): Promise<LedgerOperationSummary[]>
updateOperationStatus(clientOperationId: string, status: QueueStatus): Promise<void>
getQueueDepth(): Promise<LedgerQueueDepth>
onQueueChange(listener: () => void): () => void
```

## Dependencies

| Dependency                               | Phase 0                 | Phase 1+             |
| ---------------------------------------- | ----------------------- | -------------------- |
| None (internal)                          | —                       | —                    |
| `StorageBackend` (extension)             | Adapter in domain app   | IndexedDB via `idb`  |
| `@rockhounding/shared` sync-engine types | Golden tests only (dev) | Structural alignment |

## Extension points

| Extension            | Purpose                                       |
| -------------------- | --------------------------------------------- |
| `StorageBackend`     | Pluggable persistence (IndexedDB, SQLite, RN) |
| `OperationValidator` | Reject invalid ops before enqueue             |
| `EvictionPolicy`     | TTL and max-size eviction                     |
| `EntityTypeRegistry` | Domain entity type → handler mapping metadata |

## Golden fixtures

- [`../fixtures/ledger-operation-summary.golden.json`](../fixtures/ledger-operation-summary.golden.json)

## Rockhound mapping (Phase 1)

| Core                           | Rockhound shim                                               |
| ------------------------------ | ------------------------------------------------------------ |
| `QueueItemStatusSchema`        | `@rockhounding/shared` sync-engine (`QueueItemStatus` alias) |
| `CoreQueueStatusSchema`        | Orchestrator-facing simplified status                        |
| `QUEUE_ITEM_TO_CORE_STATUS`    | Maps `DONE`→`APPLIED`, `FAILED_TERMINAL`→`FAILED`, etc.      |
| `LedgerOperationSummarySchema` | Golden fixture + future `StorageManager` adapter             |
