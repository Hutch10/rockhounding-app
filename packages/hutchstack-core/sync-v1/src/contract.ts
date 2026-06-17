/**
 * HutchStack Core sync-v1 batch contract (Phase 1).
 * Source of truth for Rockhound @rockhounding/shared v1-contract shim.
 */
import { z } from 'zod';

export const SyncOperationStatusSchema = z.enum(['pending', 'accepted', 'applied', 'failed']);
export type SyncOperationStatus = z.infer<typeof SyncOperationStatusSchema>;

export const SyncBatchOperationSchema = z.object({
  client_operation_id: z.string().uuid(),
  entity_type: z.enum(['find', 'trip', 'profile', 'location_suggest']),
  operation_type: z.enum(['create', 'update', 'delete']),
  payload: z.any(),
  timestamp: z.string().datetime(),
});

export type SyncBatchOperation = z.infer<typeof SyncBatchOperationSchema>;

export const SyncBatchRequestSchema = z.object({
  operations: z.array(SyncBatchOperationSchema),
  idempotency_key: z.string(),
});

export type SyncBatchRequest = z.infer<typeof SyncBatchRequestSchema>;

export const SyncBatchResultSchema = z.object({
  client_operation_id: z.string().uuid(),
  server_id: z.string().uuid().nullable(),
  status: SyncOperationStatusSchema,
  error: z.string().nullable(),
});

export type SyncBatchResult = z.infer<typeof SyncBatchResultSchema>;

export const SyncBatchResponseSchema = z.object({
  results: z.array(SyncBatchResultSchema),
});

export type SyncBatchResponse = z.infer<typeof SyncBatchResponseSchema>;
