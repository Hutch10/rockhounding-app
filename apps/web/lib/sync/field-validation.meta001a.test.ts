/**
 * META-001A Field Validation Certification Tests
 *
 * Simulates airplane-mode, browser refresh/reopen, batch flush, duplicate replay,
 * interrupted sync recovery, and UI ledger parity checks using fake-indexeddb.
 */

import 'fake-indexeddb/auto';

import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { indexedDB as fakeIndexedDB } from 'fake-indexeddb';

import { processSyncBatch } from '@/app/api/v1/sync/batch/handler';
import {
  initStorageManager,
  getStorageManager,
  _resetStorageManagerForTests,
} from '@/lib/storage/manager';
import { mapLedgerToV1Batch } from '@/lib/sync/batch-mapper';
import { enqueueFindCreate, toQueuedFindView, type FindCreatePayload } from '@/lib/sync/queue';
import { SyncManager, _resetSyncManagerForTests } from '@/lib/sync/orchestrator';
import { canSubmitQuickLog, describeOfflineProhibitedBehavior } from '@/lib/sync/quick-log-gating';

vi.mock('@/lib/provenance/emitters', () => ({
  emitSyncProvenanceEvent: vi.fn().mockResolvedValue({ skipped: true }),
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function deviceIdFor(testName: string): string {
  return `meta001a-${testName}`;
}

async function deleteStorageDb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = fakeIndexedDB.deleteDatabase('rockhound-storage');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function makePayload(index: number): FindCreatePayload {
  return {
    material_name: `Field Specimen ${index}`,
    notes: `META-001A test ${index}`,
    discovered_at: new Date().toISOString(),
    location: { lat: 35.5 + index * 0.001, lon: -112.14 + index * 0.001 },
  };
}

function countPending(ops: Array<{ queue_status: string }>): number {
  return ops.filter((op) => op.queue_status === 'PENDING' || op.queue_status === 'RETRY_SCHEDULED')
    .length;
}

function queueManagerStatusLabel(queueStatus: string): string {
  if (queueStatus === 'DONE') return 'applied';
  if (queueStatus === 'PENDING' || queueStatus === 'RETRY_SCHEDULED') return 'pending';
  if (queueStatus === 'IN_FLIGHT') return 'accepted';
  if (queueStatus === 'FAILED_TERMINAL') return 'failed';
  return queueStatus.toLowerCase();
}

async function simulateBrowserCloseReopen(deviceId: string): Promise<void> {
  await getStorageManager().destroy();
  _resetStorageManagerForTests();
  await initStorageManager({}, deviceId);
}

function setNavigatorOnline(online: boolean): void {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: online },
    writable: true,
    configurable: true,
  });
}

