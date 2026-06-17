/**
 * @hutchstack/core-offline-ledger — Phase 1 contract extraction.
 */

export const PACKAGE_VERSION = '0.1.0-phase1';

export {
  QueueItemStatusSchema,
  CoreQueueStatusSchema,
  QUEUE_ITEM_TO_CORE_STATUS,
  LedgerOperationSummarySchema,
  type QueueItemStatus,
  type CoreQueueStatus,
  type LedgerOperationSummaryContract,
} from './queue-contract';

/** Simplified Core queue status (alias). */
export type QueueStatus = import('./queue-contract').CoreQueueStatus;

/** Minimal operation view passed to sync orchestrator. */
export interface LedgerOperationSummary {
  client_operation_id: string;
  entity_type: string;
  operation_type: 'create' | 'update' | 'delete';
  queue_status: QueueStatus;
  priority: number;
  depends_on_operation_id: string | null;
  retry_count: number;
  created_at: string;
}

export interface LedgerEnqueueInput {
  client_operation_id: string;
  entity_type: string;
  operation_type: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  priority?: number;
  depends_on_operation_id?: string | null;
}

export interface LedgerQueueDepth {
  pending: number;
  inFlight: number;
  failed: number;
  total: number;
}

export interface LedgerConfig {
  maxQueueDepth: number;
  defaultMaxRetries: number;
  operationTtlMs: number | null;
}

export interface OfflineLedger {
  enqueue(operation: LedgerEnqueueInput): Promise<string>;
  getReadyOperations(): Promise<LedgerOperationSummary[]>;
  updateOperationStatus(clientOperationId: string, status: QueueStatus): Promise<void>;
  getQueueDepth(): Promise<LedgerQueueDepth>;
  onQueueChange(listener: () => void): () => void;
}

export type {
  StorageBackend,
  OperationValidator,
  EvictionPolicy,
  EntityTypeRegistry,
  EntityTypeRegistration,
} from './extension-points';
