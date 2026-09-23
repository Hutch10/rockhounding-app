/**
 * Decision Evidence Contracts R1
 *
 * Specifies which admitted evidence a decision class requires.
 * Completeness is not a permission, access, closure, or safety result.
 */

import { z } from 'zod';

import {
  EvidenceAdmissionCandidateSchema,
  type EvidenceAdmissionCandidate,
  type EvidenceAdmissionReceipt,
  EvidenceCoverageRequirementSchema,
  type EvidenceCoverageRequirement,
} from './evidence-admission';
import { EvidenceAuthorityClassSchema } from './universal-geological-evidence-schema';

export const DECISION_EVIDENCE_CONTRACT_SCHEMA_VERSION = 1;
export const DECISION_EVIDENCE_CONTRACT_BLOCK_ID = 'rockhounding:decision-evidence-contract';

const VersionSchema = z.object({
  major: z.number().int().nonnegative(),
  minor: z.number().int().nonnegative(),
  patch: z.number().int().nonnegative(),
});

export type DecisionEvidenceContractVersion = z.infer<typeof VersionSchema>;
export type DecisionEvidenceContractId = string;
export type DecisionEvidenceRequirementId = string;

export const DecisionClass = {
  COLLECTION_PERMISSION: 'COLLECTION_PERMISSION',
  SITE_ACCESS: 'SITE_ACCESS',
  ROUTE_ACCESS: 'ROUTE_ACCESS',
  CLOSURE_STATUS: 'CLOSURE_STATUS',
  SAFETY_STATUS: 'SAFETY_STATUS',
  GEOLOGICAL_CONTEXT: 'GEOLOGICAL_CONTEXT',
  GEOLOGICAL_OPPORTUNITY: 'GEOLOGICAL_OPPORTUNITY',
  MINING_CLAIM_STATUS: 'MINING_CLAIM_STATUS',
  LAND_OWNERSHIP_STATUS: 'LAND_OWNERSHIP_STATUS',
  LAND_MANAGEMENT_STATUS: 'LAND_MANAGEMENT_STATUS',
  SPECIMEN_IDENTIFICATION: 'SPECIMEN_IDENTIFICATION',
  FIELD_VISIT_READINESS: 'FIELD_VISIT_READINESS',
  OTHER: 'OTHER',
} as const;

export type DecisionClass = (typeof DecisionClass)[keyof typeof DecisionClass];

export const DecisionRequirementCardinality = {
  ALL_OF: 'ALL_OF',
  ANY_OF: 'ANY_OF',
  AT_LEAST_N_OF: 'AT_LEAST_N_OF',
} as const;

export type DecisionRequirementCardinality =
  (typeof DecisionRequirementCardinality)[keyof typeof DecisionRequirementCardinality];

export const DecisionRequirementStatus = {
  SATISFIED: 'SATISFIED',
  SATISFIED_WITH_LIMITATIONS: 'SATISFIED_WITH_LIMITATIONS',
  MISSING: 'MISSING',
  INSUFFICIENT: 'INSUFFICIENT',
  CONFLICTED: 'CONFLICTED',
  STALE: 'STALE',
  QUARANTINED: 'QUARANTINED',
  UNRESOLVED: 'UNRESOLVED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;

export type DecisionRequirementStatus =
  (typeof DecisionRequirementStatus)[keyof typeof DecisionRequirementStatus];

export const DecisionCompletenessStatus = {
  COMPLETE: 'COMPLETE',
  COMPLETE_WITH_LIMITATIONS: 'COMPLETE_WITH_LIMITATIONS',
  INCOMPLETE: 'INCOMPLETE',
  UNRESOLVED: 'UNRESOLVED',
  CONFLICTED: 'CONFLICTED',
  REVALIDATION_REQUIRED: 'REVALIDATION_REQUIRED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;

export type DecisionCompletenessStatus =
  (typeof DecisionCompletenessStatus)[keyof typeof DecisionCompletenessStatus];

export const DecisionEvidenceGapReason = {
  MISSING_REQUIRED_DOMAIN: 'MISSING_REQUIRED_DOMAIN',
  MISSING_REQUIRED_ROLE: 'MISSING_REQUIRED_ROLE',
  AUTHORITY_INSUFFICIENT: 'AUTHORITY_INSUFFICIENT',
  TEMPORAL_NOT_FIT: 'TEMPORAL_NOT_FIT',
  REVALIDATION_REQUIRED: 'REVALIDATION_REQUIRED',
  COVERAGE_INSUFFICIENT: 'COVERAGE_INSUFFICIENT',
  PROVENANCE_INCOMPLETE: 'PROVENANCE_INCOMPLETE',
  INDEPENDENCE_INSUFFICIENT: 'INDEPENDENCE_INSUFFICIENT',
  UNRESOLVED_CONTRADICTION: 'UNRESOLVED_CONTRADICTION',
  QUARANTINED_EVIDENCE: 'QUARANTINED_EVIDENCE',
  AVAILABILITY_INSUFFICIENT: 'AVAILABILITY_INSUFFICIENT',
  REQUIRED_EVIDENCE_COUNT_NOT_MET: 'REQUIRED_EVIDENCE_COUNT_NOT_MET',
  REQUIREMENT_NOT_APPLICABLE: 'REQUIREMENT_NOT_APPLICABLE',
  OTHER: 'OTHER',
} as const;

export type DecisionEvidenceGapReason =
  (typeof DecisionEvidenceGapReason)[keyof typeof DecisionEvidenceGapReason];

const DomainSchema = z.enum([
  'GEOLOGY',
  'MINERAL_OCCURRENCE',
  'LAND_OWNERSHIP',
  'LAND_MANAGEMENT',
  'MINERAL_ESTATE',
  'MINING_CLAIM',
  'COLLECTION_RULE',
  'CLOSURE',
  'ROAD_TRAIL_ACCESS',
  'SAFETY',
  'WEATHER',
  'FIRE',
  'SPECIMEN_IDENTIFICATION',
  'FIELD_OBSERVATION',
  'PROVENANCE',
  'OTHER',
]);

const PurposeSchema = z.enum([
  'DISCOVERY_SEARCH',
  'GEOLOGICAL_CONTEXT',
  'FIELD_NAVIGATION',
  'SITE_ACCESS',
  'COLLECTION_PERMISSION',
  'SAFETY_DECISION',
  'ROUTE_DECISION',
  'SPECIMEN_IDENTIFICATION',
  'SCIENTIFIC_ANALYSIS',
  'HISTORICAL_REVIEW',
  'ABSENCE_INFERENCE',
  'OTHER',
]);

const RoleSchema = z.enum([
  'DISCOVERY',
  'CORROBORATING',
  'NEGATIVE',
  'DECISION',
  'AUTHORITATIVE_DECISION',
]);

const ApplicabilitySchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('ALWAYS') }),
  z.object({ mode: z.literal('CONTEXT'), key: z.string().min(1).max(64) }),
]);

