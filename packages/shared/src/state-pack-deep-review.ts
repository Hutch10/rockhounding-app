/**
 * Deep-review + launch-cohort contracts for first-five state packs.
 * Research-only — never implies Production publish.
 */

import { z } from 'zod';

import {
  CollectingMethodSchema,
  FeeAccessModelSchema,
  FeeSiteSourceAuthoritySchema,
  MaterialCertaintySchema,
  MaterialOccurrenceTypeSchema,
  MaterialOriginClassSchema,
  OperatingStatusSchema,
  SiteTypeSchema,
} from './fee-site-support';
import { StatePackClaimabilitySchema } from './state-pack-research';
import { EvidencePermissionStatusSchema } from './universal-geological-evidence-schema';

export const ClaimFreshnessState = {
  CURRENT: 'CURRENT',
  STALE: 'STALE',
  UNKNOWN: 'UNKNOWN',
} as const;

export const ClaimFreshnessStateSchema = z.enum(['CURRENT', 'STALE', 'UNKNOWN']);

export const ConflictState = {
  NONE: 'NONE',
  CONFLICTED: 'CONFLICTED',
  UNRESOLVED: 'UNRESOLVED',
} as const;

export const ConflictStateSchema = z.enum(['NONE', 'CONFLICTED', 'UNRESOLVED']);

export const RouteLegalityState = {
  SUPPORTED_ALLOWED: 'SUPPORTED_ALLOWED',
  SUPPORTED_RESTRICTED: 'SUPPORTED_RESTRICTED',
  UNKNOWN: 'UNKNOWN',
  CONFLICTED: 'CONFLICTED',
} as const;

export const RouteLegalityStateSchema = z.enum([
  'SUPPORTED_ALLOWED',
  'SUPPORTED_RESTRICTED',
  'UNKNOWN',
  'CONFLICTED',
]);

export const HoldReasonCode = {
  INSUFFICIENT_ACCESS_AUTHORITY: 'INSUFFICIENT_ACCESS_AUTHORITY',
  INSUFFICIENT_COLLECT_AUTHORITY: 'INSUFFICIENT_COLLECT_AUTHORITY',
  OPERATING_STATUS_UNCLEAR: 'OPERATING_STATUS_UNCLEAR',
  ROUTE_UNCLEAR: 'ROUTE_UNCLEAR',
  SOURCE_TOO_STALE: 'SOURCE_TOO_STALE',
  GEOLOGY_UNRESOLVED: 'GEOLOGY_UNRESOLVED',
  MATERIAL_ORIGIN_UNCLEAR: 'MATERIAL_ORIGIN_UNCLEAR',
  OPERATOR_IDENTITY_UNCLEAR: 'OPERATOR_IDENTITY_UNCLEAR',
  CONFLICTED_SOURCES: 'CONFLICTED_SOURCES',
  OTHER: 'OTHER',
} as const;

export const HoldReasonCodeSchema = z.enum([
  'INSUFFICIENT_ACCESS_AUTHORITY',
  'INSUFFICIENT_COLLECT_AUTHORITY',
  'OPERATING_STATUS_UNCLEAR',
  'ROUTE_UNCLEAR',
  'SOURCE_TOO_STALE',
  'GEOLOGY_UNRESOLVED',
  'MATERIAL_ORIGIN_UNCLEAR',
  'OPERATOR_IDENTITY_UNCLEAR',
  'CONFLICTED_SOURCES',
  'OTHER',
]);

/** One public-facing claim with isolated provenance. */
export const ProvenancedClaimSchema = z.object({
  claimKey: z.string().min(1),
  claim: z.string().min(1),
  source: z.string().min(1),
  authority: FeeSiteSourceAuthoritySchema,
  certainty: MaterialCertaintySchema,
  freshness: ClaimFreshnessStateSchema,
  conflictState: ConflictStateSchema.default('NONE'),
  conflictNote: z.string().optional(),
});

export type ProvenancedClaim = z.infer<typeof ProvenancedClaimSchema>;

export const MaterialDeepClaimSchema = z.object({
  materialName: z.string().min(1),
  occurrenceType: MaterialOccurrenceTypeSchema,
  certainty: MaterialCertaintySchema,
  originClass: MaterialOriginClassSchema,
  source: z.string().min(1),
  authority: FeeSiteSourceAuthoritySchema,
  freshness: ClaimFreshnessStateSchema,
  conflictState: ConflictStateSchema.default('NONE'),
});

export const DeepReviewRecordSchema = z.object({
  candidateId: z.string().min(1),
  baselineCandidateId: z.string().min(1),
  state: z.enum(['NC', 'AR', 'CA', 'MT', 'ME']),
  name: z.string().min(1),
  siteType: SiteTypeSchema,
  secondarySiteTypes: z.array(SiteTypeSchema).default([]),
  deepReviewPriority: z.number().int().min(1).max(5),
  identity: ProvenancedClaimSchema,
  location: ProvenancedClaimSchema,
  operatorAdministrator: ProvenancedClaimSchema,
  visit: ProvenancedClaimSchema.extend({
    axis: EvidencePermissionStatusSchema,
  }),
  collect: ProvenancedClaimSchema.extend({
    axis: EvidencePermissionStatusSchema,
  }),
  route: ProvenancedClaimSchema.extend({
    axis: EvidencePermissionStatusSchema,
    routeLegality: RouteLegalityStateSchema,
  }),
  operatingStatus: ProvenancedClaimSchema.extend({
    status: OperatingStatusSchema,
  }),
  hoursSeason: ProvenancedClaimSchema.optional(),
  price: ProvenancedClaimSchema.optional(),
  materials: z.array(MaterialDeepClaimSchema).default([]),
  materialOriginSummary: MaterialOriginClassSchema,
  geologyNotes: ProvenancedClaimSchema.optional(),
  hazards: ProvenancedClaimSchema.optional(),
  permitReservation: ProvenancedClaimSchema.optional(),
  feeAccessModel: FeeAccessModelSchema.optional(),
  collectingMethod: CollectingMethodSchema.optional(),
  claimability: StatePackClaimabilitySchema,
  claimabilityReason: z.string().min(1),
  holdReason: HoldReasonCodeSchema.optional(),
  launchEligible: z.boolean(),
  launchIneligibleReason: z.string().optional(),
  inLaunchCohort: z.boolean().default(false),
  publicProjectionSafe: z.boolean(),
});

