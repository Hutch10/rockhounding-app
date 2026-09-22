/**
 * Truth Clock / Evidence Availability R1
 *
 * Persistence-free temporal context and availability semantics.
 * Freshness is not truth, authority, confidence, or permission.
 */

import { z } from 'zod';

export const TRUTH_CLOCK_SCHEMA_VERSION = 1;

const IsoDateTimeSchema = z.string().datetime({ offset: true });
const DurationMsSchema = z.number().int().nonnegative();

export const FreshnessState = {
  CURRENT: 'CURRENT',
  AGING: 'AGING',
  REVALIDATION_REQUIRED: 'REVALIDATION_REQUIRED',
  STALE: 'STALE',
  UNKNOWN: 'UNKNOWN',
} as const;

export type FreshnessState = (typeof FreshnessState)[keyof typeof FreshnessState];

export const ReferenceTimestampKind = {
  SOURCE_UPDATED: 'SOURCE_UPDATED',
  PUBLISHED: 'PUBLISHED',
  RETRIEVED: 'RETRIEVED',
  VERIFIED: 'VERIFIED',
  PHENOMENON: 'PHENOMENON',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ReferenceTimestampKind =
  (typeof ReferenceTimestampKind)[keyof typeof ReferenceTimestampKind];

export const TemporalUseContext = {
  DISCOVERY: 'DISCOVERY',
  GEOLOGICAL_CONTEXT: 'GEOLOGICAL_CONTEXT',
  FIELD_NAVIGATION: 'FIELD_NAVIGATION',
  COLLECTION_DECISION: 'COLLECTION_DECISION',
  SAFETY_DECISION: 'SAFETY_DECISION',
  ROUTE_DECISION: 'ROUTE_DECISION',
  SCIENTIFIC_ANALYSIS: 'SCIENTIFIC_ANALYSIS',
  HISTORICAL_REVIEW: 'HISTORICAL_REVIEW',
} as const;

export type TemporalUseContext = (typeof TemporalUseContext)[keyof typeof TemporalUseContext];

export const TemporalFitness = {
  FIT: 'FIT',
  FIT_WITH_WARNING: 'FIT_WITH_WARNING',
  REVALIDATION_REQUIRED: 'REVALIDATION_REQUIRED',
  NOT_FIT: 'NOT_FIT',
  UNKNOWN: 'UNKNOWN',
} as const;

export type TemporalFitness = (typeof TemporalFitness)[keyof typeof TemporalFitness];

export const EvidenceAvailabilityState = {
  AVAILABLE: 'AVAILABLE',
  STALE: 'STALE',
  MISSING: 'MISSING',
  FETCH_FAILED: 'FETCH_FAILED',
  COVERAGE_GAP: 'COVERAGE_GAP',
  UNRESOLVED: 'UNRESOLVED',
  CONFLICTED: 'CONFLICTED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  ACCESS_RESTRICTED: 'ACCESS_RESTRICTED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type EvidenceAvailabilityState =
  (typeof EvidenceAvailabilityState)[keyof typeof EvidenceAvailabilityState];

export const EvidenceAvailabilityReasonCode = {
  NO_RECORD_RETURNED: 'NO_RECORD_RETURNED',
  NETWORK_FAILURE: 'NETWORK_FAILURE',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  LICENSE_RESTRICTION: 'LICENSE_RESTRICTION',
  GEOGRAPHIC_COVERAGE_GAP: 'GEOGRAPHIC_COVERAGE_GAP',
  TEMPORAL_COVERAGE_GAP: 'TEMPORAL_COVERAGE_GAP',
  GEOMETRY_COVERAGE_PARTIAL: 'GEOMETRY_COVERAGE_PARTIAL',
  RECORD_COVERAGE_PARTIAL: 'RECORD_COVERAGE_PARTIAL',
  SOURCE_CONFLICT: 'SOURCE_CONFLICT',
  INSUFFICIENT_PRECISION: 'INSUFFICIENT_PRECISION',
  INSUFFICIENT_SCALE: 'INSUFFICIENT_SCALE',
  UNVERIFIED_CURRENCY: 'UNVERIFIED_CURRENCY',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  OTHER: 'OTHER',
} as const;

export type EvidenceAvailabilityReasonCode =
  (typeof EvidenceAvailabilityReasonCode)[keyof typeof EvidenceAvailabilityReasonCode];

export const CoverageExtent = {
  COMPLETE: 'COMPLETE',
  PARTIAL: 'PARTIAL',
  UNKNOWN: 'UNKNOWN',
} as const;

export type CoverageExtent = (typeof CoverageExtent)[keyof typeof CoverageExtent];

export const TruthClockSchema = z
  .object({
    id: z.string().min(1).max(128),
    schemaVersion: z.literal(TRUTH_CLOCK_SCHEMA_VERSION),
    phenomenonTime: IsoDateTimeSchema.optional(),
    effectiveFrom: IsoDateTimeSchema.optional(),
    effectiveTo: IsoDateTimeSchema.optional(),
    sourceRecordedAt: IsoDateTimeSchema.optional(),
    publishedAt: IsoDateTimeSchema.optional(),
    sourceUpdatedAt: IsoDateTimeSchema.optional(),
    retrievedAt: IsoDateTimeSchema.optional(),
    verifiedAt: IsoDateTimeSchema.optional(),
    decisionUsedAt: IsoDateTimeSchema.optional(),
    revalidateAfter: IsoDateTimeSchema.optional(),
    expiresAt: IsoDateTimeSchema.optional(),
  })
  .superRefine((clock, ctx) => {
    if (
      clock.effectiveFrom !== undefined &&
      clock.effectiveTo !== undefined &&
      Date.parse(clock.effectiveTo) < Date.parse(clock.effectiveFrom)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'effectiveTo must not precede effectiveFrom',
        path: ['effectiveTo'],
      });
    }
  });

