import { describe, expect, it } from 'vitest';

import {
  FeeSiteAdmissionStatus,
  FeeSiteSourceAuthority,
  MaterialCertainty,
  MaterialOccurrenceType,
  MaterialOriginClass,
  OperatingStatus,
  SiteType,
  assertFeeSiteNegativeControls,
  buildTestOnlyFeeMineFixture,
  isPubliclyDiscoverableAdmission,
  normalizeMaterialClaimCertainty,
} from './fee-site-support';
import {
  ClaimCertainty,
  ClaimValidityDomain,
  DecisionGapKind,
  OperatorDirectContactProvenanceSchema,
  ReleaseState,
  SourceAuthorityClass,
  StatePackReadiness,
  appendSpecimenRevision,
  assertTrustFieldNegativeControls,
  currentSpecimenHeads,
  evaluateAccessDecisionGaps,
  isClaimStale,
  isPubliclyProjectedAdmission,
  isResourceOrBusinessSiteType,
  materialCertaintyEqualsClaimCertainty,
  occurrenceTypeIsNotAutomaticVerification,
  operatorAdvertisedIsNotVerifiedGeology,
  operatorInclusionDoesNotAuthorizeExtras,
  paidTierDoesNotAlterTrust,
  projectConflictedClaims,
  sourceDoesNotEstablish,
  sourceSupportsClaim,
  unknownIsNotAllowed,
} from './trust-field-kernel';

describe('trust-field-kernel geology/material separation', () => {
  it('keeps USER_OBSERVED and GEOLOGICALLY_SUPPORTED distinct from auto-VERIFIED', () => {
    expect(MaterialOccurrenceType.USER_OBSERVED).toBe('USER_OBSERVED');
    expect(MaterialOccurrenceType.GEOLOGICALLY_SUPPORTED).toBe('GEOLOGICALLY_SUPPORTED');
    expect(occurrenceTypeIsNotAutomaticVerification(MaterialOccurrenceType.USER_OBSERVED)).toBe(
      true
    );
    expect(
      normalizeMaterialClaimCertainty({
        materialName: 'Amethyst',
        occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
        certainty: MaterialCertainty.VERIFIED,
        originClass: MaterialOriginClass.UNKNOWN,
      })
    ).toBe(MaterialCertainty.REPORTED);
  });
});

describe('trust-field-kernel certainty unification', () => {
  it('keeps MaterialCertainty identical to ClaimCertainty / EvidenceCertainty', () => {
    expect(materialCertaintyEqualsClaimCertainty()).toBe(true);
    expect(ClaimCertainty.VERIFIED).toBe(MaterialCertainty.VERIFIED);
    expect(ClaimCertainty.STALE).toBe(MaterialCertainty.STALE);
  });
});

describe('trust-field-kernel source authority + claim validity', () => {
  it('operator public supports advertised materials but not native occurrence', () => {
    expect(
      sourceSupportsClaim(
        SourceAuthorityClass.OPERATOR_PUBLIC,
        ClaimValidityDomain.OPERATOR_ADVERTISED_MATERIAL
      )
    ).toBe(true);
    expect(
      sourceDoesNotEstablish(
        SourceAuthorityClass.OPERATOR_PUBLIC,
        ClaimValidityDomain.NATIVE_OCCURRENCE
      )
    ).toBe(true);
  });

  it('tourism listing does not establish collect permission', () => {
    expect(
      sourceDoesNotEstablish(
        SourceAuthorityClass.OFFICIAL_TOURISM,
        ClaimValidityDomain.COLLECT_PERMISSION
      )
    ).toBe(true);
  });

  it('extends fee-site source authorities without removing OPERATOR', () => {
    expect(FeeSiteSourceAuthority.OPERATOR).toBe('OPERATOR');
    expect(FeeSiteSourceAuthority.OPERATOR_DIRECT).toBe('OPERATOR_DIRECT');
    expect(FeeSiteSourceAuthority.USER_OBSERVATION).toBe('USER_OBSERVATION');
  });
});

describe('trust-field-kernel decision gaps', () => {
  it('treats UNKNOWN as not ALLOWED and emits required gaps', () => {
    expect(unknownIsNotAllowed()).toBe(true);
    const gaps = evaluateAccessDecisionGaps({
      visit: 'UNKNOWN',
      collect: 'UNKNOWN',
      route: 'UNKNOWN',
      operatingStatus: OperatingStatus.UNKNOWN,
      materialClaims: [
        {
          materialName: 'Amethyst',
          occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
          certainty: MaterialCertainty.VERIFIED,
          originClass: MaterialOriginClass.UNKNOWN,
        },
      ],
    });
    expect(gaps.map((g) => g.kind).sort()).toEqual(
      [
        DecisionGapKind.VISIT_ALLOWED,
        DecisionGapKind.COLLECT_ALLOWED,
        DecisionGapKind.ROUTE_ALLOWED,
        DecisionGapKind.OPEN_NOW,
        DecisionGapKind.MATERIAL_VERIFIED,
      ].sort()
    );
    expect(
      normalizeMaterialClaimCertainty({
        materialName: 'Amethyst',
        occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
        certainty: MaterialCertainty.VERIFIED,
        originClass: MaterialOriginClass.UNKNOWN,
      })
    ).toBe(MaterialCertainty.REPORTED);
  });
});

