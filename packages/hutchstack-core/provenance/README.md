# @hutchstack/core-provenance

## Responsibility

Provenance hook contracts for post-sync audit trails and optional event emission. Complements HutchStack Harness provenance hashing without duplicating `@rockhounding/shared/hutchstack` evaluators.

**Phase 0:** Interfaces only. Rockhound `apps/web/lib/provenance/emitters.ts` (no-op stub) remains authoritative.

## Public interfaces

| Symbol              | Description                |
| ------------------- | -------------------------- |
| `ProvenanceEmitter` | Emit applied/sync events   |
| `ProvenanceRecord`  | Minimal audit record       |
| `ProvenanceHook`    | Sync batch post-apply hook |

## Dependencies

None (Phase 0). Phase 1 may reference HutchStack Harness hash types optionally.

## Extension points

| Extension         | Purpose                            |
| ----------------- | ---------------------------------- |
| `ProvenanceStore` | Persist provenance records         |
| `HashProvider`    | Delegate to Harness hash providers |
| `RetentionPolicy` | Event retention rules              |

## Relationship to HutchStack Harness (Phase 1)

| Field        | Core provenance                      | Harness (`@rockhounding/shared/hutchstack`) |
| ------------ | ------------------------------------ | ------------------------------------------- |
| Purpose      | Sync batch audit hooks               | Field discovery quality scoring             |
| Record ID    | `clientOperationId` + `serverId`     | Harness chain + policy manifest             |
| Phase 3 hook | `POST /api/v1/sync/batch` post-apply | `runHarnessEvaluation` pre-publish          |

Reference only — no merge in Phase 1.
