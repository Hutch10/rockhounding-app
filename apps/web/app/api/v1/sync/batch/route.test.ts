import { describe, expect, it, vi, beforeEach } from 'vitest';

import { processSyncBatch, toGeographyWkt } from './handler';

vi.mock('@/lib/provenance/emitters', () => ({
  emitSyncProvenanceEvent: vi.fn().mockResolvedValue({ skipped: true }),
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const CLIENT_OP_ID = '660e8400-e29b-41d4-a716-446655440001';
const FIND_ID = '770e8400-e29b-41d4-a716-446655440002';

function buildBatch(overrides: Record<string, unknown> = {}) {
  return {
    operations: [
      {
        client_operation_id: CLIENT_OP_ID,
        entity_type: 'find',
        operation_type: 'create',
        timestamp: '2026-06-07T12:00:00.000Z',
        payload: {
          material_name: 'Smoky Quartz',
          notes: 'Field test',
          discovered_at: '2026-06-07T12:00:00.000Z',
          location: { lat: 35.5, lon: -120.5 },
        },
      },
    ],
    idempotency_key: 'batch-key-001',
    ...overrides,
  };
}

function createMockSupabase() {
  const findsStore = new Map<string, Record<string, unknown>>();
  const syncOpsStore = new Map<string, Record<string, unknown>>();
  const insertSpy = vi.fn();

  const from = vi.fn((table: string) => {
    if (table === 'finds') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((col: string, val: string) => ({
            eq: vi.fn((_col2: string, _val2: string) => ({
              maybeSingle: vi.fn(async () => {
                for (const row of findsStore.values()) {
                  if (row.client_operation_id === val && row.user_id === USER_ID) {
                    return { data: { id: row.id }, error: null };
                  }
                }
                return { data: null, error: null };
              }),
            })),
            maybeSingle: vi.fn(async () => {
              for (const row of findsStore.values()) {
                if (row.client_operation_id === val) {
                  return { data: { id: row.id }, error: null };
                }
              }
              return { data: null, error: null };
            }),
          })),
        })),
        insert: insertSpy.mockImplementation((row: Record<string, unknown>) => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => {
              if (
                findsStore.has(row.client_operation_id as string) ||
                [...findsStore.values()].some(
                  (r) => r.client_operation_id === row.client_operation_id
                )
              ) {
                return { data: null, error: { code: '23505', message: 'duplicate' } };
              }
              const id = FIND_ID;
              findsStore.set(row.client_operation_id as string, { ...row, id });
              return { data: { id }, error: null };
            }),
          })),
        })),
      };
    }

    if (table === 'sync_operations') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((_col: string, val: string) => ({
            maybeSingle: vi.fn(async () => {
              const row = syncOpsStore.get(val);
              return { data: row ?? null, error: null };
            }),
          })),
        })),
        upsert: vi.fn(async (row: Record<string, unknown>) => {
          syncOpsStore.set(row.client_operation_id as string, row);
          return { error: null };
        }),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return { from, findsStore, syncOpsStore, insertSpy };
}

describe('toGeographyWkt (TEST-002)', () => {
  it('formats SRID=4326 POINT for PostGIS geography', () => {
    expect(toGeographyWkt(35.5, -120.5)).toBe('SRID=4326;POINT(-120.5 35.5)');
  });
});

describe('processSyncBatch (TEST-002)', () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.clearAllMocks();
  });

  it('creates find with geography and returns applied', async () => {
    const result = await processSyncBatch(mock as never, USER_ID, buildBatch());

    expect(result.results).toHaveLength(1);
    expect(result.results![0]).toMatchObject({
      client_operation_id: CLIENT_OP_ID,
      server_id: FIND_ID,
      status: 'applied',
      error: null,
    });

    const insertCall = mock.insertSpy;
    expect(insertCall).toHaveBeenCalledWith(
      expect.objectContaining({
        exact_location: 'SRID=4326;POINT(-120.5 35.5)',
        material_name: 'Smoky Quartz',
        client_operation_id: CLIENT_OP_ID,
      })
    );
  });

  it('returns applied without double insert for duplicate client_operation_id', async () => {
    await processSyncBatch(mock as never, USER_ID, buildBatch());
    const second = await processSyncBatch(mock as never, USER_ID, buildBatch());

    expect(second.results![0].status).toBe('applied');
    expect(second.results![0].server_id).toBe(FIND_ID);

    expect(mock.insertSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid batch schema', async () => {
    await expect(processSyncBatch(mock as never, USER_ID, { operations: [] })).rejects.toThrow();
  });
});
