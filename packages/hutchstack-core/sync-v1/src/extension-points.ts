import type { LedgerOperationSummary } from '@hutchstack/core-offline-ledger';

import type { SyncBatchRequest } from './index';

/** Maps ledger operations to v1 batch request. Rockhound: mapLedgerToV1Batch. */
export interface BatchMapper {
  mapToBatch(operations: LedgerOperationSummary[]): SyncBatchRequest['operations'];
}

/** Registry of entity handlers keyed by entity_type. */
export interface EntityHandlerMap {
  register(entityType: string, operationType: string, handler: unknown): void;
  get(entityType: string, operationType: string): unknown;
}

/** Server-side idempotency persistence (Phase 1). */
export interface IdempotencyStore {
  hasProcessed(clientOperationId: string): Promise<boolean>;
  markProcessed(clientOperationId: string, serverId: string | null): Promise<void>;
}

export interface ProvenanceEmitter {
  emitApplied(clientOperationId: string, serverId: string, entityType: string): Promise<void>;
}
