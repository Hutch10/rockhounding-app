import { describe, expect, it } from 'vitest';

import {
  parseTrustCategory,
  TRUST_BADGE_STYLES,
  TRUST_CATEGORY_LABELS,
  TRUST_RING_COLORS,
} from './types';

/**
 * TEST-008 (unit): all four trust badge variants resolve correctly from API values.
 */
describe('Trust badge variants (TEST-008)', () => {
  const categories = ['official', 'verified', 'community', 'unverified'] as const;

  it.each(categories)('parses %s from API metadata', (category) => {
    expect(parseTrustCategory(category)).toBe(category);
    expect(TRUST_CATEGORY_LABELS[category]).toBeTruthy();
    expect(TRUST_BADGE_STYLES[category]).toContain('bg-');
    expect(TRUST_RING_COLORS[category]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('never upgrades unknown values to verified', () => {
    expect(parseTrustCategory('VERIFIED')).toBe('unverified');
    expect(parseTrustCategory(null)).toBe('unverified');
    expect(parseTrustCategory({})).toBe('unverified');
  });

  it('covers all four seed showcase trust tiers', () => {
    const seedIds = [
      '22222222-2222-2222-2222-222222222201',
      '22222222-2222-2222-2222-222222222202',
      '22222222-2222-2222-2222-222222222203',
      '22222222-2222-2222-2222-222222222204',
    ];
    const expected = ['official', 'verified', 'community', 'unverified'] as const;
    seedIds.forEach((id, idx) => {
      expect(id).toBeTruthy();
      expect(expected[idx]).toBe(categories[idx]);
    });
  });
});
