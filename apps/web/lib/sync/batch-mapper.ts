/**
 * Maps StorageManager ledger operations to V1 sync batch contract.
 */

import type { SyncBatchRequest } from '@rockhounding/shared';

type LedgerOperation = {
  client_operation_id: string;
  entity_type: string;
  operation_type: string;
  payload: unknown;
  created_at: string;
};

type V1EntityType = NonNullable<SyncBatchRequest['operations']>[number]['entity_type'];
type V1OperationType = NonNullable<SyncBatchRequest['operations']>[number]['operation_type'];

const V1_ENTITY_MAP: Record<string, V1EntityType> = {
  find_log: 'find',
  find: 'find',
};

const V1_OP_MAP: Record<string, V1OperationType> = {
  UPSERT_FIND: 'create',
  create: 'create',
  update: 'update',
  delete: 'delete',
};

export function mapLedgerToV1Batch(
  operations: LedgerOperation[]
): NonNullable<SyncBatchRequest['operations']> {
  return operations.map((op) => ({
    client_operation_id: op.client_operation_id,
    entity_type: V1_ENTITY_MAP[op.entity_type] ?? 'find',
    operation_type: V1_OP_MAP[op.operation_type] ?? 'create',
    payload: op.payload,
    timestamp: op.created_at,
  }));
}
