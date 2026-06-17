/**
 * @hutchstack/core-sync-v1 — Phase 1 contract extraction.
 */

export const PACKAGE_VERSION = '0.1.0-phase1';

export {
  SyncOperationStatusSchema,
  SyncBatchOperationSchema,
  SyncBatchRequestSchema,
  SyncBatchResultSchema,
  SyncBatchResponseSchema,
  type SyncOperationStatus,
  type SyncBatchOperation,
  type SyncBatchRequest,
  type SyncBatchResult,
  type SyncBatchResponse,
} from './contract';

export type SyncTransport = {
  postBatch(
    url: string,
    request: import('./contract').SyncBatchRequest
  ): Promise<import('./contract').SyncBatchResponse>;
};

export interface SyncOrchestratorConfig {
  batchUrl: string;
  heartbeatMs?: number;
  transport: SyncTransport;
}

export interface SyncOrchestrator {
  processQueue(): Promise<void>;
  startHeartbeat(intervalMs: number): void;
  stopHeartbeat(): void;
}

export interface EntityHandlerContext {
  userId: string;
  clientOperationId: string;
}

export interface EntityHandler<TPayload = unknown> {
  entityType: string;
  operationType: 'create' | 'update' | 'delete';
  handle(payload: TPayload, ctx: EntityHandlerContext): Promise<{ serverId: string }>;
}

export interface BatchHandlerConfig {
  handlers: EntityHandler[];
  idempotencyStore?: unknown;
  provenanceEmitter?: unknown;
}

export type { BatchMapper, EntityHandlerMap, IdempotencyStore } from './extension-points';

export type { LedgerOperationSummary } from '@hutchstack/core-offline-ledger';
