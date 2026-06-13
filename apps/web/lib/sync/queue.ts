/**
 * Offline operation queue helpers (SYNC-003)
 *
 * Typed enqueue paths for the StorageManager operations ledger.
 */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import type { StorageManager } from '@/lib/storage/manager';

export const QUEUE_SCHEMA_VERSION = 1;

export interface FindCreatePayload {
  material_name: string;
  notes?: string | null;
  discovered_at: string;
  location: { lat: number; lon: number };
}

export interface QueuedFindOperation {
  client_operation_id: string;
  client_record_id: string;
  entity_type: 'find_log';
  operation_type: 'create';
  queue_status: 'PENDING' | 'IN_FLIGHT' | 'RETRY_SCHEDULED' | 'FAILED_TERMINAL' | 'DONE';
  payload: FindCreatePayload;
  created_at: string;
  synced_at?: string | null;
  server_id?: string | null;
  last_error_message?: string | null;
  retry_count: number;
  meta: { schemaVersion: number; idempotency_key: string };
}

function notifyQueueChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sync-queue-changed'));
  }
}

export async function enqueueFindCreate(
  storage: StorageManager,
  params: {
    userId: string;
    payload: FindCreatePayload;
    idempotencyKey?: string;
  }
): Promise<string> {
  const clientRecordId = crypto.randomUUID();
  const clientOperationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const idempotencyKey = params.idempotencyKey ?? clientOperationId;

  const operation = {
    sync_id: crypto.randomUUID(),
    user_id: params.userId,
    device_id: storage.getDeviceId(),
    entity_type: 'find_log' as const,
    entity_id: clientRecordId,
    client_operation_id: clientOperationId,
    client_record_id: clientRecordId,
    client_media_id: null,
    operation_type: 'create' as const,
    priority: 'high' as const,
    direction: 'push' as const,
    status: 'pending' as const,
    queue_status: 'PENDING' as const,
    client_version: 1,
    server_version: null,
    created_at: now,
    updated_at: now,
    synced_at: null,
    payload: params.payload,
    delta: null,
    full_entity: params.payload,
    depends_on_operation_id: null,
    blocks: [],
    retry_count: 0,
    max_retries: 5,
    next_retry_at: null,
    last_error_code: null,
    last_error_message: null,
    error_message: null,
    error_code: null,
    checksum: null,
    meta: {
      schemaVersion: QUEUE_SCHEMA_VERSION,
      idempotency_key: idempotencyKey,
    },
  };

  await storage.pushOperation(operation);
  notifyQueueChanged();
  return clientOperationId;
}

export function toQueuedFindView(op: Record<string, unknown>): QueuedFindOperation | null {
  if (op.entity_type !== 'find_log' || op.operation_type !== 'create') {
    return null;
  }

  return {
    client_operation_id: op.client_operation_id as string,
    client_record_id: op.client_record_id as string,
    entity_type: 'find_log',
    operation_type: 'create',
    queue_status: op.queue_status as QueuedFindOperation['queue_status'],
    payload: op.payload as FindCreatePayload,
    created_at: op.created_at as string,
    synced_at: (op.synced_at as string | null) ?? null,
    server_id: undefined,
    last_error_message: (op.last_error_message as string | null) ?? null,
    retry_count: (op.retry_count as number) ?? 0,
    meta: (op.meta as QueuedFindOperation['meta']) ?? {
      schemaVersion: QUEUE_SCHEMA_VERSION,
      idempotency_key: op.client_operation_id as string,
    },
  };
}