export const DecisionEvidenceRequirementSchema = z.object({
  id: z.string().min(1).max(128),
  domain: DomainSchema,
  purpose: PurposeSchema,
  allowedEvidenceRoles: z.array(RoleSchema).min(1).max(8),
  minimumAuthority: EvidenceAuthorityClassSchema.optional(),
  temporalRequirement: z
    .enum([
      'ANY_TEMPORAL_STATE',
      'CURRENT_REQUIRED',
      'REVALIDATION_ALLOWED',
      'HISTORICAL_ACCEPTABLE',
      'MAX_AGE_REQUIRED',
      'EFFECTIVE_AT_DECISION_TIME',
    ])
    .optional(),
  coverageRequirement: EvidenceCoverageRequirementSchema.optional(),
  provenanceRequirement: z
    .enum(['NONE', 'BASIC', 'SOURCE_TRACEABLE', 'PROCESS_TRACEABLE', 'FULL_REQUIRED'])
    .optional(),
  independenceMinimum: z.number().int().positive().max(32).optional(),
  contradictionPolicy: z
    .enum([
      'ALLOW_CONFLICT',
      'REQUIRE_NO_UNRESOLVED_CONFLICT',
      'REQUIRE_AUTHORITATIVE_RESOLUTION',
      'DEFER_ON_CONFLICT',
    ])
    .optional(),
  availabilityRequirement: z.array(z.string().min(1).max(64)).max(16).optional(),
  requiredCandidateKinds: z.array(z.string().min(1).max(64)).max(16).optional(),
  requiredCount: z.number().int().positive().max(32),
  optional: z.boolean(),
  allowLimitations: z.boolean(),
  requiresNegativeAdmission: z.boolean(),
  rationale: z.string().min(1).max(500).optional(),
  limitations: z.array(z.string().min(1).max(256)).max(32),
  applicability: ApplicabilitySchema,
});

export type DecisionEvidenceRequirement = z.infer<typeof DecisionEvidenceRequirementSchema>;

export const DecisionEvidenceRequirementGroupSchema = z
  .object({
    id: z.string().min(1).max(128),
    cardinality: z.enum(['ALL_OF', 'ANY_OF', 'AT_LEAST_N_OF']),
    minimumCount: z.number().int().positive().max(32).optional(),
    requirementIds: z.array(z.string().min(1).max(128)).min(1).max(32),
  })
  .superRefine((group, ctx) => {
    if (group.cardinality === 'AT_LEAST_N_OF') {
      if (group.minimumCount === undefined || group.minimumCount > group.requirementIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'AT_LEAST_N_OF requires a minimumCount within the group',
        });
      }
    }
  });

export type DecisionEvidenceRequirementGroup = z.infer<
  typeof DecisionEvidenceRequirementGroupSchema
>;

export const DecisionEvidenceContractSchema = z
  .object({
    id: z.string().min(1).max(128),
    version: VersionSchema,
    decisionClass: z.enum([
      'COLLECTION_PERMISSION',
      'SITE_ACCESS',
      'ROUTE_ACCESS',
      'CLOSURE_STATUS',
      'SAFETY_STATUS',
      'GEOLOGICAL_CONTEXT',
      'GEOLOGICAL_OPPORTUNITY',
      'MINING_CLAIM_STATUS',
      'LAND_OWNERSHIP_STATUS',
      'LAND_MANAGEMENT_STATUS',
      'SPECIMEN_IDENTIFICATION',
      'FIELD_VISIT_READINESS',
      'OTHER',
    ]),
    schemaVersion: z.literal(DECISION_EVIDENCE_CONTRACT_SCHEMA_VERSION),
    requirements: z.array(DecisionEvidenceRequirementSchema).min(1).max(32),
    groups: z.array(DecisionEvidenceRequirementGroupSchema).min(1).max(16),
  })
  .superRefine((contract, ctx) => {
    const ids = contract.requirements.map((requirement) => requirement.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'requirement ids must be unique' });
    }
    const seen = new Set<string>();
    for (const group of contract.groups) {
      for (const requirementId of group.requirementIds) {
        if (!ids.includes(requirementId) || seen.has(requirementId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'each requirement must belong to exactly one group',
          });
        }
        seen.add(requirementId);
      }
    }
    if (seen.size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'every requirement must belong to one group',
      });
    }
  });

export type DecisionEvidenceContract = z.infer<typeof DecisionEvidenceContractSchema>;

export const DecisionEvidencePolicyReferenceSchema = z.object({
  policyId: z.string().min(1).max(128),
  version: VersionSchema,
});

export type DecisionEvidencePolicyReference = z.infer<typeof DecisionEvidencePolicyReferenceSchema>;

