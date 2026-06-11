import { describe, expect, it } from 'vitest';

import { getAccessFillColor, getTrustRingColor } from './pinRenderer';

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