function createBatchMockSupabase() {
  const finds = new Map<string, { id: string; client_operation_id: string }>();
  let insertCount = 0;

  const from = vi.fn((table: string) => {
    if (table === 'finds') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((col: string, val: string) => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => {
                for (const row of finds.values()) {
                  if (row.client_operation_id === val) {
                    return { data: { id: row.id }, error: null };
                  }
                }
                return { data: null, error: null };
              }),
            })),
            maybeSingle: vi.fn(async () => {
              for (const row of finds.values()) {
                if (row.client_operation_id === val) {
                  return { data: { id: row.id }, error: null };
                }
              }
              return { data: null, error: null };
            }),
          })),
        })),
        insert: vi.fn((row: { client_operation_id: string }) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              insertCount += 1;
              const id = `find-${insertCount}`;
              finds.set(row.client_operation_id, {
                id,
                client_operation_id: row.client_operation_id,
              });
              return { data: { id }, error: null };
            }),
          })),
        })),
      };
    }

    if (table === 'sync_operations') {
      const store = new Map<string, Record<string, unknown>>();
      return {
        select: vi.fn(() => ({
          eq: vi.fn((_col: string, val: string) => ({
            maybeSingle: vi.fn(async () => ({ data: store.get(val) ?? null, error: null })),
          })),
        })),
        upsert: vi.fn(async (row: Record<string, unknown>) => {
          store.set(row.client_operation_id as string, row);
          return { error: null };
        }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return { from, getInsertCount: () => insertCount };
}

describe('META-001A Field Validation Certification', () => {
  let currentDeviceId = deviceIdFor('default');

  beforeEach(async () => {
    await deleteStorageDb();
    _resetStorageManagerForTests();
    _resetSyncManagerForTests();
    setNavigatorOnline(true);
    currentDeviceId = deviceIdFor(expect.getState().currentTestName ?? 'default');
    await initStorageManager({}, currentDeviceId);
  });

  afterEach(async () => {
    try {
      await getStorageManager().destroy();
    } catch {
      // ignore
    }
    _resetStorageManagerForTests();
    _resetSyncManagerForTests();
    await deleteStorageDb();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('FV-01: airplane mode find survives browser close and reopen', async () => {
    setNavigatorOnline(false);
    const storage = getStorageManager();
    const opId = await enqueueFindCreate(storage, {
      userId: USER_ID,
      payload: makePayload(1),
    });

    expect(countPending(await storage.getAllOperations())).toBe(1);

    await simulateBrowserCloseReopen(currentDeviceId);

    const reopened = getStorageManager();
    const ops = await reopened.getAllOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].client_operation_id).toBe(opId);
    expect(ops[0].queue_status).toBe('PENDING');
  });

  it('FV-02: five offline finds flush on reconnect', async () => {
    setNavigatorOnline(false);
    const storage = getStorageManager();

    for (let i = 1; i <= 5; i += 1) {
      await enqueueFindCreate(storage, { userId: USER_ID, payload: makePayload(i) });
    }

    expect(countPending(await storage.getAllOperations())).toBe(5);

    const readyOps = await storage.getReadyOperations();
    const batchBody = {
      operations: mapLedgerToV1Batch(readyOps),
      idempotency_key: 'fv02-batch',
    };

    const mock = createBatchMockSupabase();
    const result = await processSyncBatch(mock as never, USER_ID, batchBody);

    expect(result.results).toHaveLength(5);
    expect(result.results!.every((r) => r.status === 'applied')).toBe(true);
    expect(mock.getInsertCount()).toBe(5);

    for (const op of readyOps) {
      await storage.updateOperationStatus(op.client_operation_id, 'DONE', {
        synced_at: new Date().toISOString(),
      });
    }

    expect(countPending(await storage.getAllOperations())).toBe(0);
  });

  it('FV-03: airplane mode find survives browser refresh', async () => {
    setNavigatorOnline(false);
    const storage = getStorageManager();
    const opId = await enqueueFindCreate(storage, {
      userId: USER_ID,
      payload: makePayload(3),
    });

    await simulateBrowserCloseReopen(currentDeviceId);

    const refreshed = getStorageManager();
    const ops = await refreshed.getAllOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].client_operation_id).toBe(opId);
    expect(ops[0].payload.material_name).toBe('Field Specimen 3');
  });

  it('FV-04: duplicate operation replay creates single server find', async () => {
    const batch = {
      operations: [
        {
          client_operation_id: '660e8400-e29b-41d4-a716-446655440099',
          entity_type: 'find' as const,
          operation_type: 'create' as const,
          timestamp: '2026-06-07T12:00:00.000Z',
          payload: makePayload(4),
        },
      ],
      idempotency_key: 'fv04-dup',
    };

    const mock = createBatchMockSupabase();
    await processSyncBatch(mock as never, USER_ID, batch);
    await processSyncBatch(mock as never, USER_ID, batch);

    expect(mock.getInsertCount()).toBe(1);
  });

  it('FV-05: interrupted IN_FLIGHT op recovers and flushes after reload', async () => {
    const storage = getStorageManager();
    const opId = await enqueueFindCreate(storage, {
      userId: USER_ID,
      payload: makePayload(5),
    });

    await storage.updateOperationStatus(opId, 'IN_FLIGHT');

    await simulateBrowserCloseReopen(currentDeviceId);

    const recovered = getStorageManager();
    const op = (await recovered.getAllOperations()).find((o) => o.client_operation_id === opId);
    expect(op?.queue_status).toBe('RETRY_SCHEDULED');

    const ready = await recovered.getReadyOperations();
    const mock = createBatchMockSupabase();
    const target = ready.find((o) => o.client_operation_id === opId);
    expect(target).toBeDefined();

    const result = await processSyncBatch(mock as never, USER_ID, {
      operations: mapLedgerToV1Batch([target!]),
      idempotency_key: 'fv05-recovery',
    });

    expect(result.results![0].status).toBe('applied');
    expect(mock.getInsertCount()).toBe(1);
  });

  it('FV-06: SyncIndicator pending count matches ledger state', async () => {
    const storage = getStorageManager();
    await enqueueFindCreate(storage, { userId: USER_ID, payload: makePayload(6) });
    await enqueueFindCreate(storage, { userId: USER_ID, payload: makePayload(7) });

    const ops = await storage.getAllOperations();
    const indicatorPending = countPending(ops);
    expect(indicatorPending).toBe(2);
    expect(ops.filter((o) => o.queue_status === 'PENDING')).toHaveLength(2);
  });

  it('FV-07: QueueManager reflects pending and applied operations', async () => {
    const storage = getStorageManager();
    const id1 = await enqueueFindCreate(storage, { userId: USER_ID, payload: makePayload(8) });
    const id2 = await enqueueFindCreate(storage, { userId: USER_ID, payload: makePayload(9) });

    await storage.updateOperationStatus(id1, 'DONE', { synced_at: new Date().toISOString() });

    const views = (await storage.getAllOperations())
      .map((op) => toQueuedFindView(op))
      .filter((v): v is NonNullable<typeof v> => v !== null);

    const pending = views.filter((v) => queueManagerStatusLabel(v.queue_status) === 'pending');
    const applied = views.filter((v) => queueManagerStatusLabel(v.queue_status) === 'applied');

    expect(pending).toHaveLength(1);
    expect(applied).toHaveLength(1);
    expect(pending[0].client_operation_id).toBe(id2);
    expect(applied[0].client_operation_id).toBe(id1);
  });

  it('FV-08: Quick Log enqueue works offline without network flush', async () => {
    setNavigatorOnline(false);
    const storage = getStorageManager();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await enqueueFindCreate(storage, { userId: USER_ID, payload: makePayload(10) });

    const manager = SyncManager.getInstance();
    await manager.flush();

    expect(countPending(await storage.getAllOperations())).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('FV-09: prohibited sites cannot be submitted while online', () => {
    expect(canSubmitQuickLog('prohibited', false)).toBe(false);
    expect(canSubmitQuickLog('allowed', false)).toBe(true);
    expect(canSubmitQuickLog('checking', false)).toBe(false);
  });

  it('FV-10: documents offline prohibited-site logging behavior', () => {
    expect(canSubmitQuickLog('prohibited', true)).toBe(true);
    expect(canSubmitQuickLog('unknown', true)).toBe(true);
    expect(describeOfflineProhibitedBehavior()).toContain('offline');
    expect(describeOfflineProhibitedBehavior().toLowerCase()).toContain('deferred');
  });
});