const ReceiptSchema = z.object({
  requestId: z.string().min(1).max(128),
  candidateId: z.string().min(1).max(128),
  policyId: z.string().min(1).max(128),
  policyVersion: VersionSchema,
  decision: z.enum([
    'ADMITTED',
    'ADMITTED_WITH_LIMITATIONS',
    'REJECTED',
    'DEFERRED',
    'INSUFFICIENT_INFORMATION',
    'CONFLICTED',
    'QUARANTINED',
  ]),
  reasons: z.array(z.object({ code: z.string(), detail: z.string().optional() })).max(32),
  evaluatedAt: z.string().datetime({ offset: true }),
  domain: DomainSchema,
  purpose: PurposeSchema,
  evidenceRole: RoleSchema,
  inputReferences: z.object({
    candidateId: z.string(),
    policyId: z.string(),
  }),
  temporalFitness: z.enum([
    'FIT',
    'FIT_WITH_WARNING',
    'REVALIDATION_REQUIRED',
    'NOT_FIT',
    'UNKNOWN',
  ]),
  coverageState: z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']),
  provenanceState: z.enum(['NONE', 'BASIC', 'SOURCE_TRACEABLE', 'PROCESS_TRACEABLE', 'FULL']),
  authorityState: z.string().min(1).max(64),
  independenceState: z.string().min(1).max(64),
  contradictionState: z.enum(['NONE', 'UNRESOLVED', 'RESOLVED_BY_AUTHORITY']),
  limitations: z.array(z.string()).max(32),
  purposeFitness: z.enum(['FIT', 'NOT_FIT', 'UNKNOWN']),
});

export const DecisionEvidenceBundleSchema = z
  .object({
    candidate: EvidenceAdmissionCandidateSchema,
    receipt: ReceiptSchema,
    policy: DecisionEvidencePolicyReferenceSchema,
  })
  .superRefine((bundle, ctx) => {
    if (bundle.receipt.candidateId !== bundle.candidate.id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'receipt candidate must match' });
    }
    if (
      bundle.policy.policyId !== bundle.receipt.policyId ||
      bundle.policy.version.major !== bundle.receipt.policyVersion.major ||
      bundle.policy.version.minor !== bundle.receipt.policyVersion.minor ||
      bundle.policy.version.patch !== bundle.receipt.policyVersion.patch
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'policy reference must match the receipt',
      });
    }
  });

export type DecisionEvidenceBundle = {
  candidate: EvidenceAdmissionCandidate;
  receipt: EvidenceAdmissionReceipt;
  policy: DecisionEvidencePolicyReference;
};

type ParsedBundle = z.infer<typeof DecisionEvidenceBundleSchema>;

export const DecisionEvidenceContextSchema = z.object({
  evaluatedAt: z.string().datetime({ offset: true }),
  targetDecisionTime: z.string().datetime({ offset: true }).optional(),
  revalidatedForTarget: z.boolean().optional(),
  applicability: z
    .record(z.string().min(1).max(64), z.enum(['APPLICABLE', 'NOT_APPLICABLE', 'UNRESOLVED']))
    .default({}),
});

export type DecisionEvidenceContext = z.infer<typeof DecisionEvidenceContextSchema>;

export const DecisionEvidenceGapSchema = z.object({
  requirementId: z.string().min(1).max(128),
  reason: z.enum([
    'MISSING_REQUIRED_DOMAIN',
    'MISSING_REQUIRED_ROLE',
    'AUTHORITY_INSUFFICIENT',
    'TEMPORAL_NOT_FIT',
    'REVALIDATION_REQUIRED',
    'COVERAGE_INSUFFICIENT',
    'PROVENANCE_INCOMPLETE',
    'INDEPENDENCE_INSUFFICIENT',
    'UNRESOLVED_CONTRADICTION',
    'QUARANTINED_EVIDENCE',
    'AVAILABILITY_INSUFFICIENT',
    'REQUIRED_EVIDENCE_COUNT_NOT_MET',
    'REQUIREMENT_NOT_APPLICABLE',
    'OTHER',
  ]),
  blocking: z.boolean(),
});

export type DecisionEvidenceGap = z.infer<typeof DecisionEvidenceGapSchema>;

export type DecisionEvidenceEvaluation = {
  contractId: DecisionEvidenceContractId;
  contractVersion: DecisionEvidenceContractVersion;
  decisionClass: DecisionClass;
  completeness: DecisionCompletenessStatus;
  requirements: Array<{
    requirementId: string;
    status: DecisionRequirementStatus;
    gaps: DecisionEvidenceGapReason[];
  }>;
  gaps: DecisionEvidenceGap[];
  limitations: string[];
};

const AUTHORITY_RANK: Record<z.infer<typeof EvidenceAuthorityClassSchema>, number> = {
  UNKNOWN: 0,
  USER_OBSERVATION: 1,
  COMMUNITY_REPORT: 1,
  MODEL_DERIVED: 1,
  PROFESSIONAL_INTERPRETATION: 2,
  SCIENTIFIC_PUBLICATION: 3,
  SECONDARY_AUTHORITY: 4,
  PRIMARY_AUTHORITY: 5,
};

type GapReason = DecisionEvidenceGapReason;

type Assessment = {
  requirementId: string;
  optional: boolean;
  status: DecisionRequirementStatus;
  gaps: GapReason[];
  limitations: string[];
};

const V1: DecisionEvidenceContractVersion = { major: 1, minor: 0, patch: 0 };

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function sameVersion(
  left: DecisionEvidenceContractVersion,
  right: DecisionEvidenceContractVersion
): boolean {
  return left.major === right.major && left.minor === right.minor && left.patch === right.patch;
}

function coverageAxis(
  actual: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN',
  requirement: EvidenceCoverageRequirement['record']
): boolean {
  if (requirement === 'NOT_APPLICABLE' || requirement === 'UNKNOWN_ALLOWED') {
    return true;
  }
  if (requirement === 'PARTIAL_ALLOWED') {
    return actual === 'COMPLETE' || actual === 'PARTIAL';
  }
  return actual === 'COMPLETE';
}

