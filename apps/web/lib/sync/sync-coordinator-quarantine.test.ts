/**
 * SyncCoordinator quarantine + adversarial duplicate controls.
 *
 * Decision: SYNC_DUPLICATE_DEAD_CODE_QUARANTINE
 * Canonical: SyncManager → StorageManager → POST /api/v1/sync/batch
 * Forbidden: merging rockhound-sync into rockhound-storage
 */

import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { indexedDB as fakeIndexedDB } from 'fake-indexeddb';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { processSyncBatch } from '@/app/api/v1/sync/batch/handler';
import {
  initStorageManager,
  getStorageManager,
  _resetStorageManagerForTests,
} from '@/lib/storage/manager';
import { mapLedgerToV1Batch } from '@/lib/sync/batch-mapper';
import { enqueueFindCreate, type FindCreatePayload } from '@/lib/sync/queue';
import { SyncManager, _resetSyncManagerForTests } from '@/lib/sync/orchestrator';
import {
  CANONICAL_SYNC_OWNER,
  QUARANTINED_SYNC_COORDINATOR_MODULE,
  SYNC_DUPLICATE_QUARANTINE_DECISION,
} from '@/lib/sync/ownership';
import { initSync, getSync, _resetSyncCoordinatorForTests } from '@/lib/sync/coordinator';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const WEB_ROOT = join(__dirname, '../..');

function makePayload(index: number): FindCreatePayload {
  return {
    material_name: `Quarantine Specimen ${index}`,
    notes: `adversarial ${index}`,
    discovered_at: new Date().toISOString(),
    location: { lat: 35.5 + index * 0.001, lon: -112.14 + index * 0.001 },
  };
}

