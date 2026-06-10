import { describe, expect, it } from 'vitest';

import { resolveTrustCategory } from './resolveTrustCategory';

describe('resolveTrustCategory (TEST-003)', () => {
  it('returns stored official category when valid', () => {
    expect(
      resolveTrustCategory({
        trust_category: 'official',
        is_verified: false,
        source_tier: 'SECONDARY',
      })
    ).toBe('official');
  });

  it('maps OFFICIAL source_tier to official', () => {
    expect(
      resolveTrustCategory({
        is_verified: false,
        source_tier: 'OFFICIAL',
      })
    ).toBe('official');
  });

  it('maps verified flag with non-community tier to verified', () => {
    expect(
      resolveTrustCategory({
        is_verified: true,
        source_tier: 'OPERATOR',
      })
    ).toBe('verified');
  });

  it('maps COMMUNITY_STAGED to community', () => {
    expect(
      resolveTrustCategory({
        is_verified: false,
        source_tier: 'COMMUNITY_STAGED',
      })
    ).toBe('community');
  });

  it('defaults to unverified', () => {
    expect(
      resolveTrustCategory({
        is_verified: false,
        source_tier: 'SECONDARY',
      })
    ).toBe('unverified');
  });

  it('never upgrades community to official without stored category', () => {
    expect(
      resolveTrustCategory({
        is_verified: true,
        source_tier: 'COMMUNITY_STAGED',
      })
    ).toBe('community');
  });

  it('uses metadata source_tier when column absent', () => {
    expect(
      resolveTrustCategory({
        is_verified: false,
        metadata: { source_tier: 'OFFICIAL' },
      })
    ).toBe('official');
  });

  it('promoted_from_staging metadata yields community', () => {
    expect(
      resolveTrustCategory({
        is_verified: false,
        metadata: { promoted_from_staging: true },
      })
    ).toBe('community');
  });

  it('ignores invalid stored category and derives', () => {
    expect(
      resolveTrustCategory({
        trust_category: 'bogus',
        is_verified: true,
        source_tier: 'OPERATOR',
      })
    ).toBe('verified');
  });

  it('stored community beats is_verified heuristic', () => {
    expect(
      resolveTrustCategory({
        trust_category: 'community',
        is_verified: true,
        source_tier: 'OPERATOR',
      })
    ).toBe('community');
  });
});