function provenanceSatisfies(
  state: EvidenceAdmissionCandidate['provenance']['state'],
  requirement: NonNullable<DecisionEvidenceRequirement['provenanceRequirement']>
): boolean {
  if (requirement === 'NONE') {
    return true;
  }
  if (requirement === 'BASIC') {
    return state !== 'NONE';
  }
  if (requirement === 'SOURCE_TRACEABLE') {
    return state === 'SOURCE_TRACEABLE' || state === 'FULL';
  }
  if (requirement === 'PROCESS_TRACEABLE') {
    return state === 'PROCESS_TRACEABLE' || state === 'FULL';
  }
  return state === 'FULL';
}

function timeSensitive(requirement: DecisionEvidenceRequirement): boolean {
  const temporal = requirement.temporalRequirement;
  return (
    temporal === 'CURRENT_REQUIRED' ||
    temporal === 'REVALIDATION_ALLOWED' ||
    temporal === 'MAX_AGE_REQUIRED' ||
    temporal === 'EFFECTIVE_AT_DECISION_TIME'
  );
}

function futureTarget(
  requirement: DecisionEvidenceRequirement,
  context: DecisionEvidenceContext
): boolean {
  if (!timeSensitive(requirement) || context.targetDecisionTime === undefined) {
    return false;
  }
  if (context.revalidatedForTarget === true) {
    return false;
  }
  return Date.parse(context.targetDecisionTime) > Date.parse(context.evaluatedAt);
}

function temporalGap(
  requirement: DecisionEvidenceRequirement,
  candidate: EvidenceAdmissionCandidate
): { gap?: GapReason; unknown: boolean; limitation?: string } {
  const temporal = requirement.temporalRequirement;
  const fitness = candidate.temporal.fitness;
  if (temporal === undefined || temporal === 'ANY_TEMPORAL_STATE') {
    return { unknown: false };
  }
  if (temporal === 'HISTORICAL_ACCEPTABLE') {
    return fitness === 'UNKNOWN' ? { gap: 'TEMPORAL_NOT_FIT', unknown: true } : { unknown: false };
  }
  if (temporal === 'REVALIDATION_ALLOWED') {
    if (fitness === 'REVALIDATION_REQUIRED') {
      return { unknown: false, limitation: 'revalidation is still required' };
    }
    if (fitness === 'FIT' || fitness === 'FIT_WITH_WARNING') {
      return { unknown: false };
    }
    return fitness === 'UNKNOWN'
      ? { gap: 'TEMPORAL_NOT_FIT', unknown: true }
      : { gap: 'TEMPORAL_NOT_FIT', unknown: false };
  }
  if (temporal === 'MAX_AGE_REQUIRED') {
    const freshness = candidate.temporal.freshness;
    if (freshness === 'CURRENT' || freshness === 'AGING') {
      return { unknown: false };
    }
    if (freshness === undefined || freshness === 'UNKNOWN') {
      return { gap: 'TEMPORAL_NOT_FIT', unknown: true };
    }
    return freshness === 'REVALIDATION_REQUIRED'
      ? { gap: 'REVALIDATION_REQUIRED', unknown: false }
      : { gap: 'TEMPORAL_NOT_FIT', unknown: false };
  }
  if (temporal === 'EFFECTIVE_AT_DECISION_TIME') {
    if (candidate.temporal.effectiveAtDecisionTime === true) {
      return { unknown: false };
    }
    return candidate.temporal.effectiveAtDecisionTime === false
      ? { gap: 'TEMPORAL_NOT_FIT', unknown: false }
      : { gap: 'TEMPORAL_NOT_FIT', unknown: true };
  }
  if (fitness === 'FIT' || fitness === 'FIT_WITH_WARNING') {
    return { unknown: false };
  }
  if (fitness === 'REVALIDATION_REQUIRED') {
    return { gap: 'REVALIDATION_REQUIRED', unknown: false };
  }
  return fitness === 'UNKNOWN'
    ? { gap: 'TEMPORAL_NOT_FIT', unknown: true }
    : { gap: 'TEMPORAL_NOT_FIT', unknown: false };
}

function authoritySatisfies(
  requirement: DecisionEvidenceRequirement,
  bundle: ParsedBundle
): boolean {
  if (requirement.minimumAuthority === undefined) {
    return true;
  }
  const entry = bundle.candidate.authority.find((item) => item.domain === requirement.domain);
  if (entry === undefined || bundle.receipt.authorityState !== entry.authorityClass) {
    return false;
  }
  const actual = AUTHORITY_RANK[entry.authorityClass];
  const minimum = AUTHORITY_RANK[requirement.minimumAuthority];
  return actual >= minimum;
}

function negativeReady(candidate: EvidenceAdmissionCandidate): boolean {
  const negative = candidate.negative;
  return (
    candidate.coverage.record === 'COMPLETE' &&
    negative !== undefined &&
    negative.searchEffort === 'PRESENT' &&
    negative.detectability === 'ADDRESSED' &&
    negative.sourceSuitable === true &&
    negative.temporalApplicable === true
  );
}

function inScope(requirement: DecisionEvidenceRequirement, bundle: ParsedBundle): boolean {
  return (
    bundle.receipt.domain === requirement.domain && bundle.receipt.purpose === requirement.purpose
  );
}

function admitted(bundle: ParsedBundle): boolean {
  return (
    bundle.receipt.decision === 'ADMITTED' ||
    bundle.receipt.decision === 'ADMITTED_WITH_LIMITATIONS'
  );
}