describe('trust-field-kernel freshness', () => {
  it('marks short-horizon operational claims stale without treating missing as false', () => {
    expect(
      isClaimStale(
        {
          claimDomain: ClaimValidityDomain.HOURS,
          lastVerifiedAt: '2020-01-01T00:00:00.000Z',
          staleAfterHours: 24 * 30,
        },
        '2026-09-30T00:00:00.000Z'
      )
    ).toBe(true);
    expect(
      isClaimStale(
        {
          claimDomain: ClaimValidityDomain.GEOLOGIC_UNIT,
          lastVerifiedAt: '2024-01-01T00:00:00.000Z',
        },
        '2026-09-30T00:00:00.000Z'
      )
    ).toBe(false);
  });
});

describe('trust-field-kernel operator-direct provenance (Cowee)', () => {
  it('records inclusion permission without authorizing logo/photo/endorsement', () => {
    const contact = OperatorDirectContactProvenanceSchema.parse({
      operatorBusiness: 'Cowee Gift Shop & Mason Mountain Mine',
      contactMethod: 'IN_PERSON',
      contactedAt: '2026-09-01T15:00:00.000Z',
      actorRole: 'operator_representative',
      claimsConfirmed: ['listing_inclusion'],
      permissionGranted: true,
      permissionScope: [ClaimValidityDomain.INCLUSION_PERMISSION],
      followUpRequested: false,
      notes: 'Verbal authorization for Rocky Atlas inclusion only.',
      recordedBy: 'owner',
    });
    expect(operatorInclusionDoesNotAuthorizeExtras(contact)).toBe(true);
    expect(contact.permissionScope).not.toContain(ClaimValidityDomain.LOGO_REUSE);
  });

  it('accepts PHONE channel for Cowee inclusion permission with narrow scope', () => {
    const contact = OperatorDirectContactProvenanceSchema.parse({
      operatorBusiness: 'Cowee Gift Shop & Mason Mountain Mine',
      contactMethod: 'PHONE',
      contactedAt: '2026-09-01T15:00:00.000Z',
      actorRole: 'operator_representative',
      claimsConfirmed: ['listing_inclusion'],
      permissionGranted: true,
      permissionScope: [ClaimValidityDomain.INCLUSION_PERMISSION],
      followUpRequested: true,
      notes:
        'Permission to include/use the business/site in Rocky Atlas only. No logo/photo/endorsement/private-info.',
      recordedBy: 'owner',
    });
    expect(contact.contactMethod).toBe('PHONE');
    expect(contact.followUpRequested).toBe(true);
    expect(operatorInclusionDoesNotAuthorizeExtras(contact)).toBe(true);
  });
});

describe('trust-field-kernel admission + TEST_ONLY', () => {
  it('keeps TEST_ONLY fail-closed from public projection', () => {
    expect(isPubliclyProjectedAdmission(FeeSiteAdmissionStatus.TEST_ONLY)).toBe(false);
    expect(isPubliclyDiscoverableAdmission(FeeSiteAdmissionStatus.PUBLISHED)).toBe(true);
    const fixture = buildTestOnlyFeeMineFixture();
    expect(fixture.metadata.synthetic).toBe(true);
  });

  it('supports shop/museum/identification resource site types on the same kernel', () => {
    expect(isResourceOrBusinessSiteType(SiteType.ROCK_SHOP)).toBe(true);
    expect(isResourceOrBusinessSiteType(SiteType.MUSEUM)).toBe(true);
    expect(isResourceOrBusinessSiteType(SiteType.FEE_MINE)).toBe(false);
  });
});

