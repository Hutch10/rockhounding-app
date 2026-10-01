/**
 * Fee-site / pay-to-dig support R1 (Rocky Atlas)
 *
 * Extends canonical locations — does not create a parallel fee-mine system.
 * Site type is not VISIT/COLLECT/ROUTE permission. Operating status is not
 * collecting permission. Operator advertising is not verified geology.
 * Price text is not a guarantee of current admission cost.
 */

import { z } from 'zod';

import { AccessModel, LegalTag, Status } from './enums';
import { AccessModelSchema } from './schemas';

export { AccessModel, AccessModelSchema };

export const FEE_SITE_SUPPORT_SCHEMA_VERSION = 1;
export const FEE_SITE_SUPPORT_CONTRACT_ID = 'rockhounding:fee-site-support';

const IsoDateTimeSchema = z.string().datetime({ offset: true });

/**
 * Product-facing site class. Maps onto LegalTag / AccessModel where possible.
 * FEE_MINE is the Rocky Atlas name for LEGAL_FEE_SITE / FEE_SITE.
 */
export const SiteType = {
  FEE_MINE: 'FEE_MINE',
  PUBLIC_COLLECTING: 'PUBLIC_COLLECTING',
  PERMIT_REQUIRED: 'PERMIT_REQUIRED',
  CLUB_SITE: 'CLUB_SITE',
  GEOLOGIC_POI: 'GEOLOGIC_POI',
  HISTORIC_LOCALITY: 'HISTORIC_LOCALITY',
  RESTRICTED: 'RESTRICTED',
  /** Rock shop / specimen retailer — reuses location/trust kernel (not a parallel directory). */
  ROCK_SHOP: 'ROCK_SHOP',
  /** Identification / appraisal resource — same kernel. */
  IDENTIFICATION_RESOURCE: 'IDENTIFICATION_RESOURCE',
  /** Museum / exhibit resource — same kernel. */
  MUSEUM: 'MUSEUM',
  UNKNOWN: 'UNKNOWN',
} as const;

export type SiteType = (typeof SiteType)[keyof typeof SiteType];

export const SiteTypeSchema = z.enum([
  'FEE_MINE',
  'PUBLIC_COLLECTING',
  'PERMIT_REQUIRED',
  'CLUB_SITE',
  'GEOLOGIC_POI',
  'HISTORIC_LOCALITY',
  'RESTRICTED',
  'ROCK_SHOP',
  'IDENTIFICATION_RESOURCE',
  'MUSEUM',
  'UNKNOWN',
]);

/**
 * How a fee site sells collecting access. Not operating status.
 */
export const FeeAccessModel = {
  PAY_TO_DIG: 'PAY_TO_DIG',
  PAY_TO_SCREEN: 'PAY_TO_SCREEN',
  PAY_TO_COLLECT: 'PAY_TO_COLLECT',
  GUIDED_DIG: 'GUIDED_DIG',
  APPOINTMENT_ONLY: 'APPOINTMENT_ONLY',
  MEMBERSHIP: 'MEMBERSHIP',
  OTHER: 'OTHER',
  UNKNOWN: 'UNKNOWN',
} as const;

export type FeeAccessModel = (typeof FeeAccessModel)[keyof typeof FeeAccessModel];

export const FeeAccessModelSchema = z.enum([
  'PAY_TO_DIG',
  'PAY_TO_SCREEN',
  'PAY_TO_COLLECT',
  'GUIDED_DIG',
  'APPOINTMENT_ONLY',
  'MEMBERSHIP',
  'OTHER',
  'UNKNOWN',
]);

/**
 * Evidence-backed operating status. OPEN_* is not collecting permission.
 * Do not infer OPEN_CONFIRMED from stale websites or social posts alone.
 */
export const OperatingStatus = {
  OPEN_CONFIRMED: 'OPEN_CONFIRMED',
  OPEN_REPORTED: 'OPEN_REPORTED',
  SEASONAL: 'SEASONAL',
  APPOINTMENT_REQUIRED: 'APPOINTMENT_REQUIRED',
  TEMPORARILY_CLOSED: 'TEMPORARILY_CLOSED',
  PERMANENTLY_CLOSED: 'PERMANENTLY_CLOSED',
  STALE: 'STALE',
  UNKNOWN: 'UNKNOWN',
} as const;

export type OperatingStatus = (typeof OperatingStatus)[keyof typeof OperatingStatus];

