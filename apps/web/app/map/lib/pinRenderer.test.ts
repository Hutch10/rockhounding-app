import { describe, expect, it } from 'vitest';

import type { LocationV1 } from '@rockhounding/shared';
import { buildTestOnlyFeeMineFixture } from '@rockhounding/shared/fee-site-support';

import {
  buildFeeMinePinAriaLabel,
  getAccessFillColor,
  getTrustRingColor,
  resolvePinMarkerShape,
} from './pinRenderer';

describe('GIS-003 pin renderer colors', () => {
  it('uses access fill colors for all statuses', () => {
    expect(getAccessFillColor('allowed')).toBe('#059669');
    expect(getAccessFillColor('prohibited')).toBe('#e11d48');
    expect(getAccessFillColor('restricted')).toBe('#ea580c');
  });

  it('maps all four trust ring colors', () => {
    expect(getTrustRingColor('official')).toBe('#2563eb');
    expect(getTrustRingColor('verified')).toBe('#059669');
    expect(getTrustRingColor('community')).toBe('#d97706');
    expect(getTrustRingColor('unverified')).toBe('#64748b');
  });
});

describe('fee mine pin shape channel', () => {
  it('resolves diamond shape and fee-mine aria copy without relying on color alone', () => {
    const fixture = buildTestOnlyFeeMineFixture();
    const pin = {
      id: fixture.locationId,
      name: fixture.name,
      description: null,
      latitude: 45,
      longitude: -120,
      fuzzy_location: null,
      access_status: 'caution',
      difficulty_rating: null,
      is_verified: false,
      metadata: fixture.metadata,
    } as LocationV1;

    expect(resolvePinMarkerShape(pin)).toBe('diamond-fee-mine');
    expect(buildFeeMinePinAriaLabel(pin)).toMatch(/Fee mine/i);
    expect(buildFeeMinePinAriaLabel(pin)).toMatch(/not collecting permission/i);
  });
});