export type DeepReviewRecord = z.infer<typeof DeepReviewRecordSchema>;

export const LaunchCohortManifestSchema = z.object({
  gate: z.literal('rockhounding-first-five-state-deep-pack-r1'),
  baselineSha256: z.string().min(16),
  publishBlocked: z.literal(true),
  outreachStatus: z.literal('UNSENT'),
  coweeClaimStatus: z.literal('UNCLAIMED'),
  deepReviewed: z.array(DeepReviewRecordSchema).min(20),
  launchCohortIds: z.array(z.string()).min(15).max(35),
  metrics: z.object({
    baselineCandidates: z.number().int(),
    deepReviewedCount: z.number().int(),
    launchCohortCount: z.number().int(),
    holdCount: z.number().int(),
    rejectedCount: z.number().int(),
    conflictedCount: z.number().int(),
    staleClaimCount: z.number().int(),
    routeUnknownCount: z.number().int(),
    claimableCount: z.number().int(),
    platformManagedCount: z.number().int(),
    evidenceSufficientRate: z.number(),
    admittedRate: z.number(),
    holdRate: z.number(),
    conflictRate: z.number(),
    staleSourceRate: z.number(),
    feeSiteVerificationRate: z.number(),
    publicSiteVerificationRate: z.number(),
    estimatedRemainingStateBurdenNote: z.string().min(1),
  }),
  diversity: z.object({
    privateFeeMines: z.boolean(),
    publicCollecting: z.boolean(),
    mixedNativeSeeded: z.boolean(),
    appointmentOnly: z.boolean(),
    seasonal: z.boolean(),
    shopOrIdentification: z.boolean(),
    museumOrGeology: z.boolean(),
    platformManagedGovernment: z.boolean(),
  }),
  stateReadiness: z.record(
    z.enum(['NC', 'AR', 'CA', 'MT', 'ME']),
    z.enum(['CORE_READY', 'DEEP_READY', 'REVALIDATION_REQUIRED'])
  ),
});

export type LaunchCohortManifest = z.infer<typeof LaunchCohortManifestSchema>;

/** Public projection — strips internal research notes. */
export function projectDeepReviewPublic(record: DeepReviewRecord): {
  name: string;
  siteType: string;
  secondarySiteTypes: string[];
  visit: string;
  collect: string;
  route: string;
  routeLegality: string;
  operatingStatus: string;
  hoursSeason: string | null;
  pricing: string | null;
  pricingFreshness: string | null;
  materialOrigin: string;
  materials: Array<{ name: string; occurrence: string; certainty: string; origin: string }>;
  claimability: string;
  operatorConfirmed: false;
  unknownsVisible: string[];
  conflictsVisible: string[];
} {
  const unknowns: string[] = [];
  const conflicts: string[] = [];
  if (record.visit.axis === 'UNKNOWN') unknowns.push('visit');
  if (record.collect.axis === 'UNKNOWN') unknowns.push('collect');
  if (record.route.routeLegality === 'UNKNOWN') unknowns.push('route');
  if (record.operatingStatus.status === 'UNKNOWN') unknowns.push('operatingStatus');
  for (const c of [
    record.identity,
    record.location,
    record.hoursSeason,
    record.price,
    record.operatingStatus,
  ]) {
    if (c?.conflictState === 'CONFLICTED') {
      conflicts.push(`${c.claimKey}: ${c.conflictNote ?? 'conflicted sources'}`);
    }
  }
  return {
    name: record.name,
    siteType: record.siteType,
    secondarySiteTypes: record.secondarySiteTypes,
    visit: record.visit.axis,
    collect: record.collect.axis,
    route: record.route.axis,
    routeLegality: record.route.routeLegality,
    operatingStatus: record.operatingStatus.status,
    hoursSeason: record.hoursSeason?.claim ?? null,
    pricing: record.price?.claim ?? null,
    pricingFreshness: record.price?.freshness ?? null,
    materialOrigin: record.materialOriginSummary,
    materials: record.materials.map((m) => ({
      name: m.materialName,
      occurrence: m.occurrenceType,
      certainty: m.certainty,
      origin: m.originClass,
    })),
    claimability: record.claimability,
    operatorConfirmed: false,
    unknownsVisible: unknowns,
    conflictsVisible: conflicts,
  };
}

export function assertLaunchEligibility(record: DeepReviewRecord): string[] {
  const issues: string[] = [];
  if (!record.launchEligible) return issues;
  if (record.visit.axis === 'UNKNOWN') issues.push('visit unresolved');
  if (record.collect.axis === 'UNKNOWN') issues.push('collect unresolved');
  if (record.identity.claim === '' || record.location.claim === '') {
    issues.push('identity/location incomplete');
  }
  if (record.operatingStatus.status === 'UNKNOWN' && record.siteType === 'FEE_MINE') {
    issues.push('fee mine operating status unknown');
  }
  if (record.publicProjectionSafe !== true) issues.push('public projection unsafe');
  return issues;
}
