import { describe, expect, it } from 'vitest';

import { AccessModel, LegalTag, Status } from './enums';
import {
  AccessModel as FeeAccessModelReexport,
  FeeAccessModel,
  FeeSiteAdmissionStatus,
  FeeSiteMetadataEnvelopeSchema,
  FeeSiteSourceAuthority,
  MaterialCertainty,
  MaterialOccurrenceType,
  MaterialOriginClass,
  OperatingStatus,
  SiteType,
  applyOperatorClaimUpdateAsProvenanceEvent,
  assertFeeSiteNegativeControls,
  buildTestOnlyFeeMineFixture,
  displayUnknown,
  embedFeeSiteEnvelope,
  evaluateFeeSitePublicationReadiness,
  isFeeMineFromMetadata,
  isPubliclyDiscoverableAdmission,
  legalTagToSiteType,
  locationHasSiteRole,
  locationMatchesSiteTypeFilter,
  locationSiteRoles,
  normalizeMaterialClaimCertainty,
  operatingStatusToLegacyStatus,
  parseFeeSiteEnvelope,
  seededIsNotNativeOccurrence,
  siteTypeToAccessModel,
  siteTypeToLegalTag,
} from './fee-site-support';

describe('fee-site-support site types', () => {
  it('maps FEE_MINE onto existing LEGAL_FEE_SITE / FEE_SITE without inventing a parallel table', () => {
    expect(siteTypeToLegalTag(SiteType.FEE_MINE)).toBe(LegalTag.LEGAL_FEE_SITE);
    expect(siteTypeToAccessModel(SiteType.FEE_MINE)).toBe(AccessModel.FEE_SITE);
    expect(legalTagToSiteType(LegalTag.LEGAL_FEE_SITE)).toBe(SiteType.FEE_MINE);
    expect(FeeAccessModelReexport.FEE_SITE).toBe(AccessModel.FEE_SITE);
  });

  it('covers the required site type set', () => {
    expect(Object.values(SiteType).sort()).toEqual(
      [
        'CLUB_SITE',
        'FEE_MINE',
        'GEOLOGIC_POI',
        'HISTORIC_LOCALITY',
        'IDENTIFICATION_RESOURCE',
        'MUSEUM',
        'PERMIT_REQUIRED',
        'PUBLIC_COLLECTING',
        'RESTRICTED',
        'ROCK_SHOP',
        'UNKNOWN',
      ].sort()
    );
  });
});

describe('fee-site-support operating status', () => {
  it('does not treat OPEN_CONFIRMED as collecting permission when mapping to legacy Status', () => {
    expect(operatingStatusToLegacyStatus(OperatingStatus.OPEN_CONFIRMED)).toBe(Status.OPEN);
    expect(operatingStatusToLegacyStatus(OperatingStatus.SEASONAL)).toBe(Status.SEASONAL);
    expect(operatingStatusToLegacyStatus(OperatingStatus.TEMPORARILY_CLOSED)).toBe(Status.CLOSED);
    expect(operatingStatusToLegacyStatus(OperatingStatus.STALE)).toBe(Status.RESEARCH_REQUIRED);
  });
});

describe('fee-site-support material certainty', () => {
  it('downgrades operator-advertised VERIFIED to REPORTED', () => {
    expect(
      normalizeMaterialClaimCertainty({
        materialName: 'Sapphire',
        occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
        certainty: MaterialCertainty.VERIFIED,
        originClass: MaterialOriginClass.UNKNOWN,
      })
    ).toBe(MaterialCertainty.REPORTED);
  });

  it('keeps VERIFIED for non-advertised claims', () => {
    expect(
      normalizeMaterialClaimCertainty({
        materialName: 'Agate',
        occurrenceType: MaterialOccurrenceType.PRIMARY,
        certainty: MaterialCertainty.VERIFIED,
        originClass: MaterialOriginClass.NATURAL,
      })
    ).toBe(MaterialCertainty.VERIFIED);
  });
});

describe('fee-site-support collecting context', () => {
  it('marks seeded gravel as not equivalent to in-situ geology', () => {
    expect(
      seededIsNotNativeOccurrence({
        method: 'SEEDED_MATERIAL',
        materialOrigin: 'SEEDED',
        keepTakeHomeAllowed: 'UNKNOWN',
        quantityRestrictions: 'UNKNOWN',
        toolRestrictions: 'UNKNOWN',
      })
    ).toBe(true);
  });
});

