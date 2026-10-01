import { describe, expect, it } from 'vitest';

import { SiteType, buildTestOnlyFeeMineFixture } from '@rockhounding/shared/fee-site-support';

import { isSearchablePublishedFeeSite, matchesFeeSiteSearch } from './feeSiteSearch';
import { parseFeeSiteEnvelope } from '@rockhounding/shared/fee-site-support';

describe('feeSiteSearch', () => {
  it('matches pay-to-dig / fee mine text against FEE_MINE envelope', () => {
    const fixture = buildTestOnlyFeeMineFixture();
    expect(
      matchesFeeSiteSearch(
        { name: fixture.name, metadata: fixture.metadata },
        { text: 'pay-to-dig' }
      )
    ).toBe(true);
    expect(
      matchesFeeSiteSearch(
        { name: 'Public beach', metadata: {} },
        { text: 'fee mines', siteTypes: [SiteType.FEE_MINE] }
      )
    ).toBe(false);
  });

  it('does not treat TEST_ONLY fixtures as publicly searchable published records', () => {
    const fixture = buildTestOnlyFeeMineFixture();
    const envelope = parseFeeSiteEnvelope(fixture.metadata);
    expect(isSearchablePublishedFeeSite(envelope)).toBe(false);
  });

  it('matches secondarySiteTypes so fee-mine + shop/ID is one location', () => {
    const fixture = buildTestOnlyFeeMineFixture();
    const envelope = parseFeeSiteEnvelope(fixture.metadata)!;
    const metadata = {
      ...fixture.metadata,
      fee_site: {
        ...envelope,
        secondarySiteTypes: [SiteType.ROCK_SHOP, SiteType.IDENTIFICATION_RESOURCE],
      },
    };
    expect(
      matchesFeeSiteSearch(
        { name: fixture.name, metadata },
        { siteTypes: [SiteType.IDENTIFICATION_RESOURCE] }
      )
    ).toBe(true);
    expect(
      matchesFeeSiteSearch({ name: fixture.name, metadata }, { siteTypes: [SiteType.MUSEUM] })
    ).toBe(false);
  });
});