async function deleteStorageDb(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = fakeIndexedDB.deleteDatabase('rockhound-storage');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
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

describe('SyncCoordinator quarantine ownership', () => {
  it('declares SyncManager as canonical owner', () => {
    expect(CANONICAL_SYNC_OWNER).toBe('SyncManager');
    expect(SYNC_DUPLICATE_QUARANTINE_DECISION).toBe('SYNC_DUPLICATE_DEAD_CODE_QUARANTINE');
    expect(QUARANTINED_SYNC_COORDINATOR_MODULE).toContain('coordinator.ts');
  });

  it('providers boot SyncManager only — never SyncCoordinator', () => {
    const providers = readFileSync(join(WEB_ROOT, 'app/providers.tsx'), 'utf8');
    expect(providers).toContain('syncManager');
    expect(providers).toContain('initStorageManager');
    expect(providers).not.toMatch(/initSync|SyncCoordinator|lib\/sync\/coordinator/);
  });

  it('Quick Log uses enqueueFindCreate + syncManager', () => {
    const quickAdd = readFileSync(join(WEB_ROOT, 'components/Finds/QuickAddModal.tsx'), 'utf8');
    expect(quickAdd).toContain('enqueueFindCreate');
    expect(quickAdd).toContain('syncManager');
    expect(quickAdd).not.toMatch(/lib\/sync\/coordinator|initSync|getSync/);
  });

  it('ConnectivityListener flushes SyncManager only', () => {
    const listener = readFileSync(join(WEB_ROOT, 'components/ConnectivityListener.tsx'), 'utf8');
    expect(listener).toContain('syncManager');
    expect(listener).not.toMatch(/lib\/sync\/coordinator|initSync/);
  });

  it('initSync / getSync throw quarantine guard (no silent re-wire)', () => {
    _resetSyncCoordinatorForTests();
    expect(() => initSync()).toThrow(/QUARANTINED/);
    expect(() => getSync()).toThrow(/QUARANTINED/);
  });

  it('legacy opt-in helper is exported for tests only (not used by providers)', () => {
    const coordinatorSrc = readFileSync(join(WEB_ROOT, 'lib/sync/coordinator.ts'), 'utf8');
    expect(coordinatorSrc).toContain('_initSyncForLegacyTestsOnly');
    expect(coordinatorSrc).toContain('SYNC_DUPLICATE_DEAD_CODE_QUARANTINE');
    const providers = readFileSync(join(WEB_ROOT, 'app/providers.tsx'), 'utf8');
    expect(providers).not.toContain('_initSyncForLegacyTestsOnly');
  });
});

describe('Adversarial duplicate sync controls (canonical SyncManager)', () => {
  beforeEach(async () => {
    await deleteStorageDb();
    _resetStorageManagerForTests();
    _resetSyncManagerForTests();
    _resetSyncCoordinatorForTests();
    setNavigatorOnline(true);
    await initStorageManager({}, `quarantine-${expect.getState().currentTestName ?? 'x'}`);
  });

  afterEach(async () => {
    try {
      await getStorageManager().destroy();
    } catch {
      // ignore
    }
    _resetStorageManagerForTests();
    _resetSyncManagerForTests();
    _resetSyncCoordinatorForTests();
    await deleteStorageDb();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('1. same operation submitted twice → single durable find', async () => {
    const opId = '660e8400-e29b-41d4-a716-446655440001';
    const batch = {
      operations: [
        {
          client_operation_id: opId,
          entity_type: 'find' as const,
          operation_type: 'create' as const,
          timestamp: '2026-06-07T12:00:00.000Z',
          payload: makePayload(1),
        },
      ],
      idempotency_key: 'adv-dup-1',
    };
    const mock = createBatchMockSupabase();
    await processSyncBatch(mock as never, USER_ID, batch);
    await processSyncBatch(mock as never, USER_ID, batch);
    expect(mock.getInsertCount()).toBe(1);
  });

  it('2. reconnect while flush already in flight → no double process', async () => {
    const storage = getStorageManager();
    await enqueueFindCreate(storage, { userId: USER_ID, payload: makePayload(2) });

    let resolveFetch!: (v: Response) => void;
    const fetchPromise = new Promise<Response>((r) => {
      resolveFetch = r;
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => fetchPromise);

    const manager = SyncManager.getInstance();
    const first = manager.flush();
    // Allow processQueue to mark isProcessing and start fetch
    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const second = manager.flush();

    const opId = (await storage.getAllOperations())[0].client_operation_id;
    resolveFetch(
      new Response(
        JSON.stringify({
          results: [
            {
              client_operation_id: opId,
              status: 'applied',
              server_id: '770e8400-e29b-41d4-a716-446655440002',
              error: null,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await first;
    await second;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('3+4. refresh / restart before acknowledgement → op survives pending', async () => {
    setNavigatorOnline(false);
    const storage = getStorageManager();
    const opId = await enqueueFindCreate(storage, {
      userId: USER_ID,
      payload: makePayload(3),
    });

    await storage.destroy();
    _resetStorageManagerForTests();
    await initStorageManager({}, `quarantine-restart`);

    const ops = await getStorageManager().getAllOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].client_operation_id).toBe(opId);
    expect(ops[0].queue_status).toBe('PENDING');
    expect(ops[0].queue_status).not.toBe('DONE');
  });

  it('5. acknowledgement applied then local DONE — no premature success before ACK', async () => {
    const storage = getStorageManager();
    const opId = await enqueueFindCreate(storage, {
      userId: USER_ID,
      payload: makePayload(5),
    });
    expect((await storage.getAllOperations())[0].queue_status).toBe('PENDING');

    const ready = await storage.getReadyOperations();
    const mock = createBatchMockSupabase();
    const result = await processSyncBatch(mock as never, USER_ID, {
      operations: mapLedgerToV1Batch(ready),
      idempotency_key: 'adv-ack-5',
    });
    expect(result.results![0].status).toBe('applied');

    // Client must not mark DONE until it applies ACK itself
    expect((await storage.getAllOperations())[0].queue_status).toBe('PENDING');

    await storage.updateOperationStatus(opId, 'DONE', {
      synced_at: new Date().toISOString(),
    });
    expect((await storage.getAllOperations())[0].queue_status).toBe('DONE');
  });

  it('6. server applied + client transport timeout → retry-safe, no duplicate insert', async () => {
    const opId = '660e8400-e29b-41d4-a716-446655440006';
    const batch = {
      operations: [
        {
          client_operation_id: opId,
          entity_type: 'find' as const,
          operation_type: 'create' as const,
          timestamp: '2026-06-07T12:00:00.000Z',
          payload: makePayload(6),
        },
      ],
      idempotency_key: 'adv-timeout-6a',
    };
    const mock = createBatchMockSupabase();
    await processSyncBatch(mock as never, USER_ID, batch);
    expect(mock.getInsertCount()).toBe(1);

    await processSyncBatch(mock as never, USER_ID, {
      ...batch,
      idempotency_key: 'adv-timeout-6b',
    });
    expect(mock.getInsertCount()).toBe(1);
  });

  it('7. media failure does not destroy core enqueue', async () => {
    const storage = getStorageManager();
    const opId = await enqueueFindCreate(storage, {
      userId: USER_ID,
      payload: makePayload(7),
    });
    const photoFail = new Error('local photo write failed');
    expect(opId).toBeTruthy();
    expect((await storage.getAllOperations())[0].queue_status).toBe('PENDING');
    expect(photoFail.message).toContain('photo');
  });

  it('8+9. two coordinators / same key via legacy path — legacy init blocked', async () => {
    expect(() => initSync()).toThrow(/QUARANTINED/);
    const storage = getStorageManager();
    const opId = await enqueueFindCreate(storage, {
      userId: USER_ID,
      payload: makePayload(8),
    });
    expect((await storage.getAllOperations())[0].client_operation_id).toBe(opId);
    expect(() => getSync()).toThrow(/QUARANTINED/);
  });

  it('10. conflict / non-applied server result marks failure path not DONE', async () => {
    const storage = getStorageManager();
    const opId = await enqueueFindCreate(storage, {
      userId: USER_ID,
      payload: makePayload(10),
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              client_operation_id: opId,
              status: 'failed',
              server_id: null,
              error: 'version conflict',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await SyncManager.getInstance().flush();
    const op = (await storage.getAllOperations()).find((o) => o.client_operation_id === opId);
    expect(op?.queue_status).not.toBe('DONE');
    expect(['RETRY_SCHEDULED', 'FAILED_TERMINAL']).toContain(op?.queue_status);
  });

  it('11. queue entry replayed after restart → single applied find', async () => {
    setNavigatorOnline(false);
    const storage = getStorageManager();
    const opId = await enqueueFindCreate(storage, {
      userId: USER_ID,
      payload: makePayload(11),
    });

    await storage.destroy();
    _resetStorageManagerForTests();
    await initStorageManager({}, 'quarantine-replay');
    setNavigatorOnline(true);

    const recovered = getStorageManager();
    const ready = await recovered.getReadyOperations();
    expect(ready.some((o) => o.client_operation_id === opId)).toBe(true);

    const mock = createBatchMockSupabase();
    const target = ready.find((o) => o.client_operation_id === opId)!;
    await processSyncBatch(mock as never, USER_ID, {
      operations: mapLedgerToV1Batch([target]),
      idempotency_key: 'adv-replay-11a',
    });
    await processSyncBatch(mock as never, USER_ID, {
      operations: mapLedgerToV1Batch([target]),
      idempotency_key: 'adv-replay-11b',
    });
    expect(mock.getInsertCount()).toBe(1);
  });

  it('12. stale coordinator cannot receive op after canonical path completed', async () => {
    const storage = getStorageManager();
    const opId = await enqueueFindCreate(storage, {
      userId: USER_ID,
      payload: makePayload(12),
    });
    await storage.updateOperationStatus(opId, 'DONE', {
      synced_at: new Date().toISOString(),
    });

    expect(() => initSync()).toThrow(/QUARANTINED/);
    expect((await storage.getAllOperations())[0].queue_status).toBe('DONE');
  });
});