function bundleGaps(
  requirement: DecisionEvidenceRequirement,
  bundle: ParsedBundle,
  evaluationContext: DecisionEvidenceContext
): { gaps: GapReason[]; unknownTemporal: boolean; limitations: string[] } {
  const gaps: GapReason[] = [];
  const limitations: string[] = [];
  if (bundle.candidate.role !== bundle.receipt.evidenceRole) {
    gaps.push('OTHER');
  }
  if (!requirement.allowedEvidenceRoles.includes(bundle.receipt.evidenceRole)) {
    gaps.push('MISSING_REQUIRED_ROLE');
  }
  if (!authoritySatisfies(requirement, bundle)) {
    gaps.push('AUTHORITY_INSUFFICIENT');
  }
  const coverage = requirement.coverageRequirement;
  if (
    coverage !== undefined &&
    (!coverageAxis(bundle.candidate.coverage.record, coverage.record) ||
      !coverageAxis(bundle.candidate.coverage.geometry, coverage.geometry) ||
      !coverageAxis(bundle.candidate.coverage.temporal, coverage.temporal))
  ) {
    gaps.push('COVERAGE_INSUFFICIENT');
  }
  if (
    requirement.provenanceRequirement !== undefined &&
    !provenanceSatisfies(bundle.candidate.provenance.state, requirement.provenanceRequirement)
  ) {
    gaps.push('PROVENANCE_INCOMPLETE');
  }
  if (
    requirement.availabilityRequirement !== undefined &&
    !requirement.availabilityRequirement.includes(bundle.candidate.availability)
  ) {
    gaps.push('AVAILABILITY_INSUFFICIENT');
  }
  if (
    requirement.requiredCandidateKinds !== undefined &&
    !requirement.requiredCandidateKinds.includes(bundle.candidate.kind)
  ) {
    gaps.push('OTHER');
  }
  if (requirement.requiresNegativeAdmission && !negativeReady(bundle.candidate)) {
    gaps.push(bundle.candidate.coverage.record === 'COMPLETE' ? 'OTHER' : 'COVERAGE_INSUFFICIENT');
  }
  if (
    bundle.receipt.decision === 'ADMITTED_WITH_LIMITATIONS' &&
    requirement.allowLimitations !== true
  ) {
    gaps.push('OTHER');
  }
  const temporal = temporalGap(requirement, bundle.candidate);
  if (temporal.gap !== undefined) {
    gaps.push(temporal.gap);
  }
  if (temporal.limitation !== undefined) {
    limitations.push(temporal.limitation);
  }
  if (futureTarget(requirement, evaluationContext)) {
    gaps.push('REVALIDATION_REQUIRED');
  }
  return { gaps, unknownTemporal: temporal.unknown, limitations };
}

function statusFromGaps(
  gaps: readonly GapReason[],
  unknownTemporal: boolean
): DecisionRequirementStatus {
  if (gaps.includes('QUARANTINED_EVIDENCE')) {
    return 'QUARANTINED';
  }
  if (gaps.includes('UNRESOLVED_CONTRADICTION')) {
    return 'CONFLICTED';
  }
  if (gaps.includes('MISSING_REQUIRED_DOMAIN') || gaps.includes('MISSING_REQUIRED_ROLE')) {
    return 'MISSING';
  }
  const temporalOnly = gaps.every(
    (gap) => gap === 'REVALIDATION_REQUIRED' || gap === 'TEMPORAL_NOT_FIT'
  );
  if (temporalOnly && gaps.length > 0 && !unknownTemporal) {
    return 'STALE';
  }
  return 'INSUFFICIENT';
}

function requirementApplicability(
  requirement: DecisionEvidenceRequirement,
  evaluationContext: DecisionEvidenceContext
): 'EVALUATE' | 'NOT_APPLICABLE' | 'UNRESOLVED' {
  if (requirement.applicability.mode === 'ALWAYS') {
    return 'EVALUATE';
  }
  const value = evaluationContext.applicability[requirement.applicability.key];
  if (value === 'APPLICABLE') {
    return 'EVALUATE';
  }
  if (value === 'NOT_APPLICABLE') {
    return 'NOT_APPLICABLE';
  }
  return 'UNRESOLVED';
}

