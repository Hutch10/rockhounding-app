import { describe, expect, it } from 'vitest';

import {
  MaterialOriginClass,
  OperatingStatus,
  SiteType,
  parseFeeSiteEnvelope,
} from './fee-site-support';
import {
  REAL_OPERATOR_PILOT_COHORT,
  PilotClaimability,
  assertPilotCohortPublicationReady,
  isPartnerClaimSurfaceAllowed,
} from './real-operator-pilot-cohort';

describe('real-operator-pilot-cohort', () => {
  it('covers required model slots with 7 real sites', () => {
    expect(REAL_OPERATOR_PILOT_COHORT).toHaveLength(7);
    const slots = REAL_OPERATOR_PILOT_COHORT.map((s) => s.modelSlot);
    expect(slots).toEqual(
      expect.arrayContaining([
        'private_fee_mine_shop_id',
        'government_platform_managed',
        'appointment_only_fee_mine',
        'seasonal_family_fee_mine',
        'mixed_native_enriched',
        'rock_shop_resource',
        'museum_resource',
      ])
    );
  });

  it('never fabricates verified operator ownership on claimable sites', () => {
    for (const site of REAL_OPERATOR_PILOT_COHORT) {
      expect(site.metadata.synthetic).toBe(false);
      expect(site.metadata.fee_site.feeProfile?.operatorClaimState).toBe('UNCLAIMED');
      expect(site.metadata.fee_site.admissionStatus).toBe('ADMITTED');
    }
  });

  it('models Cowee as FEE_MINE with ROCK_SHOP + IDENTIFICATION_RESOURCE secondary roles', () => {
    const cowee = REAL_OPERATOR_PILOT_COHORT.find((s) => s.name.includes('Cowee'))!;
    expect(cowee.metadata.fee_site.siteType).toBe(SiteType.FEE_MINE);
    expect(cowee.metadata.fee_site.secondarySiteTypes).toEqual(
      expect.arrayContaining([SiteType.ROCK_SHOP, SiteType.IDENTIFICATION_RESOURCE])
    );
    expect(cowee.metadata.fee_site.feeProfile?.amenities).toEqual(
      expect.arrayContaining(['gift shop', 'find identification support'])
    );
  });

  it('keeps Crater and museum platform-managed / non-claimable for partner surface', () => {
    const crater = REAL_OPERATOR_PILOT_COHORT.find((s) => s.name.includes('Crater'));
    const museum = REAL_OPERATOR_PILOT_COHORT.find((s) => s.name.includes('Museum'));
    expect(crater?.claimability).toBe(PilotClaimability.PLATFORM_MANAGED);
    expect(museum?.claimability).toBe(PilotClaimability.PLATFORM_MANAGED);
    expect(isPartnerClaimSurfaceAllowed(crater!.claimability)).toBe(false);
    expect(isPartnerClaimSurfaceAllowed(museum!.claimability)).toBe(false);
  });

  it('marks Oceanview appointment-required and mixed/unknown origin disclosure', () => {
    const ocean = REAL_OPERATOR_PILOT_COHORT.find((s) => s.name.includes('Oceanview'))!;
    expect(ocean.metadata.fee_site.operatingStatus).toBe(OperatingStatus.APPOINTMENT_REQUIRED);
    expect(ocean.metadata.fee_site.feeProfile?.reservationRequired).toBe('YES');
    expect(ocean.metadata.fee_site.collectingContext?.method).toBe('MIXED');
  });

  it('marks Emerald Hollow mixed collecting method', () => {
    const emerald = REAL_OPERATOR_PILOT_COHORT.find((s) => s.name.includes('Emerald Hollow'))!;
    expect(emerald.metadata.fee_site.collectingContext?.method).toBe('MIXED');
  });

  it('classifies Gem Shop as ROCK_SHOP not FEE_MINE', () => {
    const shop = REAL_OPERATOR_PILOT_COHORT.find((s) => s.name.includes('Gem Shop'))!;
    expect(shop.metadata.fee_site.siteType).toBe(SiteType.ROCK_SHOP);
    expect(shop.metadata.fee_site.accessAxes?.collect).toBe('PROHIBITED');
  });

  it('parses every cohort envelope and passes publication readiness', () => {
    for (const site of REAL_OPERATOR_PILOT_COHORT) {
      const env = parseFeeSiteEnvelope(site.metadata as unknown as Record<string, unknown>);
      expect(env).not.toBeNull();
      expect(env!.siteType).not.toBe(SiteType.UNKNOWN);
    }
    const ready = assertPilotCohortPublicationReady();
    expect(ready.ok).toBe(true);
  });

  it('does not use SEEDED origin as NATURAL for Oceanview/Emerald', () => {
    for (const name of ['Oceanview', 'Emerald Hollow']) {
      const site = REAL_OPERATOR_PILOT_COHORT.find((s) => s.name.includes(name))!;
      expect(site.metadata.fee_site.collectingContext?.materialOrigin).toBe(
        MaterialOriginClass.MIXED
      );
    }
  });

  it('exports local seed JSON artifact for SQL apply', () => {
    const { writeFileSync, mkdirSync } = require('node:fs') as typeof import('node:fs');
    const { resolve } = require('node:path') as typeof import('node:path');
    const dir = resolve(__dirname, '../../../qa-artifacts/rockhounding-real-operator-pilot-r1/sql');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'cohort.json'), JSON.stringify(REAL_OPERATOR_PILOT_COHORT, null, 2));
    expect(REAL_OPERATOR_PILOT_COHORT.length).toBe(7);
  });
});
