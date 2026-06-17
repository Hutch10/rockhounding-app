/**
 * HutchStack Core offline ledger queue contract (Phase 1).
 * Aligned with Rockhound sync-engine QueueItemStatus.
 */
import { z } from 'zod';

/** Rockhound StorageManager queue item status (sync-engine source). */
export const QueueItemStatusSchema = z.enum([
  'PENDING',
  'IN_FLIGHT',
  'RETRY_SCHEDULED',
  'FAILED_TERMINAL',
  'DONE',
]);

export type QueueItemStatus = z.infer<typeof QueueItemStatusSchema>;

/** Simplified Core queue status for orchestrator and ops dashboards. */
export const CoreQueueStatusSchema = z.enum([
  'PENDING',
  'IN_FLIGHT',
  'APPLIED',
  'FAILED',
  'CANCELLED',
]);

export type CoreQueueStatus = z.infer<typeof CoreQueueStatusSchema>;

/** Maps Rockhound queue item status → Core queue status. */
export const QUEUE_ITEM_TO_CORE_STATUS: Record<QueueItemStatus, CoreQueueStatus> = {
  PENDING: 'PENDING',
  IN_FLIGHT: 'IN_FLIGHT',
  RETRY_SCHEDULED: 'PENDING',
  FAILED_TERMINAL: 'FAILED',
  DONE: 'APPLIED',
};

export const LedgerOperationSummarySchema = z.object({
  client_operation_id: z.string().uuid(),
  entity_type: z.string(),
  operation_type: z.enum(['create', 'update', 'delete']),
  queue_status: CoreQueueStatusSchema,
  priority: z.number(),
  depends_on_operation_id: z.string().uuid().nullable(),
  retry_count: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
});

export type LedgerOperationSummaryContract = z.infer<typeof LedgerOperationSummarySchema>;