function assessRequirement(
  requirement: DecisionEvidenceRequirement,
  bundles: readonly ParsedBundle[],
  evaluationContext: DecisionEvidenceContext
): Assessment {
  const applicability = requirementApplicability(requirement, evaluationContext);
  if (applicability === 'NOT_APPLICABLE') {
    return {
      requirementId: requirement.id,
      optional: requirement.optional,
      status: 'NOT_APPLICABLE',
      gaps: [],
      limitations: [],
    };
  }
  if (applicability === 'UNRESOLVED') {
    return {
      requirementId: requirement.id,
      optional: requirement.optional,
      status: 'UNRESOLVED',
      gaps: ['OTHER'],
      limitations: [],
    };
  }

  const scoped = bundles.filter((bundle) => inScope(requirement, bundle));
  if (scoped.length === 0) {
    return {
      requirementId: requirement.id,
      optional: requirement.optional,
      status: 'MISSING',
      gaps: ['MISSING_REQUIRED_DOMAIN'],
      limitations: [],
    };
  }
  if (
    scoped.some((bundle) => bundle.receipt.decision === 'QUARANTINED') &&
    scoped.every((bundle) => !admitted(bundle))
  ) {
    return {
      requirementId: requirement.id,
      optional: requirement.optional,
      status: 'QUARANTINED',
      gaps: ['QUARANTINED_EVIDENCE'],
      limitations: [],
    };
  }
  const usable = scoped.filter(admitted);
  if (usable.length === 0) {
    const decision = scoped[0]?.receipt.decision;
    return {
      requirementId: requirement.id,
      optional: requirement.optional,
      status: decision === 'CONFLICTED' ? 'CONFLICTED' : 'INSUFFICIENT',
      gaps: [decision === 'CONFLICTED' ? 'UNRESOLVED_CONTRADICTION' : 'OTHER'],
      limitations: [],
    };
  }

  const checked = usable.map((bundle) => ({
    bundle,
    ...bundleGaps(requirement, bundle, evaluationContext),
  }));
  const eligible = checked.filter((item) => item.gaps.length === 0);
  if (eligible.length === 0) {
    const closest = [...checked].sort((left, right) => left.gaps.length - right.gaps.length)[0];
    const gaps = closest === undefined ? ['OTHER' as const] : closest.gaps;
    return {
      requirementId: requirement.id,
      optional: requirement.optional,
      status: statusFromGaps(gaps, closest?.unknownTemporal === true),
      gaps,
      limitations: [],
    };
  }

  const policy = requirement.contradictionPolicy ?? 'REQUIRE_NO_UNRESOLVED_CONFLICT';
  const conflicted = eligible.filter(
    (item) =>
      item.bundle.candidate.contradiction.state === 'UNRESOLVED' ||
      item.bundle.receipt.contradictionState === 'UNRESOLVED'
  );
  if (conflicted.length > 0 && policy !== 'ALLOW_CONFLICT') {
    return {
      requirementId: requirement.id,
      optional: requirement.optional,
      status: policy === 'DEFER_ON_CONFLICT' ? 'UNRESOLVED' : 'CONFLICTED',
      gaps: ['UNRESOLVED_CONTRADICTION'],
      limitations: [],
    };
  }

  const lineageIds = eligible.flatMap(
    (item) => item.bundle.candidate.independence.upstreamLineageIds
  );
  if (requirement.independenceMinimum !== undefined) {
    const unknown = eligible.some(
      (item) => item.bundle.candidate.independence.upstreamLineageIds.length === 0
    );
    if (unknown || new Set(lineageIds).size < requirement.independenceMinimum) {
      return {
        requirementId: requirement.id,
        optional: requirement.optional,
        status: 'INSUFFICIENT',
        gaps: ['INDEPENDENCE_INSUFFICIENT'],
        limitations: [],
      };
    }
  }
  if (eligible.length < requirement.requiredCount) {
    return {
      requirementId: requirement.id,
      optional: requirement.optional,
      status: 'INSUFFICIENT',
      gaps: ['REQUIRED_EVIDENCE_COUNT_NOT_MET'],
      limitations: [],
    };
  }

  const limitations = [
    ...requirement.limitations,
    ...eligible.flatMap((item) => item.limitations),
    ...eligible.flatMap((item) => item.bundle.receipt.limitations),
  ];
  if (conflicted.length > 0) {
    limitations.push('unresolved contradiction retained');
  }
  const limited =
    limitations.length > 0 ||
    eligible.some((item) => item.bundle.receipt.decision === 'ADMITTED_WITH_LIMITATIONS');
  return {
    requirementId: requirement.id,
    optional: requirement.optional,
    status: limited ? 'SATISFIED_WITH_LIMITATIONS' : 'SATISFIED',
    gaps: [],
    limitations,
  };
}

function includedIds(
  contract: DecisionEvidenceContract,
  assessments: readonly Assessment[]
): Set<string> {
  const byId = new Map(assessments.map((assessment) => [assessment.requirementId, assessment]));
  const included = new Set<string>();
  for (const group of contract.groups) {
    const members = group.requirementIds
      .map((id) => byId.get(id))
      .filter((assessment): assessment is Assessment => assessment !== undefined)
      .filter((assessment) => assessment.status !== 'NOT_APPLICABLE' && !assessment.optional);
    const satisfied = members.filter(
      (assessment) =>
        assessment.status === 'SATISFIED' || assessment.status === 'SATISFIED_WITH_LIMITATIONS'
    );
    const take =
      group.cardinality === 'ALL_OF'
        ? members
        : group.cardinality === 'ANY_OF'
          ? satisfied.length > 0
            ? satisfied
            : members
          : satisfied.length >= (group.minimumCount ?? members.length)
            ? satisfied
            : members;
    for (const assessment of take) {
      included.add(assessment.requirementId);
    }
  }
  return included;
}

function completenessFrom(included: readonly Assessment[]): DecisionCompletenessStatus {
  if (included.some((assessment) => assessment.status === 'UNRESOLVED')) {
    return 'UNRESOLVED';
  }
  if (included.some((assessment) => assessment.status === 'CONFLICTED')) {
    return 'CONFLICTED';
  }
  if (
    included.some(
      (assessment) =>
        assessment.status === 'MISSING' ||
        assessment.status === 'INSUFFICIENT' ||
        assessment.status === 'QUARANTINED'
    )
  ) {
    return 'INCOMPLETE';
  }
  if (included.some((assessment) => assessment.status === 'STALE')) {
    return 'REVALIDATION_REQUIRED';
  }
  if (included.some((assessment) => assessment.status === 'SATISFIED_WITH_LIMITATIONS')) {
    return 'COMPLETE_WITH_LIMITATIONS';
  }
  return 'COMPLETE';
}

function currentCoverage(
  geometry: EvidenceCoverageRequirement['geometry']
): EvidenceCoverageRequirement {
  return { record: 'COMPLETE_REQUIRED', geometry, temporal: 'NOT_APPLICABLE' };
}

function baseRequirement(
  id: string,
  domain: DecisionEvidenceRequirement['domain'],
  purpose: DecisionEvidenceRequirement['purpose'],
  overrides: Partial<DecisionEvidenceRequirement> = {}
): DecisionEvidenceRequirement {
  return {
    id,
    domain,
    purpose,
    allowedEvidenceRoles: ['DECISION', 'AUTHORITATIVE_DECISION'],
    minimumAuthority: 'SECONDARY_AUTHORITY',
    temporalRequirement: 'CURRENT_REQUIRED',
    coverageRequirement: currentCoverage('NOT_APPLICABLE'),
    provenanceRequirement: 'SOURCE_TRACEABLE',
    contradictionPolicy: 'REQUIRE_NO_UNRESOLVED_CONFLICT',
    requiredCount: 1,
    optional: false,
    allowLimitations: true,
    requiresNegativeAdmission: false,
    limitations: [],
    applicability: { mode: 'ALWAYS' },
    ...overrides,
  };
}

