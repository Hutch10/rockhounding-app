import { describe, expect, it } from 'vitest';

import {
  FeeSiteAdmissionStatus,
  SiteType,
  locationMatchesSiteTypeFilter,
} from '@rockhounding/shared/fee-site-support';
import { buildTestOnlyFeeMineFixture } from '@rockhounding/shared/fee-site-support';

import { isPubliclyListableLocationMetadata } from './route';
import { BboxQuerySchema } from './types';

describe('v1 locations fee mine query filters', () => {
  it('accepts site_type=FEE_MINE and fee_mine alias', () => {
    const withType = BboxQuerySchema.parse({
      bbox: '-125,32,-110,49',
      site_type: 'FEE_MINE',
    });
    expect(withType.site_type).toEqual(['FEE_MINE']);

    const withAlias = BboxQuerySchema.parse({
      bbox: '-125,32,-110,49',
      fee_mine: 'true',
    });
    expect(withAlias.fee_mine).toBe(true);
  });

  it('matches fixture metadata for FEE_MINE filter and excludes public collecting', () => {
    const fixture = buildTestOnlyFeeMineFixture();
    expect(locationMatchesSiteTypeFilter(fixture.metadata, [SiteType.FEE_MINE])).toBe(true);
    expect(locationMatchesSiteTypeFilter(fixture.metadata, [SiteType.PUBLIC_COLLECTING])).toBe(
      false
    );
    expect(fixture.metadata.fee_site).toMatchObject({
      admissionStatus: FeeSiteAdmissionStatus.TEST_ONLY,
    });
  });

  it('excludes TEST_ONLY fee envelopes from public listability (H2)', () => {
    const fixture = buildTestOnlyFeeMineFixture();
    expect(isPubliclyListableLocationMetadata(fixture.metadata)).toBe(false);
    expect(isPubliclyListableLocationMetadata({})).toBe(true);
    expect(isPubliclyListableLocationMetadata(null)).toBe(true);
  });
});
