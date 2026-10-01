import { describe, expect, it } from 'vitest';

import type { LocationV1 } from '@rockhounding/shared';
import {
  OperatingStatus,
  buildTestOnlyFeeMineFixture,
  displayUnknown,
  isFeeMineFromMetadata,
  operatingStatusLabel,
  parseFeeSiteEnvelope,
} from '@rockhounding/shared/fee-site-support';

/**
 * Site-detail fee presentation contract (DOM-free).
 * LocationDetailClient consumes the same helpers.
 */
describe('LocationDetailClient fee mine presentation contract', () => {
  it('exposes fee badge inputs, unknown price, and non-open operating status', () => {
    const fixture = buildTestOnlyFeeMineFixture();
    const location = {
      id: fixture.locationId,
      name: fixture.name,
      description: 'Test fixture only',
      latitude: 44.1,
      longitude: -120.2,
      fuzzy_location: { lat: 44.1, lon: -120.2, precision: '~1km' as const },
      access_status: 'caution' as const,
      difficulty_rating: 2,
      is_verified: false,
      metadata: fixture.metadata,
    } satisfies LocationV1;

    expect(isFeeMineFromMetadata(location.metadata as Record<string, unknown>)).toBe(true);
    const envelope = parseFeeSiteEnvelope(location.metadata as Record<string, unknown>);
    expect(envelope).not.toBeNull();
    expect(displayUnknown(envelope?.feeProfile?.pricingSummary)).toBe('Unknown / Not verified');
    expect(displayUnknown(envelope?.feeProfile?.hours)).toBe('Unknown / Not verified');
    expect(operatingStatusLabel(envelope?.operatingStatus ?? OperatingStatus.UNKNOWN)).not.toBe(
      'Open (confirmed)'
    );
    expect(envelope?.operatingStatus).toBe(OperatingStatus.UNKNOWN);
  });

  it('keeps closed/seasonal labels distinct from open-confirmed', () => {
    expect(operatingStatusLabel(OperatingStatus.SEASONAL)).toBe('Seasonal');
    expect(operatingStatusLabel(OperatingStatus.TEMPORARILY_CLOSED)).toBe('Temporarily closed');
    expect(operatingStatusLabel(OperatingStatus.STALE)).toBe('Stale — not verified');
  });
});