function contractFor(
  id: string,
  decisionClass: DecisionClass,
  requirements: DecisionEvidenceRequirement[],
  groups: DecisionEvidenceRequirementGroup[]
): DecisionEvidenceContract {
  return DecisionEvidenceContractSchema.parse({
    id,
    version: V1,
    decisionClass,
    schemaVersion: DECISION_EVIDENCE_CONTRACT_SCHEMA_VERSION,
    requirements,
    groups,
  });
}

const BUILTIN_DECISION_EVIDENCE_CONTRACTS: readonly DecisionEvidenceContract[] = deepFreeze([
  contractFor(
    'rockhounding:decision-evidence:collection-permission',
    'COLLECTION_PERMISSION',
    [
      baseRequirement('land-management', 'LAND_MANAGEMENT', 'COLLECTION_PERMISSION'),
      baseRequirement('collection-rule', 'COLLECTION_RULE', 'COLLECTION_PERMISSION'),
      baseRequirement('closure', 'CLOSURE', 'COLLECTION_PERMISSION'),
      baseRequirement('mining-claim', 'MINING_CLAIM', 'COLLECTION_PERMISSION', {
        applicability: { mode: 'CONTEXT', key: 'miningClaim' },
        rationale: 'Applicable only when the caller marks claim evidence in scope.',
      }),
      baseRequirement('mineral-estate', 'MINERAL_ESTATE', 'COLLECTION_PERMISSION', {
        applicability: { mode: 'CONTEXT', key: 'mineralEstate' },
        rationale: 'Applicable only when the caller marks mineral-estate evidence in scope.',
      }),
    ],
    [
      {
        id: 'collection-permission-all',
        cardinality: 'ALL_OF',
        requirementIds: [
          'land-management',
          'collection-rule',
          'closure',
          'mining-claim',
          'mineral-estate',
        ],
      },
    ]
  ),
  contractFor(
    'rockhounding:decision-evidence:site-access',
    'SITE_ACCESS',
    [
      baseRequirement('ownership', 'LAND_OWNERSHIP', 'SITE_ACCESS'),
      baseRequirement('management', 'LAND_MANAGEMENT', 'SITE_ACCESS'),
      baseRequirement('road', 'ROAD_TRAIL_ACCESS', 'SITE_ACCESS'),
      baseRequirement('closure', 'CLOSURE', 'SITE_ACCESS'),
    ],
    [
      { id: 'site-holder', cardinality: 'ANY_OF', requirementIds: ['ownership', 'management'] },
      { id: 'site-operational', cardinality: 'ALL_OF', requirementIds: ['road', 'closure'] },
    ]
  ),
  contractFor(
    'rockhounding:decision-evidence:route-access',
    'ROUTE_ACCESS',
    [
      baseRequirement('road', 'ROAD_TRAIL_ACCESS', 'ROUTE_DECISION', {
        coverageRequirement: currentCoverage('COMPLETE_REQUIRED'),
      }),
      baseRequirement('closure', 'CLOSURE', 'ROUTE_DECISION'),
      baseRequirement('management', 'LAND_MANAGEMENT', 'ROUTE_DECISION'),
    ],
    [{ id: 'route-all', cardinality: 'ALL_OF', requirementIds: ['road', 'closure', 'management'] }]
  ),
  contractFor(
    'rockhounding:decision-evidence:closure-status',
    'CLOSURE_STATUS',
    [baseRequirement('closure', 'CLOSURE', 'OTHER')],
    [{ id: 'closure-all', cardinality: 'ALL_OF', requirementIds: ['closure'] }]
  ),
  contractFor(
    'rockhounding:decision-evidence:safety-status',
    'SAFETY_STATUS',
    [
      baseRequirement('safety', 'SAFETY', 'SAFETY_DECISION'),
      baseRequirement('weather', 'WEATHER', 'SAFETY_DECISION', { optional: true }),
      baseRequirement('fire', 'FIRE', 'SAFETY_DECISION', { optional: true }),
    ],
    [{ id: 'safety-all', cardinality: 'ALL_OF', requirementIds: ['safety', 'weather', 'fire'] }]
  ),
  contractFor(
    'rockhounding:decision-evidence:geological-context',
    'GEOLOGICAL_CONTEXT',
    [
      baseRequirement('geology', 'GEOLOGY', 'GEOLOGICAL_CONTEXT', {
        temporalRequirement: 'HISTORICAL_ACCEPTABLE',
      }),
      baseRequirement('occurrence', 'MINERAL_OCCURRENCE', 'GEOLOGICAL_CONTEXT', {
        temporalRequirement: 'HISTORICAL_ACCEPTABLE',
        optional: true,
      }),
    ],
    [{ id: 'geology-all', cardinality: 'ALL_OF', requirementIds: ['geology', 'occurrence'] }]
  ),
  contractFor(
    'rockhounding:decision-evidence:geological-opportunity',
    'GEOLOGICAL_OPPORTUNITY',
    [
      baseRequirement('geology', 'GEOLOGY', 'DISCOVERY_SEARCH', {
        allowedEvidenceRoles: ['DISCOVERY', 'DECISION', 'AUTHORITATIVE_DECISION'],
        temporalRequirement: 'HISTORICAL_ACCEPTABLE',
      }),
      baseRequirement('occurrence', 'MINERAL_OCCURRENCE', 'DISCOVERY_SEARCH', {
        allowedEvidenceRoles: ['DISCOVERY', 'DECISION', 'AUTHORITATIVE_DECISION'],
        temporalRequirement: 'HISTORICAL_ACCEPTABLE',
      }),
    ],
    [{ id: 'opportunity-any', cardinality: 'ANY_OF', requirementIds: ['geology', 'occurrence'] }]
  ),
  contractFor(
    'rockhounding:decision-evidence:mining-claim-status',
    'MINING_CLAIM_STATUS',
    [
      baseRequirement('claim-record', 'MINING_CLAIM', 'OTHER'),
      baseRequirement('claim-absence', 'MINING_CLAIM', 'ABSENCE_INFERENCE', {
        allowedEvidenceRoles: ['NEGATIVE'],
        requiresNegativeAdmission: true,
        applicability: { mode: 'CONTEXT', key: 'claimAbsence' },
        rationale: 'A zero-result query satisfies this only after negative-evidence admission.',
      }),
    ],
    [{ id: 'claim-all', cardinality: 'ALL_OF', requirementIds: ['claim-record', 'claim-absence'] }]
  ),
  contractFor(
    'rockhounding:decision-evidence:land-ownership-status',
    'LAND_OWNERSHIP_STATUS',
    [baseRequirement('ownership', 'LAND_OWNERSHIP', 'OTHER')],
    [{ id: 'ownership-all', cardinality: 'ALL_OF', requirementIds: ['ownership'] }]
  ),
  contractFor(
    'rockhounding:decision-evidence:land-management-status',
    'LAND_MANAGEMENT_STATUS',
    [baseRequirement('management', 'LAND_MANAGEMENT', 'OTHER')],
    [{ id: 'management-all', cardinality: 'ALL_OF', requirementIds: ['management'] }]
  ),
  contractFor(
    'rockhounding:decision-evidence:specimen-identification',
    'SPECIMEN_IDENTIFICATION',
    [
      baseRequirement('observation', 'FIELD_OBSERVATION', 'SPECIMEN_IDENTIFICATION', {
        allowedEvidenceRoles: ['CORROBORATING', 'DECISION'],
        minimumAuthority: 'USER_OBSERVATION',
        temporalRequirement: 'ANY_TEMPORAL_STATE',
        provenanceRequirement: 'BASIC',
      }),
      baseRequirement('specimen', 'SPECIMEN_IDENTIFICATION', 'SPECIMEN_IDENTIFICATION', {
        allowedEvidenceRoles: ['CORROBORATING', 'DECISION', 'AUTHORITATIVE_DECISION'],
        minimumAuthority: 'USER_OBSERVATION',
        temporalRequirement: 'ANY_TEMPORAL_STATE',
        provenanceRequirement: 'BASIC',
      }),
    ],
    [{ id: 'specimen-any', cardinality: 'ANY_OF', requirementIds: ['observation', 'specimen'] }]
  ),
  contractFor(
    'rockhounding:decision-evidence:field-visit-readiness',
    'FIELD_VISIT_READINESS',
    [
      baseRequirement('road', 'ROAD_TRAIL_ACCESS', 'SITE_ACCESS'),
      baseRequirement('closure', 'CLOSURE', 'SITE_ACCESS'),
      baseRequirement('safety', 'SAFETY', 'SAFETY_DECISION'),
      baseRequirement('geology', 'GEOLOGY', 'GEOLOGICAL_CONTEXT', {
        temporalRequirement: 'HISTORICAL_ACCEPTABLE',
      }),
    ],
    [
      {
        id: 'visit-all',
        cardinality: 'ALL_OF',
        requirementIds: ['road', 'closure', 'safety', 'geology'],
      },
    ]
  ),
]);

