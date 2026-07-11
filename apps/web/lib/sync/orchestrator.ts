/* eslint-disable @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-unnecessary-condition */
/**
 * Offline Sync Orchestrator (SYNC-002)
 *
 * Single path: StorageManager ledger → POST /api/v1/sync/batch
 */

import { SyncBatchResponseSchema, type SyncBatchResponse } from '@rockhounding/shared';

import { ensureStorageManager, getStorageManager } from '@/lib/storage/manager';
import { mapLedgerToV1Batch } from '@/lib/sync/batch-mapper';

export class SyncManager {
  private static instance: SyncManager;
  private isProcessing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  startHeartbeat(intervalMs = 15000): void {
    if (this.syncInterval) clearInterval(this.syncInterval);

    this.flush();

    this.syncInterval = setInterval(() => {
      this.flush();
    }, intervalMs);
  }

  stopHeartbeat(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /** Immediate queue flush — used on reconnect and manual retry. */
  flush(): Promise<void> {
    return this.processQueue();
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const storage = await ensureStorageManager();
    if (!storage) return;

    let readyOps: Awaited<ReturnType<typeof storage.getReadyOperations>>;
    try {
      readyOps = await storage.getReadyOperations();
    } catch {
      return;
    }

    if (readyOps.length === 0) return;

    this.isProcessing = true;
    console.log(`SyncManager: Processing ${readyOps.length} ready operations.`);

    try {
      for (const op of readyOps) {
        await storage.updateOperationStatus(op.client_operation_id, 'IN_FLIGHT');
      }

      const batchRequest = {
        operations: mapLedgerToV1Batch(readyOps),
        idempotency_key: crypto.randomUUID(),
      };

      const response = await fetch('/api/v1/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(batchRequest),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Sync failed: ${response.statusText}`);
      }

      const result = SyncBatchResponseSchema.parse(await response.json());
      await this.handleSyncResults(result, readyOps);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Network/Server Error';
      console.error('SyncManager: Batch process failed:', message);
      for (const op of readyOps) {
        await this.handleFailure(op, message);
      }
    } finally {
      this.isProcessing = false;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sync-queue-changed'));
      }
    }
  }

  private async handleSyncResults(
    response: SyncBatchResponse,
    sentOps: Array<Record<string, unknown>>
  ): Promise<void> {
    const storage = getStorageManager();

    for (const result of response.results ?? []) {
      const originalOp = sentOps.find((o) => o.client_operation_id === result.client_operation_id);
      if (!originalOp) continue;

      if (result.status === 'applied') {
        await this.handleSuccess(originalOp, result.server_id ?? null);
      } else {
        await this.handleFailure(originalOp, result.error || 'Unknown failure');
      }
    }
  }

  private async handleSuccess(op: Record<string, unknown>, serverId: string | null): Promise<void> {
    const storage = getStorageManager();

    await storage.updateOperationStatus(op.client_operation_id as string, 'DONE', {
      synced_at: new Date().toISOString(),
    });

    if (serverId) {
      await storage.setMapping(op.client_record_id as string, serverId, 'find_log');
    }

    await this.updateRecordSyncStatus(op.client_record_id as string);
  }

  private async handleFailure(op: Record<string, unknown>, error: string): Promise<void> {
    const storage = getStorageManager();
    const newRetryCount = ((op.retry_count as number) || 0) + 1;

    if (newRetryCount >= ((op.max_retries as number) || 5)) {
      await storage.updateOperationStatus(op.client_operation_id as string, 'FAILED_TERMINAL', {
        last_error_message: error,
        last_error_code: 'MAX_RETRIES_EXCEEDED',
      });
      await this.updateRecordSyncStatus(op.client_record_id as string);
    } else {
      const backoffSec = Math.pow(2, newRetryCount) + Math.random();
      const nextRetryAt = new Date(Date.now() + backoffSec * 1000).toISOString();

      await storage.updateOperationStatus(op.client_operation_id as string, 'RETRY_SCHEDULED', {
        retry_count: newRetryCount,
        next_retry_at: nextRetryAt,
        last_error_message: error,
      });
    }
  }

  async updateRecordSyncStatus(clientRecordId: string): Promise<void> {
    const storage = getStorageManager();
    const ops = await storage.getOperationsByRecordId(clientRecordId);

    if (ops.length === 0) return;

    if (ops.some((op) => op.queue_status === 'FAILED_TERMINAL')) {
      await storage.updateEntitySyncStatus('find_log', clientRecordId, 'SYNC_FAILED');
      return;
    }

    const upsertDone = ops.some(
      (op) =>
        (op.operation_type === 'create' || op.operation_type === 'UPSERT_FIND') &&
        op.queue_status === 'DONE'
    );

    const newState = upsertDone ? 'APPLIED' : 'SYNCING_METADATA';
    await storage.updateEntitySyncStatus('find_log', clientRecordId, newState);
  }
  static resetForTests(): void {
    if (SyncManager.instance) {
      SyncManager.instance.stopHeartbeat();
    }
    SyncManager.instance = undefined as unknown as SyncManager;
  }
}

export const syncManager = SyncManager.getInstance();

/** Test-only: reset singleton between vitest cases. */
export function _resetSyncManagerForTests(): void {
  SyncManager.resetForTests();
}