export type TruthClock = z.infer<typeof TruthClockSchema>;
export type TruthClockId = TruthClock['id'];

export const FreshnessPolicySchema = z.object({
  maxAgeMs: DurationMsSchema,
  warningAgeMs: DurationMsSchema.optional(),
  revalidateBeforeUse: z.boolean(),
  useContexts: z
    .array(
      z.enum([
        'DISCOVERY',
        'GEOLOGICAL_CONTEXT',
        'FIELD_NAVIGATION',
        'COLLECTION_DECISION',
        'SAFETY_DECISION',
        'ROUTE_DECISION',
        'SCIENTIFIC_ANALYSIS',
        'HISTORICAL_REVIEW',
      ])
    )
    .max(16),
  referenceTimestampKind: z.enum([
    'SOURCE_UPDATED',
    'PUBLISHED',
    'RETRIEVED',
    'VERIFIED',
    'PHENOMENON',
    'UNKNOWN',
  ]),
});

export type FreshnessPolicy = z.infer<typeof FreshnessPolicySchema>;
export type RevalidationPolicy = FreshnessPolicy;

export const EvidenceAvailabilityReasonSchema = z.object({
  code: z.enum([
    'NO_RECORD_RETURNED',
    'NETWORK_FAILURE',
    'PROVIDER_ERROR',
    'RATE_LIMITED',
    'AUTH_REQUIRED',
    'LICENSE_RESTRICTION',
    'GEOGRAPHIC_COVERAGE_GAP',
    'TEMPORAL_COVERAGE_GAP',
    'GEOMETRY_COVERAGE_PARTIAL',
    'RECORD_COVERAGE_PARTIAL',
    'SOURCE_CONFLICT',
    'INSUFFICIENT_PRECISION',
    'INSUFFICIENT_SCALE',
    'UNVERIFIED_CURRENCY',
    'NOT_APPLICABLE',
    'OTHER',
  ]),
  detail: z.string().min(1).max(1000).optional(),
});

export type EvidenceAvailabilityReason = z.infer<typeof EvidenceAvailabilityReasonSchema>;

export const EvidenceAvailabilityEvaluationSchema = z.object({
  state: z.enum([
    'AVAILABLE',
    'STALE',
    'MISSING',
    'FETCH_FAILED',
    'COVERAGE_GAP',
    'UNRESOLVED',
    'CONFLICTED',
    'NOT_APPLICABLE',
    'ACCESS_RESTRICTED',
    'UNKNOWN',
  ]),
  reason: EvidenceAvailabilityReasonSchema.optional(),
  recordCoverage: z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']).optional(),
  geometryCoverage: z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']).optional(),
  temporalCoverage: z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']).optional(),
  knownMissingClasses: z.array(z.string().min(1).max(128)).max(32).optional(),
  resultCount: z.number().int().nonnegative().optional(),
});

export type EvidenceAvailabilityEvaluation = z.infer<typeof EvidenceAvailabilityEvaluationSchema>;

export type TruthClockEvaluation = {
  freshness: FreshnessState;
  clock: TruthClock;
};

export type TruthTemporalInterval = {
  effectiveFrom?: string;
  effectiveTo?: string;
};

export function validateTruthClock(input: unknown): TruthClock {
  return TruthClockSchema.parse(input);
}

export function validateEvidenceAvailability(input: unknown): EvidenceAvailabilityEvaluation {
  return EvidenceAvailabilityEvaluationSchema.parse(input);
}

export function evaluateAvailability(input: unknown): EvidenceAvailabilityEvaluation {
  return validateEvidenceAvailability(input);
}

function referenceTimestamp(clock: TruthClock, kind: ReferenceTimestampKind): string | undefined {
  if (kind === ReferenceTimestampKind.SOURCE_UPDATED) {
    return clock.sourceUpdatedAt;
  }
  if (kind === ReferenceTimestampKind.PUBLISHED) {
    return clock.publishedAt;
  }
  if (kind === ReferenceTimestampKind.RETRIEVED) {
    return clock.retrievedAt;
  }
  if (kind === ReferenceTimestampKind.VERIFIED) {
    return clock.verifiedAt;
  }
  if (kind === ReferenceTimestampKind.PHENOMENON) {
    return clock.phenomenonTime;
  }
  return undefined;
}