describe('trust-field-kernel specimen revision + multi-head conflict', () => {
  it('appends revisions and surfaces CONFLICTED multi-heads order-independently', () => {
    const a = appendSpecimenRevision([], {
      revisionId: 'r2',
      specimenId: 's1',
      kind: 'USER_HYPOTHESIS',
      label: 'Quartz',
      certainty: ClaimCertainty.REPORTED,
      recordedAt: '2026-09-30T12:00:00.000Z',
      recordedBy: 'user',
      sourceIds: [],
    });
    const b = appendSpecimenRevision(a, {
      revisionId: 'r1',
      specimenId: 's1',
      kind: 'AI_SUGGESTION',
      label: 'Calcite',
      certainty: ClaimCertainty.REPORTED,
      recordedAt: '2026-09-30T12:01:00.000Z',
      recordedBy: 'ai',
      sourceIds: [],
    });
    expect(b).toHaveLength(2);
    expect(b[0]?.revisionId).toBe('r2');
    const heads = currentSpecimenHeads(b);
    expect(heads.every((h) => h.certainty === ClaimCertainty.CONFLICTED)).toBe(true);

    const projected = projectConflictedClaims([
      { id: 'b', label: 'A', certainty: 'REPORTED' },
      { id: 'a', label: 'B', certainty: 'REPORTED' },
    ]);
    const projected2 = projectConflictedClaims([
      { id: 'a', label: 'B', certainty: 'REPORTED' },
      { id: 'b', label: 'A', certainty: 'REPORTED' },
    ]);
    expect(projected.conflicted).toBe(true);
    expect(projected.heads.map((h) => h.id)).toEqual(projected2.heads.map((h) => h.id));
  });
});

describe('trust-field-kernel Crater fixture negatives', () => {
  it('preserves fee-site negatives and operator-advertised ≠ verified', () => {
    const craterClaims = [
      {
        materialName: 'Diamond',
        occurrenceType: MaterialOccurrenceType.PRIMARY,
        certainty: MaterialCertainty.SUPPORTED,
        originClass: MaterialOriginClass.NATURAL,
      },
      {
        materialName: 'Amethyst',
        occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
        certainty: MaterialCertainty.VERIFIED,
        originClass: MaterialOriginClass.UNKNOWN,
      },
    ];
    expect(operatorAdvertisedIsNotVerifiedGeology(craterClaims[1]!)).toBe(true);
    expect(normalizeMaterialClaimCertainty(craterClaims[1]!)).toBe(MaterialCertainty.REPORTED);

    const env = {
      siteType: SiteType.FEE_MINE,
      accessModel: 'FEE_SITE' as const,
      operatingStatus: OperatingStatus.OPEN_CONFIRMED,
      accessAxes: {
        visit: 'ALLOWED' as const,
        collect: 'ALLOWED' as const,
        route: 'ALLOWED' as const,
        operatingStatus: OperatingStatus.OPEN_CONFIRMED,
      },
      materialClaims: craterClaims,
      admissionStatus: FeeSiteAdmissionStatus.ADMITTED,
    };
    // Minimal envelope shape for fee-site negatives via fixture path
    const fixture = buildTestOnlyFeeMineFixture({
      operatingStatus: OperatingStatus.UNKNOWN,
      accessAxes: {
        visit: 'UNKNOWN',
        collect: 'UNKNOWN',
        route: 'UNKNOWN',
        operatingStatus: OperatingStatus.UNKNOWN,
      },
    });
    const feeNeg = assertFeeSiteNegativeControls(
      // parse via fixture metadata would need parseFeeSiteEnvelope — use unknown axes fixture
      {
        siteType: SiteType.FEE_MINE,
        accessModel: 'FEE_SITE',
        operatingStatus: OperatingStatus.UNKNOWN,
        accessAxes: {
          visit: 'UNKNOWN',
          collect: 'UNKNOWN',
          route: 'UNKNOWN',
          operatingStatus: OperatingStatus.UNKNOWN,
        },
        materialClaims: craterClaims,
        admissionStatus: FeeSiteAdmissionStatus.TEST_ONLY,
      } as never
    );
    expect(feeNeg.advertisedIsNotVerifiedGeology).toBe(true);
    expect(fixture.locationId).toBeTruthy();
    void env;

    const kernelNeg = assertTrustFieldNegativeControls({
      publicLand: true,
      collectAllowed: false,
      permitExists: true,
      permitHeld: false,
      roadExists: true,
      routeAllowed: false,
      historicRecord: true,
      currentSite: false,
      socialPostOfficial: false,
      aiIdentificationVerified: false,
      testOnlyPublic: false,
      offlineRetryDuplicate: false,
      conflictingSourcesChoseOne: false,
    });
    expect(Object.values(kernelNeg).every(Boolean)).toBe(true);
  });
});

describe('trust-field-kernel release + state pack + partner invariants', () => {
  it('exposes release states and state-pack readiness without Production promotion claim', () => {
    expect(ReleaseState.PRODUCTION_PROVEN).toBe('PRODUCTION_PROVEN');
    expect(StatePackReadiness.CORE_READY).toBe('CORE_READY');
    expect(paidTierDoesNotAlterTrust('ENHANCED_PAID')).toBe(true);
  });
});