export const OperatingStatusSchema = z.enum([
  'OPEN_CONFIRMED',
  'OPEN_REPORTED',
  'SEASONAL',
  'APPOINTMENT_REQUIRED',
  'TEMPORARILY_CLOSED',
  'PERMANENTLY_CLOSED',
  'STALE',
  'UNKNOWN',
]);

export const CollectingMethod = {
  IN_SITU: 'IN_SITU',
  TAILINGS: 'TAILINGS',
  SCREENING: 'SCREENING',
  WASHING: 'WASHING',
  SURFACE_COLLECTING: 'SURFACE_COLLECTING',
  QUARRY_PILE: 'QUARRY_PILE',
  SEEDED_MATERIAL: 'SEEDED_MATERIAL',
  MIXED: 'MIXED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type CollectingMethod = (typeof CollectingMethod)[keyof typeof CollectingMethod];

export const CollectingMethodSchema = z.enum([
  'IN_SITU',
  'TAILINGS',
  'SCREENING',
  'WASHING',
  'SURFACE_COLLECTING',
  'QUARRY_PILE',
  'SEEDED_MATERIAL',
  'MIXED',
  'UNKNOWN',
]);

export const MaterialOriginClass = {
  NATURAL: 'NATURAL',
  SEEDED: 'SEEDED',
  /** Native plus enriched/supplemented paths present — do not collapse to NATURAL. */
  MIXED: 'MIXED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type MaterialOriginClass = (typeof MaterialOriginClass)[keyof typeof MaterialOriginClass];

export const MaterialOriginClassSchema = z.enum(['NATURAL', 'SEEDED', 'MIXED', 'UNKNOWN']);

export const MaterialOccurrenceType = {
  PRIMARY: 'PRIMARY',
  SECONDARY: 'SECONDARY',
  OPERATOR_ADVERTISED: 'OPERATOR_ADVERTISED',
  HISTORIC: 'HISTORIC',
  COMMUNITY_REPORTED: 'COMMUNITY_REPORTED',
  /** Field user observation — not automatically verified geology. */
  USER_OBSERVED: 'USER_OBSERVED',
  /** Geologically supported occurrence — still distinct from VERIFIED certainty. */
  GEOLOGICALLY_SUPPORTED: 'GEOLOGICALLY_SUPPORTED',
} as const;

export type MaterialOccurrenceType =
  (typeof MaterialOccurrenceType)[keyof typeof MaterialOccurrenceType];

export const MaterialOccurrenceTypeSchema = z.enum([
  'PRIMARY',
  'SECONDARY',
  'OPERATOR_ADVERTISED',
  'HISTORIC',
  'COMMUNITY_REPORTED',
  'USER_OBSERVED',
  'GEOLOGICALLY_SUPPORTED',
]);

/**
 * Certainty is independent of confidence. OPERATOR_ADVERTISED must not
 * auto-promote to VERIFIED.
 */
export const MaterialCertainty = {
  VERIFIED: 'VERIFIED',
  SUPPORTED: 'SUPPORTED',
  REPORTED: 'REPORTED',
  UNRESOLVED: 'UNRESOLVED',
  CONFLICTED: 'CONFLICTED',
  STALE: 'STALE',
} as const;

export type MaterialCertainty = (typeof MaterialCertainty)[keyof typeof MaterialCertainty];

export const MaterialCertaintySchema = z.enum([
  'VERIFIED',
  'SUPPORTED',
  'REPORTED',
  'UNRESOLVED',
  'CONFLICTED',
  'STALE',
]);

export const FeeSiteAdmissionStatus = {
  DISCOVERED: 'DISCOVERED',
  RESEARCHING: 'RESEARCHING',
  EVIDENCE_SUFFICIENT: 'EVIDENCE_SUFFICIENT',
  ADMITTED: 'ADMITTED',
  PUBLISHED: 'PUBLISHED',
  STALE: 'STALE',
  CONFLICTED: 'CONFLICTED',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED',
  TEST_ONLY: 'TEST_ONLY',
} as const;

export type FeeSiteAdmissionStatus =
  (typeof FeeSiteAdmissionStatus)[keyof typeof FeeSiteAdmissionStatus];

export const FeeSiteAdmissionStatusSchema = z.enum([
  'DISCOVERED',
  'RESEARCHING',
  'EVIDENCE_SUFFICIENT',
  'ADMITTED',
  'PUBLISHED',
  'STALE',
  'CONFLICTED',
  'CLOSED',
  'REJECTED',
  'TEST_ONLY',
]);

export const FeeSiteSourceAuthority = {
  /** Prefer OPERATOR_DIRECT / OPERATOR_PUBLIC for new records. */
  OPERATOR: 'OPERATOR',
  OPERATOR_DIRECT: 'OPERATOR_DIRECT',
  OPERATOR_PUBLIC: 'OPERATOR_PUBLIC',
  GOVERNMENT: 'GOVERNMENT',
  OFFICIAL_TOURISM: 'OFFICIAL_TOURISM',
  GEOLOGICAL_SURVEY: 'GEOLOGICAL_SURVEY',
  ACADEMIC: 'ACADEMIC',
  MUSEUM: 'MUSEUM',
  CLUB: 'CLUB',
  NEWS: 'NEWS',
  COMMUNITY: 'COMMUNITY',
  SOCIAL: 'SOCIAL',
  SECONDARY_DIRECTORY: 'SECONDARY_DIRECTORY',
  USER_OBSERVATION: 'USER_OBSERVATION',
} as const;

export type FeeSiteSourceAuthority =
  (typeof FeeSiteSourceAuthority)[keyof typeof FeeSiteSourceAuthority];

export const FeeSiteSourceAuthoritySchema = z.enum([
  'OPERATOR',
  'OPERATOR_DIRECT',
  'OPERATOR_PUBLIC',
  'GOVERNMENT',
  'OFFICIAL_TOURISM',
  'GEOLOGICAL_SURVEY',
  'ACADEMIC',
  'MUSEUM',
  'CLUB',
  'NEWS',
  'COMMUNITY',
  'SOCIAL',
  'SECONDARY_DIRECTORY',
  'USER_OBSERVATION',
]);

export const OperatorClaimState = {
  UNCLAIMED: 'UNCLAIMED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  DISPUTED: 'DISPUTED',
  REVOKED: 'REVOKED',
} as const;

export type OperatorClaimState = (typeof OperatorClaimState)[keyof typeof OperatorClaimState];

export const OperatorClaimStateSchema = z.enum([
  'UNCLAIMED',
  'PENDING',
  'VERIFIED',
  'DISPUTED',
  'REVOKED',
]);

export const UnknownableStringSchema = z.union([z.string().min(1), z.literal('UNKNOWN')]);

export const FeeSiteSourceRecordSchema = z.object({
  authorityClass: FeeSiteSourceAuthoritySchema,
  url: z.string().url().optional(),
  reference: z.string().min(1).optional(),
  publisher: z.string().min(1).optional(),
  retrievedAt: IsoDateTimeSchema,
  publishedAt: IsoDateTimeSchema.optional(),
  contentHash: z.string().min(1).optional(),
});

export type FeeSiteSourceRecord = z.infer<typeof FeeSiteSourceRecordSchema>;

export const FeeSiteProfileSchema = z.object({
  operatorName: UnknownableStringSchema.default('UNKNOWN'),
  operatorClaimState: OperatorClaimStateSchema.default('UNCLAIMED'),
  feeAccessModel: FeeAccessModelSchema.default('UNKNOWN'),
  pricingSummary: UnknownableStringSchema.default('UNKNOWN'),
  pricingVerifiedAt: IsoDateTimeSchema.optional(),
  reservationRequired: z.enum(['YES', 'NO', 'UNKNOWN']).default('UNKNOWN'),
  walkInStatus: z.enum(['ACCEPTED', 'NOT_ACCEPTED', 'UNKNOWN']).default('UNKNOWN'),
  seasonality: UnknownableStringSchema.default('UNKNOWN'),
  hours: UnknownableStringSchema.default('UNKNOWN'),
  waiverRequired: z.enum(['YES', 'NO', 'UNKNOWN']).default('UNKNOWN'),
  ageRestrictions: UnknownableStringSchema.default('UNKNOWN'),
  toolPolicy: UnknownableStringSchema.default('UNKNOWN'),
  amenities: z.array(z.string().min(1)).default([]),
  accessibilityNotes: UnknownableStringSchema.default('UNKNOWN'),
  familyBeginnerSuitability: z
    .enum(['SUITABLE', 'LIMITED', 'NOT_SUITABLE', 'UNKNOWN'])
    .default('UNKNOWN'),
  lastOperatorConfirmationAt: IsoDateTimeSchema.optional(),
  contactDetails: UnknownableStringSchema.default('UNKNOWN'),
});

export type FeeSiteProfile = z.infer<typeof FeeSiteProfileSchema>;

export const CollectingContextSchema = z.object({
  method: CollectingMethodSchema.default('UNKNOWN'),
  materialOrigin: MaterialOriginClassSchema.default('UNKNOWN'),
  keepTakeHomeAllowed: z.enum(['YES', 'NO', 'UNKNOWN']).default('UNKNOWN'),
  quantityRestrictions: UnknownableStringSchema.default('UNKNOWN'),
  toolRestrictions: UnknownableStringSchema.default('UNKNOWN'),
});

export type CollectingContext = z.infer<typeof CollectingContextSchema>;

export const SiteMaterialClaimSchema = z.object({
  materialId: z.string().uuid().optional(),
  materialName: z.string().min(1),
  occurrenceType: MaterialOccurrenceTypeSchema,
  certainty: MaterialCertaintySchema,
  originClass: MaterialOriginClassSchema.default('UNKNOWN'),
  source: FeeSiteSourceRecordSchema.optional(),
  lastVerifiedAt: IsoDateTimeSchema.optional(),
  notes: z.string().optional(),
});

export type SiteMaterialClaim = z.infer<typeof SiteMaterialClaimSchema>;

/**
 * Distinct evidence-backed axes. Never collapse into a single traffic light.
 */
export const SiteAccessAxesSchema = z.object({
  visit: z
    .enum(['ALLOWED', 'RESTRICTED', 'PERMIT_REQUIRED', 'PROHIBITED', 'UNKNOWN'])
    .default('UNKNOWN'),
  collect: z
    .enum(['ALLOWED', 'RESTRICTED', 'PERMIT_REQUIRED', 'PROHIBITED', 'UNKNOWN'])
    .default('UNKNOWN'),
  route: z
    .enum(['ALLOWED', 'RESTRICTED', 'PERMIT_REQUIRED', 'PROHIBITED', 'UNKNOWN'])
    .default('UNKNOWN'),
  operatingStatus: OperatingStatusSchema.default('UNKNOWN'),
});

export type SiteAccessAxes = z.infer<typeof SiteAccessAxesSchema>;

export const FeeSiteMetadataEnvelopeSchema = z.object({
  siteType: SiteTypeSchema.default('UNKNOWN'),
  /**
   * Additional roles on the same location (e.g. FEE_MINE + ROCK_SHOP + IDENTIFICATION_RESOURCE).
   * Prefer this over duplicate location rows. Primary `siteType` remains the map/admission anchor.
   */
  secondarySiteTypes: z.array(SiteTypeSchema).default([]),
  accessModel: AccessModelSchema.default(AccessModel.UNKNOWN),
  operatingStatus: OperatingStatusSchema.default('UNKNOWN'),
  accessAxes: SiteAccessAxesSchema.optional(),
  feeProfile: FeeSiteProfileSchema.optional(),
  collectingContext: CollectingContextSchema.optional(),
  materialClaims: z.array(SiteMaterialClaimSchema).default([]),
  admissionStatus: FeeSiteAdmissionStatusSchema.default('DISCOVERED'),
  sources: z.array(FeeSiteSourceRecordSchema).default([]),
  lastVerifiedAt: IsoDateTimeSchema.optional(),
  /** Future Claim This Site — editable surface only; mutations are provenance events. */
  operatorClaimEditable: z
    .object({
      hours: z.boolean().default(true),
      pricing: z.boolean().default(true),
      season: z.boolean().default(true),
      contactDetails: z.boolean().default(true),
      collectingRules: z.boolean().default(true),
      amenities: z.boolean().default(true),
      temporaryClosures: z.boolean().default(true),
    })
    .optional(),
});

export type FeeSiteMetadataEnvelope = z.infer<typeof FeeSiteMetadataEnvelopeSchema>;

export const FEE_SITE_METADATA_KEY = 'fee_site';

export function isFeeMineSiteType(siteType: SiteType | null | undefined): boolean {
  return siteType === SiteType.FEE_MINE;
}

/** Primary + secondary roles without inventing a second location record. */
export function locationSiteRoles(
  envelope: Pick<FeeSiteMetadataEnvelope, 'siteType' | 'secondarySiteTypes'> | null | undefined
): SiteType[] {
  if (envelope == null) return [];
  const primary = envelope.siteType ?? SiteType.UNKNOWN;
  const secondary = envelope.secondarySiteTypes ?? [];
  const out: SiteType[] = [primary];
  for (const role of secondary) {
    if (role !== primary && !out.includes(role)) out.push(role);
  }
  return out;
}

export function locationHasSiteRole(
  envelope: Pick<FeeSiteMetadataEnvelope, 'siteType' | 'secondarySiteTypes'> | null | undefined,
  role: SiteType
): boolean {
  return locationSiteRoles(envelope).includes(role);
}

export function siteTypeToAccessModel(siteType: SiteType): AccessModel {
  switch (siteType) {
    case SiteType.FEE_MINE:
      return AccessModel.FEE_SITE;
    case SiteType.PUBLIC_COLLECTING:
      return AccessModel.PUBLIC_LAND;
    case SiteType.PERMIT_REQUIRED:
      return AccessModel.PERMISSION_REQUIRED;
    case SiteType.CLUB_SITE:
      return AccessModel.CLUB_ONLY;
    case SiteType.ROCK_SHOP:
    case SiteType.IDENTIFICATION_RESOURCE:
    case SiteType.MUSEUM:
      // Business/resource listings — not land-access models.
      return AccessModel.UNKNOWN;
    default:
      return AccessModel.UNKNOWN;
  }
}

export function siteTypeToLegalTag(siteType: SiteType): LegalTag | null {
  switch (siteType) {
    case SiteType.FEE_MINE:
      return LegalTag.LEGAL_FEE_SITE;
    case SiteType.PUBLIC_COLLECTING:
      return LegalTag.LEGAL_PUBLIC;
    case SiteType.CLUB_SITE:
      return LegalTag.LEGAL_CLUB_SUPERVISED;
    case SiteType.RESTRICTED:
      return LegalTag.GRAY_AREA;
    case SiteType.HISTORIC_LOCALITY:
    case SiteType.GEOLOGIC_POI:
    case SiteType.ROCK_SHOP:
    case SiteType.IDENTIFICATION_RESOURCE:
    case SiteType.MUSEUM:
      return LegalTag.RESEARCH_ONLY;
    default:
      return null;
  }
}

export function legalTagToSiteType(tag: LegalTag | string | null | undefined): SiteType {
  switch (tag) {
    case LegalTag.LEGAL_FEE_SITE:
    case 'LEGAL_FEE_SITE':
      return SiteType.FEE_MINE;
    case LegalTag.LEGAL_PUBLIC:
    case 'LEGAL_PUBLIC':
      return SiteType.PUBLIC_COLLECTING;
    case LegalTag.LEGAL_CLUB_SUPERVISED:
    case 'LEGAL_CLUB_SUPERVISED':
      return SiteType.CLUB_SITE;
    case LegalTag.GRAY_AREA:
    case 'GRAY_AREA':
      return SiteType.RESTRICTED;
    case LegalTag.RESEARCH_ONLY:
    case 'RESEARCH_ONLY':
      return SiteType.GEOLOGIC_POI;
    default:
      return SiteType.UNKNOWN;
  }
}

export function accessModelToSiteType(model: AccessModel | string | null | undefined): SiteType {
  switch (model) {
    case AccessModel.FEE_SITE:
    case 'FEE_SITE':
    case 'fee_dig':
    case 'fee_required':
      return SiteType.FEE_MINE;
    case AccessModel.PUBLIC_LAND:
    case 'PUBLIC_LAND':
    case 'free_public':
      return SiteType.PUBLIC_COLLECTING;
    case AccessModel.PERMISSION_REQUIRED:
    case 'PERMISSION_REQUIRED':
      return SiteType.PERMIT_REQUIRED;
    case AccessModel.CLUB_ONLY:
    case 'CLUB_ONLY':
      return SiteType.CLUB_SITE;
    default:
      return SiteType.UNKNOWN;
  }
}

/** Map rich operating status onto locked Build Document Status without inventing permission. */
export function operatingStatusToLegacyStatus(operating: OperatingStatus): Status {
  switch (operating) {
    case OperatingStatus.OPEN_CONFIRMED:
    case OperatingStatus.OPEN_REPORTED:
    case OperatingStatus.APPOINTMENT_REQUIRED:
      return Status.OPEN;
    case OperatingStatus.SEASONAL:
      return Status.SEASONAL;
    case OperatingStatus.TEMPORARILY_CLOSED:
    case OperatingStatus.PERMANENTLY_CLOSED:
      return Status.CLOSED;
    case OperatingStatus.STALE:
      return Status.RESEARCH_REQUIRED;
    default:
      return Status.UNKNOWN;
  }
}

/**
 * Operator-advertised materials must not become VERIFIED geology automatically.
 */
export function normalizeMaterialClaimCertainty(claim: SiteMaterialClaim): MaterialCertainty {
  if (
    claim.occurrenceType === MaterialOccurrenceType.OPERATOR_ADVERTISED &&
    claim.certainty === MaterialCertainty.VERIFIED
  ) {
    return MaterialCertainty.REPORTED;
  }
  return claim.certainty;
}

export function seededIsNotNativeOccurrence(context: CollectingContext): boolean {
  return (
    context.method === CollectingMethod.SEEDED_MATERIAL ||
    context.materialOrigin === MaterialOriginClass.SEEDED ||
    context.materialOrigin === MaterialOriginClass.MIXED ||
    context.method === CollectingMethod.MIXED
  );
}

/**
 * Fail-closed publication gate. TEST_ONLY never publishes. Price may be UNKNOWN.
 * Collecting permission is never assumed from mapping alone.
 */
export function evaluateFeeSitePublicationReadiness(input: {
  identifiableSite: boolean;
  sufficientCoordinates: boolean;
  identifiableOperator: boolean;
  currentOperationEvidence: boolean;
  collectingActivityConfirmed: boolean;
  accessTermsSufficientlyKnown: boolean;
  unresolvedMisleadingContradiction: boolean;
  admissionStatus: FeeSiteAdmissionStatus;
  /** When ROCK_SHOP / MUSEUM / IDENTIFICATION_RESOURCE, dig collecting is not required. */
  siteType?: SiteType;
}): { publishable: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const resourceOnly =
    input.siteType === SiteType.ROCK_SHOP ||
    input.siteType === SiteType.MUSEUM ||
    input.siteType === SiteType.IDENTIFICATION_RESOURCE;
  if (input.admissionStatus === FeeSiteAdmissionStatus.TEST_ONLY) {
    reasons.push('TEST_ONLY fixtures must not publish');
  }
  if (input.admissionStatus === FeeSiteAdmissionStatus.REJECTED) {
    reasons.push('REJECTED admission');
  }
  if (!input.identifiableSite) reasons.push('site not identifiable');
  if (!input.sufficientCoordinates) reasons.push('coordinates insufficient');
  if (!input.identifiableOperator) reasons.push('operator not identifiable');
  if (!input.currentOperationEvidence) reasons.push('current operation evidence missing');
  if (!resourceOnly && !input.collectingActivityConfirmed) {
    reasons.push('collecting activity not confirmed');
  }
  if (!input.accessTermsSufficientlyKnown) reasons.push('access terms insufficient');
  if (input.unresolvedMisleadingContradiction) reasons.push('unresolved misleading contradiction');
  return { publishable: reasons.length === 0, reasons };
}

export function isPubliclyDiscoverableAdmission(status: FeeSiteAdmissionStatus): boolean {
  return status === FeeSiteAdmissionStatus.ADMITTED || status === FeeSiteAdmissionStatus.PUBLISHED;
}

export function parseFeeSiteEnvelope(
  metadata: Record<string, unknown> | null | undefined
): FeeSiteMetadataEnvelope | null {
  if (metadata == null) return null;
  const raw = metadata[FEE_SITE_METADATA_KEY] ?? metadata.feeSite ?? null;
  if (raw == null || typeof raw !== 'object') {
    // Legacy hints without envelope
    const siteTypeHint =
      typeof metadata.site_type === 'string'
        ? metadata.site_type
        : typeof metadata.access_model === 'string'
          ? accessModelToSiteType(metadata.access_model)
          : typeof metadata.legal_tag === 'string'
            ? legalTagToSiteType(metadata.legal_tag)
            : null;
    if (siteTypeHint == null) return null;
    return FeeSiteMetadataEnvelopeSchema.parse({
      siteType: SiteTypeSchema.catch('UNKNOWN').parse(siteTypeHint),
      accessModel: siteTypeToAccessModel(SiteTypeSchema.catch('UNKNOWN').parse(siteTypeHint)),
    });
  }
  const parsed = FeeSiteMetadataEnvelopeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function embedFeeSiteEnvelope(
  metadata: Record<string, unknown>,
  envelope: FeeSiteMetadataEnvelope
): Record<string, unknown> {
  const validated = FeeSiteMetadataEnvelopeSchema.parse(envelope);
  return {
    ...metadata,
    [FEE_SITE_METADATA_KEY]: validated,
    site_type: validated.siteType,
    access_model: validated.accessModel,
  };
}

export function locationMatchesSiteTypeFilter(
  metadata: Record<string, unknown> | null | undefined,
  filter: SiteType[] | undefined
): boolean {
  if (filter == null || filter.length === 0) return true;
  const envelope = parseFeeSiteEnvelope(metadata);
  const roles = locationSiteRoles(envelope);
  return filter.some((t) => roles.includes(t));
}

export function isFeeMineFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  const envelope = parseFeeSiteEnvelope(metadata);
  return envelope != null && isFeeMineSiteType(envelope.siteType);
}

/** Explore / search filter labels compatible with Free/Public, Permit, Fee, Restricted, Unknown. */
export const SITE_TYPE_FILTER_OPTIONS: ReadonlyArray<{
  siteType: SiteType;
  label: string;
}> = [
  { siteType: SiteType.PUBLIC_COLLECTING, label: 'Free/Public' },
  { siteType: SiteType.PERMIT_REQUIRED, label: 'Permit Required' },
  { siteType: SiteType.FEE_MINE, label: 'Fee/Pay-to-Dig' },
  { siteType: SiteType.CLUB_SITE, label: 'Permission Required' },
  { siteType: SiteType.RESTRICTED, label: 'Restricted' },
  { siteType: SiteType.UNKNOWN, label: 'Unknown' },
];

/**
 * Future Claim This Site — data/API boundary only.
 * Updates must become provenance events; never silently erase history.
 */
export const OperatorClaimUpdateSchema = z.object({
  locationId: z.string().uuid(),
  claimedByActorId: z.string().min(1),
  hours: UnknownableStringSchema.optional(),
  pricingSummary: UnknownableStringSchema.optional(),
  seasonality: UnknownableStringSchema.optional(),
  contactDetails: UnknownableStringSchema.optional(),
  collectingRules: z.string().min(1).optional(),
  amenities: z.array(z.string().min(1)).optional(),
  temporaryClosureNote: z.string().min(1).optional(),
  evidence: FeeSiteSourceRecordSchema,
  recordedAt: IsoDateTimeSchema,
});

export type OperatorClaimUpdate = z.infer<typeof OperatorClaimUpdateSchema>;

export function applyOperatorClaimUpdateAsProvenanceEvent(
  current: FeeSiteMetadataEnvelope,
  update: OperatorClaimUpdate
): {
  next: FeeSiteMetadataEnvelope;
  provenanceNote: string;
} {
  const validated = OperatorClaimUpdateSchema.parse(update);
  const profile = FeeSiteProfileSchema.parse({
    ...(current.feeProfile ?? {}),
    hours: validated.hours ?? current.feeProfile?.hours ?? 'UNKNOWN',
    pricingSummary: validated.pricingSummary ?? current.feeProfile?.pricingSummary ?? 'UNKNOWN',
    seasonality: validated.seasonality ?? current.feeProfile?.seasonality ?? 'UNKNOWN',
    contactDetails: validated.contactDetails ?? current.feeProfile?.contactDetails ?? 'UNKNOWN',
    amenities: validated.amenities ?? current.feeProfile?.amenities ?? [],
    lastOperatorConfirmationAt: validated.recordedAt,
    operatorClaimState: OperatorClaimState.PENDING,
  });
  const next = FeeSiteMetadataEnvelopeSchema.parse({
    ...current,
    feeProfile: profile,
    sources: [...(current.sources ?? []), validated.evidence],
    lastVerifiedAt: validated.recordedAt,
  });
  return {
    next,
    provenanceNote:
      'Operator claim update recorded as additive provenance; prior fee profile fields retained in history via sources[].',
  };
}

/** Controlled fixture — must never publish. */
export const TEST_FEE_MINE_FIXTURE_ID = '00000000-0000-4000-8000-00000000fe01';

export function buildTestOnlyFeeMineFixture(overrides?: Partial<FeeSiteMetadataEnvelope>): {
  locationId: string;
  name: string;
  metadata: Record<string, unknown>;
} {
  const envelope = FeeSiteMetadataEnvelopeSchema.parse({
    siteType: SiteType.FEE_MINE,
    accessModel: AccessModel.FEE_SITE,
    operatingStatus: OperatingStatus.UNKNOWN,
    accessAxes: {
      visit: 'UNKNOWN',
      collect: 'UNKNOWN',
      route: 'UNKNOWN',
      operatingStatus: OperatingStatus.UNKNOWN,
    },
    feeProfile: {
      operatorName: 'TEST FIXTURE OPERATOR — NOT A REAL BUSINESS',
      operatorClaimState: OperatorClaimState.UNCLAIMED,
      feeAccessModel: FeeAccessModel.PAY_TO_DIG,
      pricingSummary: 'UNKNOWN',
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
    collectingContext: {
      method: CollectingMethod.SEEDED_MATERIAL,
      materialOrigin: MaterialOriginClass.SEEDED,
      keepTakeHomeAllowed: 'UNKNOWN',
      quantityRestrictions: 'UNKNOWN',
      toolRestrictions: 'UNKNOWN',
    },
    materialClaims: [
      {
        materialName: 'Advertised gemstone (fixture)',
        occurrenceType: MaterialOccurrenceType.OPERATOR_ADVERTISED,
        certainty: MaterialCertainty.REPORTED,
        originClass: MaterialOriginClass.SEEDED,
      },
    ],
    admissionStatus: FeeSiteAdmissionStatus.TEST_ONLY,
    sources: [
      {
        authorityClass: FeeSiteSourceAuthority.SECONDARY_DIRECTORY,
        reference: 'test-fixture-only',
        publisher: 'Rockhounding test harness',
        retrievedAt: '2026-09-30T00:00:00.000Z',
      },
    ],
    ...overrides,
  });

  return {
    locationId: TEST_FEE_MINE_FIXTURE_ID,
    name: 'TEST FIXTURE — Fee Mine (not a real business)',
    metadata: embedFeeSiteEnvelope({ seed: 'test_fee_site_r1', synthetic: true }, envelope),
  };
}

/**
 * Negative controls — mapped ≠ open, advertised ≠ verified, etc.
 */
/**
 * Semantic guards used by tests and UI. Each flag is true when the fail-closed
 * rule holds for this envelope (i.e. we are NOT incorrectly elevating authority).
 */
export function assertFeeSiteNegativeControls(envelope: FeeSiteMetadataEnvelope): {
  mappedIsNotOpen: boolean;
  advertisedIsNotVerifiedGeology: boolean;
  knownOperatorIsNotCollectingAllowed: boolean;
  knownPriceIsNotGuaranteedCurrent: boolean;
  seededIsNotTreatedAsNative: boolean;
} {
  const mappedIsNotOpen =
    envelope.siteType !== SiteType.FEE_MINE ||
    envelope.operatingStatus !== OperatingStatus.OPEN_CONFIRMED ||
    envelope.accessAxes?.visit === 'UNKNOWN';

  const advertisedIsNotVerifiedGeology = (envelope.materialClaims ?? []).every((claim) => {
    const certainty = normalizeMaterialClaimCertainty(claim);
    if (claim.occurrenceType === MaterialOccurrenceType.OPERATOR_ADVERTISED) {
      return certainty !== MaterialCertainty.VERIFIED;
    }
    return true;
  });

  const collectAxis = envelope.accessAxes?.collect ?? 'UNKNOWN';
  const knownOperatorIsNotCollectingAllowed = collectAxis !== 'ALLOWED';

  const knownPriceIsNotGuaranteedCurrent =
    envelope.feeProfile == null ||
    envelope.feeProfile.pricingSummary === 'UNKNOWN' ||
    envelope.feeProfile.pricingVerifiedAt == null;

  const ctx = envelope.collectingContext;
  const seededIsNotTreatedAsNative =
    ctx == null
      ? true
      : seededIsNotNativeOccurrence(ctx)
        ? ctx.materialOrigin !== MaterialOriginClass.NATURAL
        : true;

  return {
    mappedIsNotOpen,
    advertisedIsNotVerifiedGeology,
    knownOperatorIsNotCollectingAllowed,
    knownPriceIsNotGuaranteedCurrent,
    seededIsNotTreatedAsNative,
  };
}

export function displayUnknown(value: string | null | undefined): string {
  if (value == null || value === '' || value === 'UNKNOWN') return 'Unknown / Not verified';
  return value;
}

export function operatingStatusLabel(status: OperatingStatus): string {
  switch (status) {
    case OperatingStatus.OPEN_CONFIRMED:
      return 'Open (confirmed)';
    case OperatingStatus.OPEN_REPORTED:
      return 'Open (reported)';
    case OperatingStatus.SEASONAL:
      return 'Seasonal';
    case OperatingStatus.APPOINTMENT_REQUIRED:
      return 'Appointment required';
    case OperatingStatus.TEMPORARILY_CLOSED:
      return 'Temporarily closed';
    case OperatingStatus.PERMANENTLY_CLOSED:
      return 'Permanently closed';
    case OperatingStatus.STALE:
      return 'Stale — not verified';
    default:
      return 'Unknown / Not verified';
  }
}