describe('fee-site-support admission / publication', () => {
  it('blocks TEST_ONLY and incomplete evidence from publishing', () => {
    const blocked = evaluateFeeSitePublicationReadiness({
      identifiableSite: true,
      sufficientCoordinates: true,
      identifiableOperator: true,
      currentOperationEvidence: true,
      collectingActivityConfirmed: true,
      accessTermsSufficientlyKnown: true,
      unresolvedMisleadingContradiction: false,
      admissionStatus: FeeSiteAdmissionStatus.TEST_ONLY,
    });
    expect(blocked.publishable).toBe(false);
    expect(blocked.reasons).toContain('TEST_ONLY fixtures must not publish');
    expect(isPubliclyDiscoverableAdmission(FeeSiteAdmissionStatus.TEST_ONLY)).toBe(false);
    expect(isPubliclyDiscoverableAdmission(FeeSiteAdmissionStatus.PUBLISHED)).toBe(true);
  });

  it('allows publication only when minimum evidence is present', () => {
    const ok = evaluateFeeSitePublicationReadiness({
      identifiableSite: true,
      sufficientCoordinates: true,
      identifiableOperator: true,
      currentOperationEvidence: true,
      collectingActivityConfirmed: true,
      accessTermsSufficientlyKnown: true,
      unresolvedMisleadingContradiction: false,
      admissionStatus: FeeSiteAdmissionStatus.ADMITTED,
    });
    expect(ok.publishable).toBe(true);
  });

  it('allows UNKNOWN price while still requiring access terms', () => {
    const fixture = buildTestOnlyFeeMineFixture();
    const envelope = parseFeeSiteEnvelope(fixture.metadata);
    expect(envelope?.feeProfile?.pricingSummary).toBe('UNKNOWN');
    expect(displayUnknown(envelope?.feeProfile?.pricingSummary)).toBe('Unknown / Not verified');
  });
});

describe('fee-site-support metadata envelope', () => {
  it('round-trips through location metadata without breaking unknown locations', () => {
    expect(parseFeeSiteEnvelope({})).toBeNull();
    expect(parseFeeSiteEnvelope(null)).toBeNull();

    const fixture = buildTestOnlyFeeMineFixture();
    expect(isFeeMineFromMetadata(fixture.metadata)).toBe(true);
    expect(locationMatchesSiteTypeFilter(fixture.metadata, [SiteType.FEE_MINE])).toBe(true);
    expect(locationMatchesSiteTypeFilter(fixture.metadata, [SiteType.PUBLIC_COLLECTING])).toBe(
      false
    );

    const envelope = parseFeeSiteEnvelope(fixture.metadata);
    expect(envelope?.admissionStatus).toBe(FeeSiteAdmissionStatus.TEST_ONLY);
    expect(envelope?.feeProfile?.feeAccessModel).toBe(FeeAccessModel.PAY_TO_DIG);
  });

  it('embeds site_type and access_model mirror keys for filters', () => {
    const embedded = embedFeeSiteEnvelope(
      {},
      FeeSiteMetadataEnvelopeSchema.parse({
        siteType: SiteType.FEE_MINE,
        accessModel: AccessModel.FEE_SITE,
        operatingStatus: OperatingStatus.SEASONAL,
      })
    );
    expect(embedded.site_type).toBe('FEE_MINE');
    expect(embedded.access_model).toBe('FEE_SITE');
  });
});

