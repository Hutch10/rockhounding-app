import { describe, expect, it } from 'vitest';

import { mapLedgerToV1Batch } from '@/lib/sync/batch-mapper';

describe('mapLedgerToV1Batch', () => {
  it('maps find_log ledger ops to V1 find create', () => {
    const mapped = mapLedgerToV1Batch([
      {
        client_operation_id: '660e8400-e29b-41d4-a716-446655440001',
        entity_type: 'find_log',
        operation_type: 'create',
        created_at: '2026-06-07T12:00:00.000Z',
        payload: { material_name: 'Quartz' },
      },
    ]);

    expect(mapped[0]).toEqual({
      client_operation_id: '660e8400-e29b-41d4-a716-446655440001',
      entity_type: 'find',
      operation_type: 'create',
      payload: { material_name: 'Quartz' },
      timestamp: '2026-06-07T12:00:00.000Z',
    });
  });
});
