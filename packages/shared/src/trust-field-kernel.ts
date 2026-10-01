/**
 * Rocky Atlas Trust + Field Kernel (consolidation gate)
 *
 * Binds existing STABLE primitives into one coherent surface.
 * Does not rename HutchStack/UGES/SyncManager infrastructure.
 * Does not create a parallel fee-site architecture.
 *
 * Governing chain:
 * OBSERVATION → SOURCE → EVIDENCE → CLAIM → AUTHORITY → CERTAINTY →
 * FRESHNESS → CONFLICT → DECISION → ACTION → OUTCOME → REVISION
 *
 * AI may assist summarization/extraction/classification/prioritization.
 * AI may NOT declare legality, grant access, overwrite verified evidence,
 * convert operator ads into verified geology, resolve authority conflicts,
 * or self-certify a release gate.
 */

import { z } from 'zod';

import {
  FeeSiteAdmissionStatus,
  FeeSiteAdmissionStatusSchema,
  FeeSiteSourceAuthority,
  MaterialCertainty,
  MaterialOccurrenceType,
  MaterialOriginClass,
  OperatingStatus,
  SiteType,
  isPubliclyDiscoverableAdmission,
  normalizeMaterialClaimCertainty,
  type FeeSiteMetadataEnvelope,
  type SiteMaterialClaim,
} from './fee-site-support';
import {
  EvidenceCertainty,
  EvidenceCertaintySchema,
  EvidenceConfidenceLevel,
  EvidencePermissionDimension,
  EvidencePermissionStatus,
} from './universal-geological-evidence-schema';

export const TRUST_FIELD_KERNEL_CONTRACT_ID = 'rockhounding:trust-field-kernel';
export const TRUST_FIELD_KERNEL_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Phase 1 — Canonical trust kernel (REUSE UGES certainty; do not duplicate)
// ---------------------------------------------------------------------------

/** Canonical certainty — alias of UGES EvidenceCertainty. */
export const ClaimCertainty = EvidenceCertainty;
export type ClaimCertainty = EvidenceCertainty;
export const ClaimCertaintySchema = EvidenceCertaintySchema;

/** MaterialCertainty values must remain identical to ClaimCertainty. */
export { MaterialCertainty, EvidenceCertainty, EvidenceConfidenceLevel };