describe('fee-site-support negative controls', () => {
  it('mapped fee site is not open; advertised is not verified; operator is not collecting allowed', () => {
    const fixture = buildTestOnlyFeeMineFixture({
      operatingStatus: OperatingStatus.UNKNOWN,
      accessAxes: {
        visit: 'UNKNOWN',
        collect: 'UNKNOWN',
        route: 'UNKNOWN',
        operatingStatus: OperatingStatus.UNKNOWN,
      },
      materialClaims: [
        {
          materialName: 'Tourmaline',
          occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
          certainty: MaterialCertainty.VERIFIED,
          originClass: MaterialOriginClass.SEEDED,
        },
      ],
      feeProfile: {
        operatorName: 'Someone',
        pricingSummary: 'UNKNOWN',
        feeAccessModel: FeeAccessModel.PAY_TO_DIG,
        operatorClaimState: 'UNCLAIMED',
        reservationRequired: 'UNKNOWN',
        walkInStatus: 'UNKNOWN',
        seasonality: 'UNKNOWN',
        hours: 'UNKNOWN',
        waiverRequired: 'UNKNOWN',
        ageRestrictions: 'UNKNOWN',
        toolPolicy: 'UNKNOWN',
        amenities: [],
        accessibilityNotes: 'UNKNOWN',
        familyBeginnerSuitability: 'UNKNOWN',
        contactDetails: 'UNKNOWN',
      },
    });
    const envelope = parseFeeSiteEnvelope(fixture.metadata)!;
    const controls = assertFeeSiteNegativeControls(envelope);
    expect(controls.mappedIsNotOpen).toBe(true);
    expect(controls.advertisedIsNotVerifiedGeology).toBe(true);
    expect(controls.knownOperatorIsNotCollectingAllowed).toBe(true);
    expect(controls.knownPriceIsNotGuaranteedCurrent).toBe(true);
    expect(controls.seededIsNotTreatedAsNative).toBe(true);
  });

  it('social / secondary directory alone does not confirm OPEN_CONFIRMED readiness', () => {
    const readiness = evaluateFeeSitePublicationReadiness({
      identifiableSite: true,
      sufficientCoordinates: true,
      identifiableOperator: false,
      currentOperationEvidence: false,
      collectingActivityConfirmed: false,
      accessTermsSufficientlyKnown: false,
      unresolvedMisleadingContradiction: false,
      admissionStatus: FeeSiteAdmissionStatus.DISCOVERED,
    });
    expect(readiness.publishable).toBe(false);
    expect(FeeSiteSourceAuthority.SOCIAL).toBe('SOCIAL');
    expect(FeeSiteSourceAuthority.SECONDARY_DIRECTORY).toBe('SECONDARY_DIRECTORY');
  });
});

describe('fee-site-support operator claim boundary', () => {
  it('applies claim updates as additive provenance without erasing admission history', () => {
    const fixture = buildTestOnlyFeeMineFixture();
    const current = parseFeeSiteEnvelope(fixture.metadata)!;
    const { next, provenanceNote } = applyOperatorClaimUpdateAsProvenanceEvent(current, {
      locationId: fixture.locationId,
      claimedByActorId: 'actor-test',
      hours: '9am–4pm',
      pricingSummary: '$50/day — not guaranteed current',
      evidence: {
        authorityClass: FeeSiteSourceAuthority.OPERATOR,
        reference: 'operator-claim-draft',
        retrievedAt: '2026-09-30T12:00:00.000Z',
      },
      recordedAt: '2026-09-30T12:00:00.000Z',
    });
    expect(next.feeProfile?.hours).toBe('9am–4pm');
    expect(next.sources.length).toBeGreaterThan(current.sources.length);
    expect(provenanceNote.toLowerCase()).toContain('provenance');
    expect(next.admissionStatus).toBe(FeeSiteAdmissionStatus.TEST_ONLY);
  });
});

describe('fee-site-support multi-role secondarySiteTypes', () => {
  it('keeps one location with primary FEE_MINE and secondary shop/ID roles', () => {
    const parsed = FeeSiteMetadataEnvelopeSchema.parse({
      siteType: SiteType.FEE_MINE,
      secondarySiteTypes: [SiteType.ROCK_SHOP, SiteType.IDENTIFICATION_RESOURCE],
      admissionStatus: FeeSiteAdmissionStatus.ADMITTED,
    });
    expect(locationSiteRoles(parsed)).toEqual([
      SiteType.FEE_MINE,
      SiteType.ROCK_SHOP,
      SiteType.IDENTIFICATION_RESOURCE,
    ]);
    expect(locationHasSiteRole(parsed, SiteType.IDENTIFICATION_RESOURCE)).toBe(true);
    const meta = embedFeeSiteEnvelope({}, parsed);
    expect(locationMatchesSiteTypeFilter(meta, [SiteType.ROCK_SHOP])).toBe(true);
    expect(locationMatchesSiteTypeFilter(meta, [SiteType.MUSEUM])).toBe(false);
  });
});