export function builtinDecisionEvidenceContract(
  decisionClass: DecisionClass
): DecisionEvidenceContract {
  const found = BUILTIN_DECISION_EVIDENCE_CONTRACTS.find(
    (contract) => contract.decisionClass === decisionClass
  );
  if (found === undefined) {
    throw new Error(`No builtin decision evidence contract for ${decisionClass}`);
  }
  return DecisionEvidenceContractSchema.parse(structuredClone(found));
}

export function selectDecisionEvidenceContract(
  contracts: readonly DecisionEvidenceContract[],
  id: DecisionEvidenceContractId,
  version: DecisionEvidenceContractVersion
): DecisionEvidenceContract | undefined {
  return contracts.find((contract) => contract.id === id && sameVersion(contract.version, version));
}

export function decisionEvidenceContractEmitsOutcome(): false {
  return false;
}

export function evaluateDecisionEvidenceContract(
  contractInput: DecisionEvidenceContract,
  bundlesInput: readonly DecisionEvidenceBundle[],
  contextInput: DecisionEvidenceContext
): DecisionEvidenceEvaluation {
  const contract = DecisionEvidenceContractSchema.parse(structuredClone(contractInput));
  const bundles = z.array(DecisionEvidenceBundleSchema).parse(structuredClone(bundlesInput));
  const evaluationContext = DecisionEvidenceContextSchema.parse(structuredClone(contextInput));
  const assessments = contract.requirements.map((requirement) =>
    assessRequirement(requirement, bundles, evaluationContext)
  );
  const included = includedIds(contract, assessments);
  const includedAssessments = assessments.filter((assessment) =>
    included.has(assessment.requirementId)
  );
  const nonOptional = assessments.filter((assessment) => !assessment.optional);
  const completeness =
    includedAssessments.length === 0
      ? nonOptional.every((assessment) => assessment.status === 'NOT_APPLICABLE') &&
        nonOptional.length > 0
        ? DecisionCompletenessStatus.NOT_APPLICABLE
        : DecisionCompletenessStatus.COMPLETE
      : completenessFrom(includedAssessments);
  const gaps = assessments
    .filter(
      (assessment) => assessment.status !== 'SATISFIED' && assessment.status !== 'NOT_APPLICABLE'
    )
    .flatMap((assessment) =>
      assessment.gaps.map((reason) => ({
        requirementId: assessment.requirementId,
        reason,
        blocking: included.has(assessment.requirementId),
      }))
    )
    .sort((left, right) =>
      left.requirementId === right.requirementId
        ? left.reason.localeCompare(right.reason)
        : left.requirementId.localeCompare(right.requirementId)
    );
  const limitations = includedAssessments.flatMap((assessment) => assessment.limitations);
  return deepFreeze({
    contractId: contract.id,
    contractVersion: { ...contract.version },
    decisionClass: contract.decisionClass,
    completeness,
    requirements: assessments.map((assessment) => ({
      requirementId: assessment.requirementId,
      status: assessment.status,
      gaps: [...assessment.gaps],
    })),
    gaps,
    limitations,
  });
}