export function materialCertaintyEqualsClaimCertainty(): boolean {
  const a = Object.values(MaterialCertainty).sort();
  const b = Object.values(ClaimCertainty).sort();
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// ---------------------------------------------------------------------------
// Phase 2 — Source authority classes (claim-specific; EXTEND fee-site set)
// ---------------------------------------------------------------------------

/**
 * Full Rocky Atlas source class set.
 * FeeSiteSourceAuthority.OPERATOR remains for backward compatibility;
 * prefer OPERATOR_DIRECT / OPERATOR_PUBLIC for new records.
 */
export const SourceAuthorityClass = {
  OPERATOR_DIRECT: 'OPERATOR_DIRECT',
  OPERATOR_PUBLIC: 'OPERATOR_PUBLIC',
  /** Legacy umbrella — prefer DIRECT/PUBLIC. */
  OPERATOR: 'OPERATOR',
  GOVERNMENT: 'GOVERNMENT',
  GEOLOGICAL_SURVEY: 'GEOLOGICAL_SURVEY',
  OFFICIAL_TOURISM: 'OFFICIAL_TOURISM',
  ACADEMIC: 'ACADEMIC',
  MUSEUM: 'MUSEUM',
  CLUB: 'CLUB',
  NEWS: 'NEWS',
  COMMUNITY: 'COMMUNITY',
  SOCIAL: 'SOCIAL',
  SECONDARY_DIRECTORY: 'SECONDARY_DIRECTORY',
  USER_OBSERVATION: 'USER_OBSERVATION',
} as const;

export type SourceAuthorityClass = (typeof SourceAuthorityClass)[keyof typeof SourceAuthorityClass];

export const SourceAuthorityClassSchema = z.enum([
  'OPERATOR_DIRECT',
  'OPERATOR_PUBLIC',
  'OPERATOR',
  'GOVERNMENT',
  'GEOLOGICAL_SURVEY',
  'OFFICIAL_TOURISM',
  'ACADEMIC',
  'MUSEUM',
  'CLUB',
  'NEWS',
  'COMMUNITY',
  'SOCIAL',
  'SECONDARY_DIRECTORY',
  'USER_OBSERVATION',
]);

export const KernelSourceRecordSchema = z.object({
  sourceId: z.string().min(1),
  sourceType: SourceAuthorityClassSchema,
  publisher: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
  url: z.string().url().optional(),
  reference: z.string().min(1).optional(),
  retrievedAt: z.string().datetime({ offset: true }),
  publishedAt: z.string().datetime({ offset: true }).optional(),
  contentHash: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
  claimsSupported: z.array(z.string().min(1)).default([]),
  freshnessExpectationHours: z.number().positive().optional(),
});

export type KernelSourceRecord = z.infer<typeof KernelSourceRecordSchema>;

export function normalizeFeeSiteSourceAuthority(authority: string): SourceAuthorityClass {
  if (authority in SourceAuthorityClass) {
    return authority as SourceAuthorityClass;
  }
  if (authority === FeeSiteSourceAuthority.OPERATOR) {
    return SourceAuthorityClass.OPERATOR;
  }
  return SourceAuthorityClass.SECONDARY_DIRECTORY;
}

// ---------------------------------------------------------------------------
// Phase 3 — Claim-scoped validity domains
// ---------------------------------------------------------------------------

export const ClaimValidityDomain = {
  BUSINESS_EXISTENCE: 'BUSINESS_EXISTENCE',
  LOCATION: 'LOCATION',
  HOURS: 'HOURS',
  FEES_PRICING: 'FEES_PRICING',
  OPERATOR_RULES: 'OPERATOR_RULES',
  ADMISSION_AVAILABILITY: 'ADMISSION_AVAILABILITY',
  VISIT_PERMISSION: 'VISIT_PERMISSION',
  COLLECT_PERMISSION: 'COLLECT_PERMISSION',
  ROUTE_PERMISSION: 'ROUTE_PERMISSION',
  OPERATING_STATUS: 'OPERATING_STATUS',
  OWNERSHIP_ADMIN: 'OWNERSHIP_ADMIN',
  HISTORIC_EXISTENCE: 'HISTORIC_EXISTENCE',
  OPERATOR_ADVERTISED_MATERIAL: 'OPERATOR_ADVERTISED_MATERIAL',
  NATIVE_OCCURRENCE: 'NATIVE_OCCURRENCE',
  GEOLOGIC_UNIT: 'GEOLOGIC_UNIT',
  INCLUSION_PERMISSION: 'INCLUSION_PERMISSION',
  LOGO_REUSE: 'LOGO_REUSE',
  PHOTO_REUSE: 'PHOTO_REUSE',
  ENDORSEMENT: 'ENDORSEMENT',
  PRIVATE_CONTACT_PUBLICATION: 'PRIVATE_CONTACT_PUBLICATION',
} as const;

export type ClaimValidityDomain = (typeof ClaimValidityDomain)[keyof typeof ClaimValidityDomain];

/** What a source class may support by default — never establishes unrelated claims. */
export const SOURCE_DEFAULT_SUPPORTS: Record<SourceAuthorityClass, readonly ClaimValidityDomain[]> =
  {
    OPERATOR_DIRECT: [
      ClaimValidityDomain.BUSINESS_EXISTENCE,
      ClaimValidityDomain.HOURS,
      ClaimValidityDomain.FEES_PRICING,
      ClaimValidityDomain.OPERATOR_RULES,
      ClaimValidityDomain.ADMISSION_AVAILABILITY,
      ClaimValidityDomain.OPERATOR_ADVERTISED_MATERIAL,
      ClaimValidityDomain.INCLUSION_PERMISSION,
    ],
    OPERATOR_PUBLIC: [
      ClaimValidityDomain.BUSINESS_EXISTENCE,
      ClaimValidityDomain.LOCATION,
      ClaimValidityDomain.HOURS,
      ClaimValidityDomain.FEES_PRICING,
      ClaimValidityDomain.OPERATOR_RULES,
      ClaimValidityDomain.OPERATOR_ADVERTISED_MATERIAL,
    ],
    OPERATOR: [
      ClaimValidityDomain.BUSINESS_EXISTENCE,
      ClaimValidityDomain.HOURS,
      ClaimValidityDomain.FEES_PRICING,
      ClaimValidityDomain.OPERATOR_RULES,
      ClaimValidityDomain.OPERATOR_ADVERTISED_MATERIAL,
    ],
    GOVERNMENT: [
      ClaimValidityDomain.OWNERSHIP_ADMIN,
      ClaimValidityDomain.VISIT_PERMISSION,
      ClaimValidityDomain.COLLECT_PERMISSION,
      ClaimValidityDomain.ROUTE_PERMISSION,
      ClaimValidityDomain.OPERATING_STATUS,
    ],
    GEOLOGICAL_SURVEY: [
      ClaimValidityDomain.GEOLOGIC_UNIT,
      ClaimValidityDomain.NATIVE_OCCURRENCE,
      ClaimValidityDomain.HISTORIC_EXISTENCE,
    ],
    OFFICIAL_TOURISM: [ClaimValidityDomain.BUSINESS_EXISTENCE, ClaimValidityDomain.LOCATION],
    ACADEMIC: [ClaimValidityDomain.GEOLOGIC_UNIT, ClaimValidityDomain.NATIVE_OCCURRENCE],
    MUSEUM: [ClaimValidityDomain.NATIVE_OCCURRENCE, ClaimValidityDomain.HISTORIC_EXISTENCE],
    CLUB: [ClaimValidityDomain.VISIT_PERMISSION, ClaimValidityDomain.OPERATOR_RULES],
    NEWS: [ClaimValidityDomain.BUSINESS_EXISTENCE, ClaimValidityDomain.OPERATING_STATUS],
    COMMUNITY: [ClaimValidityDomain.LOCATION, ClaimValidityDomain.OPERATOR_ADVERTISED_MATERIAL],
    SOCIAL: [ClaimValidityDomain.BUSINESS_EXISTENCE],
    SECONDARY_DIRECTORY: [ClaimValidityDomain.BUSINESS_EXISTENCE, ClaimValidityDomain.LOCATION],
    USER_OBSERVATION: [ClaimValidityDomain.LOCATION],
  };

export const SOURCE_DEFAULT_DOES_NOT_ESTABLISH: Partial<
  Record<SourceAuthorityClass, readonly ClaimValidityDomain[]>
> = {
  OFFICIAL_TOURISM: [ClaimValidityDomain.COLLECT_PERMISSION, ClaimValidityDomain.NATIVE_OCCURRENCE],
  OPERATOR_PUBLIC: [ClaimValidityDomain.NATIVE_OCCURRENCE, ClaimValidityDomain.COLLECT_PERMISSION],
  OPERATOR_DIRECT: [
    ClaimValidityDomain.NATIVE_OCCURRENCE,
    ClaimValidityDomain.LOGO_REUSE,
    ClaimValidityDomain.PHOTO_REUSE,
    ClaimValidityDomain.ENDORSEMENT,
    ClaimValidityDomain.PRIVATE_CONTACT_PUBLICATION,
  ],
  SECONDARY_DIRECTORY: [
    ClaimValidityDomain.COLLECT_PERMISSION,
    ClaimValidityDomain.OPERATING_STATUS,
    ClaimValidityDomain.NATIVE_OCCURRENCE,
  ],
  SOCIAL: [
    ClaimValidityDomain.COLLECT_PERMISSION,
    ClaimValidityDomain.OPERATING_STATUS,
    ClaimValidityDomain.NATIVE_OCCURRENCE,
  ],
  GOVERNMENT: [
    // Ownership/admin alone does not establish collecting permission without explicit claim.
  ],
};

export function sourceSupportsClaim(
  sourceType: SourceAuthorityClass,
  claim: ClaimValidityDomain
): boolean {
  return SOURCE_DEFAULT_SUPPORTS[sourceType].includes(claim);
}

export function sourceDoesNotEstablish(
  sourceType: SourceAuthorityClass,
  claim: ClaimValidityDomain
): boolean {
  const blocked = SOURCE_DEFAULT_DOES_NOT_ESTABLISH[sourceType] ?? [];
  return blocked.includes(claim);
}

// ---------------------------------------------------------------------------
// Phase 4–5 — Access axes + decision gaps (UNKNOWN ≠ ALLOWED)
// ---------------------------------------------------------------------------

export const AccessDecisionAxis = {
  VISIT: 'VISIT',
  OBSERVE: 'OBSERVE',
  PHOTOGRAPH: 'PHOTOGRAPH',
  COLLECT: 'COLLECT',
  COLLECT_WITH_PERMIT: 'COLLECT_WITH_PERMIT',
  ROUTE: 'ROUTE',
  OPERATING_STATUS: 'OPERATING_STATUS',
} as const;

export type AccessDecisionAxis = (typeof AccessDecisionAxis)[keyof typeof AccessDecisionAxis];

export { EvidencePermissionDimension, EvidencePermissionStatus };

export const DecisionGapKind = {
  VISIT_ALLOWED: 'VISIT_ALLOWED',
  COLLECT_ALLOWED: 'COLLECT_ALLOWED',
  ROUTE_ALLOWED: 'ROUTE_ALLOWED',
  OPEN_NOW: 'OPEN_NOW',
  MATERIAL_VERIFIED: 'MATERIAL_VERIFIED',
} as const;

export type DecisionGapKind = (typeof DecisionGapKind)[keyof typeof DecisionGapKind];

export const DecisionGapSchema = z.object({
  kind: z.enum([
    'VISIT_ALLOWED',
    'COLLECT_ALLOWED',
    'ROUTE_ALLOWED',
    'OPEN_NOW',
    'MATERIAL_VERIFIED',
  ]),
  reason: z.string().min(1),
  requiredAuthorityUnresolved: z.boolean(),
});

export type DecisionGap = z.infer<typeof DecisionGapSchema>;

/**
 * Fail closed: UNKNOWN / UNRESOLVED / CONFLICTED / STALE do not become ALLOWED.
 * A required unresolved authority blocks the action state.
 */
export function isActionBlockedByPermissionStatus(status: EvidencePermissionStatus): boolean {
  return status !== 'ALLOWED';
}

export function evaluateAccessDecisionGaps(input: {
  visit?: string;
  collect?: string;
  route?: string;
  operatingStatus?: string;
  materialClaims?: SiteMaterialClaim[];
}): DecisionGap[] {
  const gaps: DecisionGap[] = [];

  if (input.visit == null || input.visit === 'UNKNOWN' || input.visit === 'UNRESOLVED') {
    gaps.push({
      kind: DecisionGapKind.VISIT_ALLOWED,
      reason: 'Visit authority unresolved — UNKNOWN is not ALLOWED',
      requiredAuthorityUnresolved: true,
    });
  }
  if (input.collect == null || input.collect === 'UNKNOWN' || input.collect === 'UNRESOLVED') {
    gaps.push({
      kind: DecisionGapKind.COLLECT_ALLOWED,
      reason: 'Collect authority unresolved — UNKNOWN is not ALLOWED',
      requiredAuthorityUnresolved: true,
    });
  }
  if (input.route == null || input.route === 'UNKNOWN' || input.route === 'UNRESOLVED') {
    gaps.push({
      kind: DecisionGapKind.ROUTE_ALLOWED,
      reason: 'Route authority unresolved — UNKNOWN is not ALLOWED',
      requiredAuthorityUnresolved: true,
    });
  }
  if (
    input.operatingStatus == null ||
    input.operatingStatus === OperatingStatus.UNKNOWN ||
    input.operatingStatus === OperatingStatus.STALE
  ) {
    gaps.push({
      kind: DecisionGapKind.OPEN_NOW,
      reason: 'Operating status unknown or stale — not current OPEN',
      requiredAuthorityUnresolved: true,
    });
  }

  const claims = input.materialClaims ?? [];
  const hasVerifiedNative = claims.some((c) => {
    const certainty = normalizeMaterialClaimCertainty(c);
    return (
      certainty === MaterialCertainty.VERIFIED &&
      c.occurrenceType !== MaterialOccurrenceType.OPERATOR_ADVERTISED &&
      c.originClass !== MaterialOriginClass.SEEDED
    );
  });
  if (!hasVerifiedNative) {
    gaps.push({
      kind: DecisionGapKind.MATERIAL_VERIFIED,
      reason: 'No VERIFIED native material claim — operator advertising is not verification',
      requiredAuthorityUnresolved: true,
    });
  }

  return gaps;
}

export function unknownIsNotAllowed(): true {
  return true;
}

// ---------------------------------------------------------------------------
// Phase 6 — Claim-specific freshness
// ---------------------------------------------------------------------------

export const ClaimFreshnessPolicySchema = z.object({
  claimDomain: z.string().min(1),
  lastVerifiedAt: z.string().datetime({ offset: true }).optional(),
  sourceRetrievedAt: z.string().datetime({ offset: true }).optional(),
  effectiveFrom: z.string().datetime({ offset: true }).optional(),
  effectiveUntil: z.string().datetime({ offset: true }).optional(),
  staleAfterHours: z.number().positive().optional(),
});

export type ClaimFreshnessPolicy = z.infer<typeof ClaimFreshnessPolicySchema>;

export const DEFAULT_FRESHNESS_HORIZON_HOURS: Record<string, number> = {
  [ClaimValidityDomain.GEOLOGIC_UNIT]: 24 * 365 * 5,
  [ClaimValidityDomain.NATIVE_OCCURRENCE]: 24 * 365 * 2,
  [ClaimValidityDomain.HOURS]: 24 * 30,
  [ClaimValidityDomain.FEES_PRICING]: 24 * 30,
  [ClaimValidityDomain.OPERATING_STATUS]: 24 * 7,
  [ClaimValidityDomain.ADMISSION_AVAILABILITY]: 24 * 7,
  [ClaimValidityDomain.ROUTE_PERMISSION]: 24 * 3,
  [ClaimValidityDomain.COLLECT_PERMISSION]: 24 * 90,
};

export function isClaimStale(policy: ClaimFreshnessPolicy, nowIso: string): boolean {
  const now = Date.parse(nowIso);
  if (Number.isNaN(now)) return true;
  if (policy.effectiveUntil != null && Date.parse(policy.effectiveUntil) < now) {
    return true;
  }
  const horizon =
    policy.staleAfterHours ?? DEFAULT_FRESHNESS_HORIZON_HOURS[policy.claimDomain] ?? 24 * 90;
  const anchor = policy.lastVerifiedAt ?? policy.sourceRetrievedAt;
  if (anchor == null) return true;
  const t = Date.parse(anchor);
  if (Number.isNaN(t)) return true;
  return now - t > horizon * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Phase 7 — Operator-direct contact provenance
// ---------------------------------------------------------------------------

export const OperatorDirectContactProvenanceSchema = z.object({
  operatorBusiness: z.string().min(1),
  contactMethod: z.enum(['IN_PERSON', 'PHONE', 'EMAIL', 'WEB_FORM', 'MAIL', 'OTHER']),
  contactedAt: z.string().datetime({ offset: true }),
  actorRole: z.string().min(1).optional(),
  claimsConfirmed: z.array(z.string().min(1)).default([]),
  permissionGranted: z.boolean(),
  permissionScope: z
    .array(
      z.enum([
        'BUSINESS_EXISTENCE',
        'LOCATION',
        'HOURS',
        'FEES_PRICING',
        'OPERATOR_RULES',
        'ADMISSION_AVAILABILITY',
        'VISIT_PERMISSION',
        'COLLECT_PERMISSION',
        'ROUTE_PERMISSION',
        'OPERATING_STATUS',
        'OWNERSHIP_ADMIN',
        'HISTORIC_EXISTENCE',
        'OPERATOR_ADVERTISED_MATERIAL',
        'NATIVE_OCCURRENCE',
        'GEOLOGIC_UNIT',
        'INCLUSION_PERMISSION',
        'LOGO_REUSE',
        'PHOTO_REUSE',
        'ENDORSEMENT',
        'PRIVATE_CONTACT_PUBLICATION',
      ])
    )
    .default([]),
  followUpRequested: z.boolean().default(false),
  notes: z.string().optional(),
  recordedBy: z.string().min(1),
  provenanceEventId: z.string().min(1).optional(),
});

export type OperatorDirectContactProvenance = z.infer<typeof OperatorDirectContactProvenanceSchema>;

/**
 * Inclusion permission does not expand into logo/photo/endorsement/private contact.
 */
export function operatorInclusionDoesNotAuthorizeExtras(
  contact: OperatorDirectContactProvenance
): boolean {
  if (!contact.permissionGranted) return true;
  const scope = new Set(contact.permissionScope);
  if (!scope.has(ClaimValidityDomain.INCLUSION_PERMISSION)) return true;
  return (
    !scope.has(ClaimValidityDomain.LOGO_REUSE) &&
    !scope.has(ClaimValidityDomain.PHOTO_REUSE) &&
    !scope.has(ClaimValidityDomain.ENDORSEMENT) &&
    !scope.has(ClaimValidityDomain.PRIVATE_CONTACT_PUBLICATION)
  );
}

// ---------------------------------------------------------------------------
// Phase 8–9 — Admission + honest-empty public projection
// ---------------------------------------------------------------------------

/** Site-class-agnostic admission — same machinery for all SiteType values. */
export const SiteAdmissionStatus = FeeSiteAdmissionStatus;
export type SiteAdmissionStatus = FeeSiteAdmissionStatus;
export const SiteAdmissionStatusSchema = FeeSiteAdmissionStatusSchema;

export function isPubliclyProjectedAdmission(status: SiteAdmissionStatus): boolean {
  return isPubliclyDiscoverableAdmission(status);
}

export function testOnlyIsFailClosedFromPublic(status: SiteAdmissionStatus): boolean {
  return status !== FeeSiteAdmissionStatus.TEST_ONLY && isPubliclyProjectedAdmission(status)
    ? true
    : status === FeeSiteAdmissionStatus.TEST_ONLY
      ? false
      : !isPubliclyProjectedAdmission(status);
}

// ---------------------------------------------------------------------------
// Phase 10–11 — Observation immutability + specimen revision (append-only)
// ---------------------------------------------------------------------------

export const FieldObservationImmutableCoreSchema = z.object({
  observationId: z.string().min(1),
  originalGps: z
    .object({
      lat: z.number(),
      lon: z.number(),
      accuracyM: z.number().optional(),
    })
    .nullable(),
  originalTimestamp: z.string().datetime({ offset: true }),
  originalPhotoRef: z.string().nullable().optional(),
  originalNotes: z.string().nullable().optional(),
});

export type FieldObservationImmutableCore = z.infer<typeof FieldObservationImmutableCoreSchema>;

export const SpecimenIdentificationRevisionSchema = z.object({
  revisionId: z.string().min(1),
  specimenId: z.string().min(1),
  kind: z.enum([
    'INITIAL_UNKNOWN',
    'USER_HYPOTHESIS',
    'AI_SUGGESTION',
    'EXPERT_SUPPORTED',
    'LATER_REVISION',
    'CONFLICTING_IDENTIFICATION',
  ]),
  label: z.string().min(1),
  certainty: ClaimCertaintySchema,
  recordedAt: z.string().datetime({ offset: true }),
  recordedBy: z.string().min(1),
  sourceIds: z.array(z.string().min(1)).default([]),
  supersedesRevisionId: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export type SpecimenIdentificationRevision = z.infer<typeof SpecimenIdentificationRevisionSchema>;

export function appendSpecimenRevision(
  history: SpecimenIdentificationRevision[],
  next: SpecimenIdentificationRevision
): SpecimenIdentificationRevision[] {
  const validated = SpecimenIdentificationRevisionSchema.parse(next);
  // Append-only — never rewrite prior revisions.
  return [...history, validated];
}

export function currentSpecimenHeads(
  history: SpecimenIdentificationRevision[]
): SpecimenIdentificationRevision[] {
  if (history.length === 0) return [];
  const superseded = new Set(
    history.map((h) => h.supersedesRevisionId).filter((id): id is string => id != null)
  );
  const heads = history.filter((h) => !superseded.has(h.revisionId));
  const conflicted = heads.filter((h) => h.certainty === ClaimCertainty.CONFLICTED);
  if (conflicted.length > 0) return conflicted;
  // Multiple non-superseded heads with differing labels → multi-head ambiguity
  const labels = new Set(heads.map((h) => h.label));
  if (labels.size > 1) {
    return heads.map((h) => ({
      ...h,
      certainty: ClaimCertainty.CONFLICTED,
      kind: 'CONFLICTING_IDENTIFICATION' as const,
    }));
  }
  return heads;
}

// ---------------------------------------------------------------------------
// Phase 14 — Geology / material claim separation helpers
// ---------------------------------------------------------------------------

export function operatorAdvertisedIsNotVerifiedGeology(claim: SiteMaterialClaim): boolean {
  if (claim.occurrenceType !== MaterialOccurrenceType.OPERATOR_ADVERTISED) return true;
  return normalizeMaterialClaimCertainty(claim) !== MaterialCertainty.VERIFIED;
}

/**
 * USER_OBSERVED / GEOLOGICALLY_SUPPORTED / HISTORIC remain distinct from VERIFIED certainty.
 * GEOLOGICALLY_SUPPORTED occurrence does not auto-elevate certainty to VERIFIED.
 */
export function occurrenceTypeIsNotAutomaticVerification(
  occurrenceType: MaterialOccurrenceType
): boolean {
  return (
    occurrenceType === MaterialOccurrenceType.OPERATOR_ADVERTISED ||
    occurrenceType === MaterialOccurrenceType.USER_OBSERVED ||
    occurrenceType === MaterialOccurrenceType.COMMUNITY_REPORTED ||
    occurrenceType === MaterialOccurrenceType.HISTORIC ||
    occurrenceType === MaterialOccurrenceType.GEOLOGICALLY_SUPPORTED ||
    occurrenceType === MaterialOccurrenceType.PRIMARY ||
    occurrenceType === MaterialOccurrenceType.SECONDARY
  );
}

export function seededIsNotNativeMaterial(claim: SiteMaterialClaim): boolean {
  if (claim.originClass !== MaterialOriginClass.SEEDED) return true;
  // Seeded origin must never be treated as VERIFIED native occurrence.
  return normalizeMaterialClaimCertainty(claim) !== MaterialCertainty.VERIFIED;
}

// ---------------------------------------------------------------------------
// Phase 15 — Multi-head conflict (deterministic; order-independent)
// ---------------------------------------------------------------------------

export function projectConflictedClaims<T extends { id: string; label: string; certainty: string }>(
  claims: T[]
): { heads: T[]; conflicted: boolean } {
  const byLabel = new Map<string, T[]>();
  for (const c of [...claims].sort((a, b) => a.id.localeCompare(b.id))) {
    const list = byLabel.get(c.label) ?? [];
    list.push(c);
    byLabel.set(c.label, list);
  }
  const activeLabels = [...byLabel.keys()].sort();
  if (activeLabels.length <= 1) {
    return { heads: claims, conflicted: false };
  }
  return {
    heads: [...claims].sort((a, b) => a.id.localeCompare(b.id)),
    conflicted: true,
  };
}

// ---------------------------------------------------------------------------
// Phase 16 — State pack readiness
// ---------------------------------------------------------------------------

export const StatePackReadiness = {
  NOT_STARTED: 'NOT_STARTED',
  RESEARCHING: 'RESEARCHING',
  CORE_READY: 'CORE_READY',
  DEEP_READY: 'DEEP_READY',
  STALE: 'STALE',
  REVALIDATION_REQUIRED: 'REVALIDATION_REQUIRED',
} as const;

export type StatePackReadiness = (typeof StatePackReadiness)[keyof typeof StatePackReadiness];

export const StatePackReadinessSchema = z.enum([
  'NOT_STARTED',
  'RESEARCHING',
  'CORE_READY',
  'DEEP_READY',
  'STALE',
  'REVALIDATION_REQUIRED',
]);

export const StatePackCoreReadyRequirements = [
  'authoritative_access_legal_sources',
  'site_provenance',
  'jurisdiction_rules',
  'major_hazards',
  'state_specific_collecting_rules',
  'source_freshness',
] as const;

// ---------------------------------------------------------------------------
// Phase 18 — Business / resource site types (reuse SiteType; additive)
// ---------------------------------------------------------------------------

export const RESOURCE_SITE_TYPES = [
  SiteType.CLUB_SITE,
  SiteType.ROCK_SHOP,
  SiteType.IDENTIFICATION_RESOURCE,
  SiteType.MUSEUM,
] as const;

export function isResourceOrBusinessSiteType(siteType: string): boolean {
  return (
    siteType === SiteType.CLUB_SITE ||
    siteType === SiteType.ROCK_SHOP ||
    siteType === SiteType.IDENTIFICATION_RESOURCE ||
    siteType === SiteType.MUSEUM
  );
}

// ---------------------------------------------------------------------------
// Phase 19 — Operator/partner model (paid never alters trust)
// ---------------------------------------------------------------------------

export const OperatorListingTier = {
  BASIC_FACTUAL: 'BASIC_FACTUAL',
  OPERATOR_CONFIRMED: 'OPERATOR_CONFIRMED',
  ENHANCED_PAID: 'ENHANCED_PAID',
} as const;

export type OperatorListingTier = (typeof OperatorListingTier)[keyof typeof OperatorListingTier];

export function paidTierDoesNotAlterTrust(_tier: OperatorListingTier): true {
  return true;
}

// ---------------------------------------------------------------------------
// Phase 20 — Environmental context (interfaces only; no SAFE/UNSAFE collapse)
// ---------------------------------------------------------------------------

export const EnvironmentalConditionSchema = z.object({
  condition: z.enum(['WEATHER', 'HEAT', 'FLOOD', 'SNOW', 'FIRE', 'TIDE', 'ROAD', 'OTHER']),
  summary: z.string().min(1),
  siteImpact: z.string().min(1),
  source: KernelSourceRecordSchema.optional(),
  observedAt: z.string().datetime({ offset: true }),
});

export type EnvironmentalCondition = z.infer<typeof EnvironmentalConditionSchema>;

// ---------------------------------------------------------------------------
// Phase 21 — Release state model
// ---------------------------------------------------------------------------

export const ReleaseState = {
  DESIGNED: 'DESIGNED',
  IMPLEMENTED: 'IMPLEMENTED',
  CONNECTED: 'CONNECTED',
  TESTED: 'TESTED',
  FIELD_PROVEN: 'FIELD_PROVEN',
  PRODUCTION_PROVEN: 'PRODUCTION_PROVEN',
} as const;

export type ReleaseState = (typeof ReleaseState)[keyof typeof ReleaseState];

export const ReleaseStateSchema = z.enum([
  'DESIGNED',
  'IMPLEMENTED',
  'CONNECTED',
  'TESTED',
  'FIELD_PROVEN',
  'PRODUCTION_PROVEN',
]);

// ---------------------------------------------------------------------------
// Phase 23 — Adversarial negative controls (kernel-wide)
// ---------------------------------------------------------------------------

export function assertTrustFieldNegativeControls(input: {
  envelope?: FeeSiteMetadataEnvelope;
  publicLand?: boolean;
  collectAllowed?: boolean;
  mapped?: boolean;
  visitAllowed?: boolean;
  permitExists?: boolean;
  permitHeld?: boolean;
  roadExists?: boolean;
  routeAllowed?: boolean;
  historicRecord?: boolean;
  currentSite?: boolean;
  socialPostOfficial?: boolean;
  aiIdentificationVerified?: boolean;
  testOnlyPublic?: boolean;
  offlineRetryDuplicate?: boolean;
  conflictingSourcesChoseOne?: boolean;
}): Record<string, boolean> {
  return {
    mappedIsNotLegal: !(
      input.mapped === true &&
      input.visitAllowed === true &&
      input.envelope == null
    ),
    publicLandIsNotCollectAllowed: !(input.publicLand === true && input.collectAllowed === true),
    operatorClaimIsNotGeologyVerification: (input.envelope?.materialClaims ?? []).every(
      operatorAdvertisedIsNotVerifiedGeology
    ),
    businessExistsIsNotOpenNow: (() => {
      const env = input.envelope;
      if (env == null) return true;
      // Existence alone never implies OPEN_CONFIRMED + visit ALLOWED.
      return !(
        env.operatingStatus === OperatingStatus.OPEN_CONFIRMED &&
        env.accessAxes?.visit === 'ALLOWED' &&
        (env.sources.length ?? 0) === 0
      );
    })(),
    feeSiteIsNotCurrentAdmission:
      input.envelope == null ||
      input.envelope.operatingStatus === OperatingStatus.UNKNOWN ||
      input.envelope.operatingStatus === OperatingStatus.STALE ||
      input.envelope.accessAxes?.visit !== 'ALLOWED',
    historicIsNotCurrent: !(input.historicRecord === true && input.currentSite === true),
    permitExistsIsNotPermitHeld: !(input.permitExists === true && input.permitHeld === true),
    roadExistsIsNotRouteAllowed: !(input.roadExists === true && input.routeAllowed === true),
    socialIsNotOfficial: input.socialPostOfficial !== true,
    aiIdIsNotVerified: input.aiIdentificationVerified !== true,
    testOnlyNotPublic: input.testOnlyPublic !== true,
    offlineRetryNotDuplicate: input.offlineRetryDuplicate !== true,
    conflictingSourcesNotSingularTruth: input.conflictingSourcesChoseOne !== true,
  };
}