export function evaluateFreshness(
  clock: TruthClock,
  policy: FreshnessPolicy,
  now: string
): FreshnessState {
  const reference = referenceTimestamp(clock, policy.referenceTimestampKind);
  if (reference === undefined) {
    return FreshnessState.UNKNOWN;
  }
  const ageMs = Date.parse(now) - Date.parse(reference);
  if (clock.expiresAt !== undefined && Date.parse(clock.expiresAt) < Date.parse(now)) {
    return FreshnessState.STALE;
  }
  if (ageMs >= policy.maxAgeMs) {
    return FreshnessState.STALE;
  }
  if (clock.revalidateAfter !== undefined && Date.parse(clock.revalidateAfter) <= Date.parse(now)) {
    return FreshnessState.REVALIDATION_REQUIRED;
  }
  if (policy.revalidateBeforeUse) {
    return FreshnessState.REVALIDATION_REQUIRED;
  }
  if (policy.warningAgeMs !== undefined && ageMs >= policy.warningAgeMs) {
    return FreshnessState.AGING;
  }
  return FreshnessState.CURRENT;
}

export function requiresRevalidation(
  clock: TruthClock,
  policy: FreshnessPolicy,
  now: string
): boolean {
  const freshness = evaluateFreshness(clock, policy, now);
  return (
    freshness === FreshnessState.REVALIDATION_REQUIRED ||
    freshness === FreshnessState.STALE ||
    policy.revalidateBeforeUse
  );
}

function policyForContext(
  policies: readonly FreshnessPolicy[],
  useContext: TemporalUseContext
): FreshnessPolicy | undefined {
  const specific = policies.find((policy) => policy.useContexts.includes(useContext));
  if (specific !== undefined) {
    return specific;
  }
  return policies.find((policy) => policy.useContexts.length === 0);
}

export function evaluateTemporalFitness(
  clock: TruthClock,
  policies: readonly FreshnessPolicy[],
  useContext: TemporalUseContext,
  now: string
): TemporalFitness {
  const policy = policyForContext(policies, useContext);
  if (policy === undefined) {
    return TemporalFitness.UNKNOWN;
  }
  const freshness = evaluateFreshness(clock, policy, now);
  if (freshness === FreshnessState.UNKNOWN) {
    return policy.revalidateBeforeUse
      ? TemporalFitness.REVALIDATION_REQUIRED
      : TemporalFitness.UNKNOWN;
  }
  if (freshness === FreshnessState.STALE) {
    return TemporalFitness.NOT_FIT;
  }
  if (freshness === FreshnessState.REVALIDATION_REQUIRED) {
    return TemporalFitness.REVALIDATION_REQUIRED;
  }
  if (freshness === FreshnessState.AGING) {
    return TemporalFitness.FIT_WITH_WARNING;
  }
  return TemporalFitness.FIT;
}

export function confirmedAbsenceEstablished(_evaluation: EvidenceAvailabilityEvaluation): boolean {
  return false;
}

export function availabilityAuthorizesUse(_evaluation: EvidenceAvailabilityEvaluation): boolean {
  return false;
}

export function truthClockCreatesUgesAssertion(_clock: TruthClock): boolean {
  return false;
}

export function truthClockMutatesCertainty(_clock: TruthClock): boolean {
  return false;
}

export type ResourceTemporalProjectionInput = {
  publishedAt?: string;
  updatedAt?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  acquiredOrObservedFrom?: string;
};

export function projectResourceTemporalToTruthClock(
  temporal: ResourceTemporalProjectionInput | undefined
): Partial<TruthClock> {
  if (temporal === undefined) {
    return {};
  }
  const projected: Partial<TruthClock> = {};
  if (temporal.publishedAt !== undefined) {
    projected.publishedAt = temporal.publishedAt;
  }
  if (temporal.updatedAt !== undefined) {
    projected.sourceUpdatedAt = temporal.updatedAt;
  }
  if (temporal.effectiveFrom !== undefined) {
    projected.effectiveFrom = temporal.effectiveFrom;
  }
  if (temporal.effectiveTo !== undefined) {
    projected.effectiveTo = temporal.effectiveTo;
  }
  if (temporal.acquiredOrObservedFrom !== undefined) {
    projected.phenomenonTime = temporal.acquiredOrObservedFrom;
  }
  return projected;
}

export function projectObservationTimesToTruthClock(observation: {
  observedAt?: string;
  recordedAt?: string;
}): Partial<TruthClock> {
  const projected: Partial<TruthClock> = {};
  if (observation.observedAt !== undefined) {
    projected.phenomenonTime = observation.observedAt;
  }
  if (observation.recordedAt !== undefined) {
    projected.sourceRecordedAt = observation.recordedAt;
  }
  return projected;
}

export function provenanceExecutionIsTruthState(_activity: {
  startedAt?: string;
  endedAt?: string;
}): boolean {
  return false;
}
