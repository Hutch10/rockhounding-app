import { describe, expect, it } from 'vitest';

import { mapFindRowToV1, mapFindRowsToV1 } from './map-find-row';

const LIVE_SHAPED_ROW = {
  id: 'b2662d83-f1f7-416b-a0bd-4595b4068134',
  user_id: 'f3894c66-a8e1-4ef1-a903-31232baecf7b',
  trip_id: null,
  material_name: 'Test Specimen Acceptance',
  material_taxonomy_id: null,
  exact_location: '0101000020E61000009A99999999B957C06666666666664340',
  fuzzy_location: '0101000020E61000009A99999999B957C06666666666664340',
  is_fuzzy: true,
  confidence_metrics: {
    location: 1,
    breakdown: { expert: 0, machine: 0, visusal: 0.8 },
    identification: 1,
  },
  notes: null,
  discovered_at: '2026-09-26T01:49:59.597+00',
  created_at: '2026-09-26T01:50:01.784738+00',
  idempotency_key: 'e2523ae6-eb47-438f-8e0b-49e4b5cea728',
};

describe('mapFindRowToV1', () => {
  it('maps live PostGIS/WKB row without throwing', () => {
    const find = mapFindRowToV1(LIVE_SHAPED_ROW);
    expect(find).not.toBeNull();
    expect(find?.material_name).toBe('Test Specimen Acceptance');
    expect(find?.fuzzy_location).toBeNull();
    expect(find?.confidence_metrics.total).toBe(0);
    expect(find?.confidence_metrics.breakdown?.visual).toBe(0.8);
  });

  it('returns empty list for empty dataset', () => {
    expect(mapFindRowsToV1([])).toEqual([]);
  });

  it('skips malformed rows instead of crashing the route', () => {
    expect(mapFindRowsToV1([null, { id: 'not-a-uuid' }, LIVE_SHAPED_ROW])).toHaveLength(1);
  });
});
