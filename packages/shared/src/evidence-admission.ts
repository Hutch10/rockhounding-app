/**
 * Evidence Admission Engine R1
 *
 * Purpose-specific eligibility for candidate evidence.
 * Admission does not decide a field action, rewrite certainty, or authorize use.
 */

import { z } from 'zod';

import { EvidenceAuthorityClassSchema } from './universal-geological-evidence-schema';

export const EVIDENCE_ADMISSION_SCHEMA_VERSION = 1;
export const EVIDENCE_ADMISSION_BLOCK_ID = 'rockhounding:evidence-admission';

const VersionSchema = z.object({
  major: z.number().int().nonnegative(),
  minor: z.number().int().nonnegative(),
  patch: z.number().int().nonnegative(),
});

export const EvidenceAdmissionDecisionStatus = {
  ADMITTED: 'ADMITTED',
  ADMITTED_WITH_LIMITATIONS: 'ADMITTED_WITH_LIMITATIONS',
  REJECTED: 'REJECTED',
  DEFERRED: 'DEFERRED',
  INSUFFICIENT_INFORMATION: 'INSUFFICIENT_INFORMATION',
  CONFLICTED: 'CONFLICTED',
  QUARANTINED: 'QUARANTINED',
} as const;

export type EvidenceAdmissionDecisionStatus =
  (typeof EvidenceAdmissionDecisionStatus)[keyof typeof EvidenceAdmissionDecisionStatus];

export const EvidenceAdmissionRole = {
  DISCOVERY: 'DISCOVERY',
  CORROBORATING: 'CORROBORATING',
  NEGATIVE: 'NEGATIVE',
  DECISION: 'DECISION',
  AUTHORITATIVE_DECISION: 'AUTHORITATIVE_DECISION',
} as const;

export type EvidenceAdmissionRole =
  (typeof EvidenceAdmissionRole)[keyof typeof EvidenceAdmissionRole];

export const EvidenceDomain = {
  GEOLOGY: 'GEOLOGY',
  MINERAL_OCCURRENCE: 'MINERAL_OCCURRENCE',
  LAND_OWNERSHIP: 'LAND_OWNERSHIP',
  LAND_MANAGEMENT: 'LAND_MANAGEMENT',
  MINERAL_ESTATE: 'MINERAL_ESTATE',
  MINING_CLAIM: 'MINING_CLAIM',
  COLLECTION_RULE: 'COLLECTION_RULE',
  CLOSURE: 'CLOSURE',
  ROAD_TRAIL_ACCESS: 'ROAD_TRAIL_ACCESS',
  SAFETY: 'SAFETY',
  WEATHER: 'WEATHER',
  FIRE: 'FIRE',
  SPECIMEN_IDENTIFICATION: 'SPECIMEN_IDENTIFICATION',
  FIELD_OBSERVATION: 'FIELD_OBSERVATION',
  PROVENANCE: 'PROVENANCE',
  OTHER: 'OTHER',
} as const;

export type EvidenceDomain = (typeof EvidenceDomain)[keyof typeof EvidenceDomain];

export const EvidencePurpose = {
  DISCOVERY_SEARCH: 'DISCOVERY_SEARCH',
  GEOLOGICAL_CONTEXT: 'GEOLOGICAL_CONTEXT',
  FIELD_NAVIGATION: 'FIELD_NAVIGATION',
  SITE_ACCESS: 'SITE_ACCESS',
  COLLECTION_PERMISSION: 'COLLECTION_PERMISSION',
  SAFETY_DECISION: 'SAFETY_DECISION',
  ROUTE_DECISION: 'ROUTE_DECISION',
  SPECIMEN_IDENTIFICATION: 'SPECIMEN_IDENTIFICATION',
  SCIENTIFIC_ANALYSIS: 'SCIENTIFIC_ANALYSIS',
  HISTORICAL_REVIEW: 'HISTORICAL_REVIEW',
  ABSENCE_INFERENCE: 'ABSENCE_INFERENCE',
  OTHER: 'OTHER',
} as const;

export type EvidencePurpose = (typeof EvidencePurpose)[keyof typeof EvidencePurpose];

export const EvidencePurposeFitness = {
  FIT: 'FIT',
  NOT_FIT: 'NOT_FIT',
  UNKNOWN: 'UNKNOWN',
} as const;

export type EvidencePurposeFitness =
  (typeof EvidencePurposeFitness)[keyof typeof EvidencePurposeFitness];

export const EvidenceTemporalRequirement = {
  ANY_TEMPORAL_STATE: 'ANY_TEMPORAL_STATE',
  CURRENT_REQUIRED: 'CURRENT_REQUIRED',
  REVALIDATION_ALLOWED: 'REVALIDATION_ALLOWED',
  HISTORICAL_ACCEPTABLE: 'HISTORICAL_ACCEPTABLE',
  MAX_AGE_REQUIRED: 'MAX_AGE_REQUIRED',
  EFFECTIVE_AT_DECISION_TIME: 'EFFECTIVE_AT_DECISION_TIME',
} as const;

export type EvidenceTemporalRequirement =
  (typeof EvidenceTemporalRequirement)[keyof typeof EvidenceTemporalRequirement];

export const EvidenceCoverageRequirementMode = {
  COMPLETE_REQUIRED: 'COMPLETE_REQUIRED',
  PARTIAL_ALLOWED: 'PARTIAL_ALLOWED',
  UNKNOWN_ALLOWED: 'UNKNOWN_ALLOWED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;

export type EvidenceCoverageRequirementMode =
  (typeof EvidenceCoverageRequirementMode)[keyof typeof EvidenceCoverageRequirementMode];

export const EvidenceProvenanceRequirement = {
  NONE: 'NONE',
  BASIC: 'BASIC',
  SOURCE_TRACEABLE: 'SOURCE_TRACEABLE',
  PROCESS_TRACEABLE: 'PROCESS_TRACEABLE',
  FULL_REQUIRED: 'FULL_REQUIRED',
} as const;

export type EvidenceProvenanceRequirement =
  (typeof EvidenceProvenanceRequirement)[keyof typeof EvidenceProvenanceRequirement];

export const EvidenceIndependenceState = {
  INDEPENDENT: 'INDEPENDENT',
  SAME_UPSTREAM_SOURCE: 'SAME_UPSTREAM_SOURCE',
  DERIVED_FROM_SAME_SOURCE: 'DERIVED_FROM_SAME_SOURCE',
  UNKNOWN_INDEPENDENCE: 'UNKNOWN_INDEPENDENCE',
} as const;

export type EvidenceIndependenceState =
  (typeof EvidenceIndependenceState)[keyof typeof EvidenceIndependenceState];

export const EvidenceContradictionPolicy = {
  ALLOW_CONFLICT: 'ALLOW_CONFLICT',
  REQUIRE_NO_UNRESOLVED_CONFLICT: 'REQUIRE_NO_UNRESOLVED_CONFLICT',
  REQUIRE_AUTHORITATIVE_RESOLUTION: 'REQUIRE_AUTHORITATIVE_RESOLUTION',
  DEFER_ON_CONFLICT: 'DEFER_ON_CONFLICT',
} as const;

export type EvidenceContradictionPolicy =
  (typeof EvidenceContradictionPolicy)[keyof typeof EvidenceContradictionPolicy];

export const EvidenceAdmissionReasonCode = {
  ROLE_NOT_ALLOWED: 'ROLE_NOT_ALLOWED',
  PURPOSE_NOT_FIT: 'PURPOSE_NOT_FIT',
  AUTHORITY_DOMAIN_MISMATCH: 'AUTHORITY_DOMAIN_MISMATCH',
  AUTHORITY_BELOW_MINIMUM: 'AUTHORITY_BELOW_MINIMUM',
  TEMPORAL_NOT_FIT: 'TEMPORAL_NOT_FIT',
  TEMPORAL_UNKNOWN: 'TEMPORAL_UNKNOWN',
  TEMPORAL_REVALIDATION_REQUIRED: 'TEMPORAL_REVALIDATION_REQUIRED',
  COVERAGE_INSUFFICIENT: 'COVERAGE_INSUFFICIENT',
  ABSENCE_NOT_ESTABLISHED: 'ABSENCE_NOT_ESTABLISHED',
  QUARANTINE_ACTIVE: 'QUARANTINE_ACTIVE',
  PROVENANCE_INCOMPLETE: 'PROVENANCE_INCOMPLETE',
  GOVERNANCE_PROHIBITED: 'GOVERNANCE_PROHIBITED',
  GOVERNANCE_UNKNOWN: 'GOVERNANCE_UNKNOWN',
  INDEPENDENCE_INSUFFICIENT: 'INDEPENDENCE_INSUFFICIENT',
  INDEPENDENCE_UNKNOWN: 'INDEPENDENCE_UNKNOWN',
  CONTRADICTION_UNRESOLVED: 'CONTRADICTION_UNRESOLVED',
  AVAILABILITY_NOT_ACCEPTED: 'AVAILABILITY_NOT_ACCEPTED',
  CANDIDATE_KIND_NOT_ACCEPTED: 'CANDIDATE_KIND_NOT_ACCEPTED',
  ADMITTED: 'ADMITTED',
  ADMITTED_WITH_LIMITATIONS: 'ADMITTED_WITH_LIMITATIONS',
} as const;

export type EvidenceAdmissionReasonCode =
  (typeof EvidenceAdmissionReasonCode)[keyof typeof EvidenceAdmissionReasonCode];

const RoleSchema = z.enum([
  'DISCOVERY',
  'CORROBORATING',
  'NEGATIVE',
  'DECISION',
  'AUTHORITATIVE_DECISION',
]);

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

const CoverageModeSchema = z.enum([
  'COMPLETE_REQUIRED',
  'PARTIAL_ALLOWED',
  'UNKNOWN_ALLOWED',
  'NOT_APPLICABLE',
]);

const CoverageLevelSchema = z.enum(['COMPLETE', 'PARTIAL', 'UNKNOWN']);

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

export const EvidenceCoverageRequirementSchema = z.object({
  record: CoverageModeSchema,
  geometry: CoverageModeSchema,
  temporal: CoverageModeSchema,
});

export type EvidenceCoverageRequirement = z.infer<typeof EvidenceCoverageRequirementSchema>;

export const EvidenceAdmissionPolicySchema = z.object({
  id: z.string().min(1).max(128),
  version: VersionSchema,
  schemaVersion: z.literal(EVIDENCE_ADMISSION_SCHEMA_VERSION),
  purpose: PurposeSchema,
  domain: DomainSchema,
  allowedRoles: z.array(RoleSchema).min(1).max(8),
  minimumAuthority: EvidenceAuthorityClassSchema.optional(),
  temporalRequirement: z.enum([
    'ANY_TEMPORAL_STATE',
    'CURRENT_REQUIRED',
    'REVALIDATION_ALLOWED',
    'HISTORICAL_ACCEPTABLE',
    'MAX_AGE_REQUIRED',
    'EFFECTIVE_AT_DECISION_TIME',
  ]),
  coverageRequirement: EvidenceCoverageRequirementSchema,
  provenanceRequirement: z.enum([
    'NONE',
    'BASIC',
    'SOURCE_TRACEABLE',
    'PROCESS_TRACEABLE',
    'FULL_REQUIRED',
  ]),
  independenceMinimum: z.number().int().positive().max(32).optional(),
  contradictionPolicy: z.enum([
    'ALLOW_CONFLICT',
    'REQUIRE_NO_UNRESOLVED_CONFLICT',
    'REQUIRE_AUTHORITATIVE_RESOLUTION',
    'DEFER_ON_CONFLICT',
  ]),
  allowQuarantined: z.boolean(),
  quarantineOutcome: z.enum(['QUARANTINED', 'DEFERRED']),
  requiresPermittedUse: z.boolean(),
  requiredAvailabilityStates: z.array(z.string().min(1).max(64)).max(16).optional(),
  requiredCandidateKinds: z.array(z.string().min(1).max(64)).max(16).optional(),
  limitations: z.array(z.string().min(1).max(256)).max(32),
});

export type EvidenceAdmissionPolicy = z.infer<typeof EvidenceAdmissionPolicySchema>;

export const EvidenceAdmissionCandidateSchema = z.object({
  id: z.string().min(1).max(128),
  kind: z.string().min(1).max(64),
  role: RoleSchema,
  supportedPurposes: z.array(PurposeSchema).max(16),
  authority: z
    .array(
      z.object({
        domain: DomainSchema,
        authorityClass: EvidenceAuthorityClassSchema,
      })
    )
    .max(16),
  temporal: z.object({
    fitness: z.enum(['FIT', 'FIT_WITH_WARNING', 'REVALIDATION_REQUIRED', 'NOT_FIT', 'UNKNOWN']),
    freshness: z.enum(['CURRENT', 'AGING', 'REVALIDATION_REQUIRED', 'STALE', 'UNKNOWN']).optional(),
    effectiveAtDecisionTime: z.union([z.boolean(), z.literal('UNKNOWN')]).optional(),
  }),
  coverage: z.object({
    record: CoverageLevelSchema,
    geometry: CoverageLevelSchema,
    temporal: CoverageLevelSchema,
    resultCount: z.number().int().nonnegative(),
  }),
  quarantine: z.object({
    state: z.enum(['NONE', 'QUARANTINED', 'RESOLVED']),
    disposition: z.enum(['NONE', 'ADMIT_CANDIDATE', 'KEEP_QUARANTINED']),
  }),
  provenance: z.object({
    state: z.enum(['NONE', 'BASIC', 'SOURCE_TRACEABLE', 'PROCESS_TRACEABLE', 'FULL']),
  }),
  governance: z.object({
    decision: z.enum(['ALLOWED', 'UNKNOWN', 'PROHIBITED']),
  }),
  independence: z.object({
    upstreamLineageIds: z.array(z.string().min(1).max(128)).max(32),
  }),
  contradiction: z.object({
    state: z.enum(['NONE', 'UNRESOLVED', 'RESOLVED_BY_AUTHORITY']),
    resolutionDomain: DomainSchema.optional(),
  }),
  availability: z.string().min(1).max(64),
  negative: z
    .object({
      searchEffort: z.enum(['PRESENT', 'ABSENT', 'UNKNOWN']),
      detectability: z.enum(['ADDRESSED', 'UNKNOWN']),
      sourceSuitable: z.boolean(),
      temporalApplicable: z.boolean(),
      querySucceeded: z.boolean(),
    })
    .optional(),
  uges: z
    .object({
      certainty: z.string().min(1).max(64),
      confidence: z.string().min(1).max(64),
    })
    .optional(),
  adapterStatus: z.enum(['SUCCESS', 'PARTIAL_SUCCESS', 'QUARANTINED', 'FAILED']).optional(),
});

export type EvidenceAdmissionCandidate = z.infer<typeof EvidenceAdmissionCandidateSchema>;

export const EvidenceAdmissionReasonSchema = z.object({
  code: z.string().min(1).max(64),
  detail: z.string().min(1).max(1000).optional(),
});

export type EvidenceAdmissionReason = z.infer<typeof EvidenceAdmissionReasonSchema>;

export const EvidenceAdmissionRequestSchema = z.object({
  id: z.string().min(1).max(128),
  evaluatedAt: z.string().datetime({ offset: true }),
  candidate: EvidenceAdmissionCandidateSchema,
  policy: EvidenceAdmissionPolicySchema,
});

export type EvidenceAdmissionRequest = z.infer<typeof EvidenceAdmissionRequestSchema>;

export type EvidenceAdmissionReceipt = {
  requestId: string;
  candidateId: string;
  policyId: string;
  policyVersion: EvidenceAdmissionPolicy['version'];
  decision: EvidenceAdmissionDecisionStatus;
  reasons: EvidenceAdmissionReason[];
  evaluatedAt: string;
  domain: EvidenceDomain;
  purpose: EvidencePurpose;
  evidenceRole: EvidenceAdmissionRole;
  inputReferences: { candidateId: string; policyId: string };
  temporalFitness: EvidenceAdmissionCandidate['temporal']['fitness'];
  coverageState: EvidenceAdmissionCandidate['coverage']['record'];
  provenanceState: EvidenceAdmissionCandidate['provenance']['state'];
  authorityState: string;
  independenceState: EvidenceIndependenceState;
  contradictionState: EvidenceAdmissionCandidate['contradiction']['state'];
  limitations: string[];
  purposeFitness: EvidencePurposeFitness;
};

export type EvidenceAdmissionEvaluation = {
  status: EvidenceAdmissionDecisionStatus;
  reasons: EvidenceAdmissionReason[];
  receipt: EvidenceAdmissionReceipt;
};

export function admissionRewritesCertainty(): false {
  return false;
}

export function admissionRewritesConfidence(): false {
  return false;
}

export function admissionCreatesProhibited(): false {
  return false;
}

export function admissionInfersRoleFromAuthority(): false {
  return false;
}

export function admissionSelectsFieldAction(): false {
  return false;
}

export function admissionEquatesAdapterSuccess(): false {
  return false;
}

export function admissionEquatesQuarantineDisposition(): false {
  return false;
}

type Stop = {
  status: EvidenceAdmissionDecisionStatus;
  code: EvidenceAdmissionReasonCode;
};

function lineageCount(ids: readonly string[]): number {
  return new Set(ids).size;
}

function independenceState(ids: readonly string[]): EvidenceIndependenceState {
  if (ids.length === 0) {
    return EvidenceIndependenceState.UNKNOWN_INDEPENDENCE;
  }
  const count = lineageCount(ids);
  if (count === 1 && ids.length > 1) {
    return EvidenceIndependenceState.SAME_UPSTREAM_SOURCE;
  }
  if (count === 1) {
    return EvidenceIndependenceState.DERIVED_FROM_SAME_SOURCE;
  }
  return EvidenceIndependenceState.INDEPENDENT;
}

function provenanceSatisfies(
  state: EvidenceAdmissionCandidate['provenance']['state'],
  requirement: EvidenceAdmissionPolicy['provenanceRequirement']
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

function coverageAxis(
  actual: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN',
  requirement: EvidenceCoverageRequirementMode
): boolean {
  if (requirement === 'NOT_APPLICABLE' || requirement === 'UNKNOWN_ALLOWED') {
    return true;
  }
  if (requirement === 'PARTIAL_ALLOWED') {
    return actual === 'COMPLETE' || actual === 'PARTIAL';
  }
  return actual === 'COMPLETE';
}

function temporalStop(
  requirement: EvidenceAdmissionPolicy['temporalRequirement'],
  temporal: EvidenceAdmissionCandidate['temporal']
): Stop | { limitation: string } | undefined {
  const fitness = temporal.fitness;
  if (requirement === 'ANY_TEMPORAL_STATE') {
    return undefined;
  }
  if (requirement === 'HISTORICAL_ACCEPTABLE') {
    return fitness === 'UNKNOWN'
      ? { status: 'INSUFFICIENT_INFORMATION', code: 'TEMPORAL_UNKNOWN' }
      : undefined;
  }
  if (requirement === 'REVALIDATION_ALLOWED') {
    if (fitness === 'REVALIDATION_REQUIRED') {
      return { limitation: 'revalidation is still required' };
    }
    if (fitness === 'FIT' || fitness === 'FIT_WITH_WARNING') {
      return undefined;
    }
    if (fitness === 'UNKNOWN') {
      return { status: 'INSUFFICIENT_INFORMATION', code: 'TEMPORAL_UNKNOWN' };
    }
    return { status: 'REJECTED', code: 'TEMPORAL_NOT_FIT' };
  }
  if (requirement === 'MAX_AGE_REQUIRED') {
    const freshness = temporal.freshness;
    if (freshness === 'CURRENT' || freshness === 'AGING') {
      return undefined;
    }
    if (freshness === undefined || freshness === 'UNKNOWN') {
      return { status: 'INSUFFICIENT_INFORMATION', code: 'TEMPORAL_UNKNOWN' };
    }
    if (freshness === 'REVALIDATION_REQUIRED') {
      return { status: 'REJECTED', code: 'TEMPORAL_REVALIDATION_REQUIRED' };
    }
    return { status: 'REJECTED', code: 'TEMPORAL_NOT_FIT' };
  }
  if (requirement === 'EFFECTIVE_AT_DECISION_TIME') {
    if (temporal.effectiveAtDecisionTime === true) {
      return undefined;
    }
    if (temporal.effectiveAtDecisionTime === false) {
      return { status: 'REJECTED', code: 'TEMPORAL_NOT_FIT' };
    }
    return { status: 'INSUFFICIENT_INFORMATION', code: 'TEMPORAL_UNKNOWN' };
  }
  if (fitness === 'FIT' || fitness === 'FIT_WITH_WARNING') {
    return undefined;
  }
  if (fitness === 'REVALIDATION_REQUIRED') {
    return { status: 'REJECTED', code: 'TEMPORAL_REVALIDATION_REQUIRED' };
  }
  if (fitness === 'UNKNOWN') {
    return { status: 'INSUFFICIENT_INFORMATION', code: 'TEMPORAL_UNKNOWN' };
  }
  return { status: 'REJECTED', code: 'TEMPORAL_NOT_FIT' };
}

function absenceStop(candidate: EvidenceAdmissionCandidate): Stop | undefined {
  const negative = candidate.negative;
  const ready =
    candidate.coverage.record === 'COMPLETE' &&
    negative?.searchEffort === 'PRESENT' &&
    negative.detectability === 'ADDRESSED' &&
    negative.sourceSuitable === true &&
    negative.temporalApplicable === true;
  if (!ready) {
    return { status: 'REJECTED', code: 'ABSENCE_NOT_ESTABLISHED' };
  }
  return undefined;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function finish(
  request: EvidenceAdmissionRequest,
  status: EvidenceAdmissionDecisionStatus,
  reasons: EvidenceAdmissionReason[],
  limitations: string[]
): EvidenceAdmissionEvaluation {
  const candidate = request.candidate;
  const matched = candidate.authority.find((entry) => entry.domain === request.policy.domain);
  const receipt: EvidenceAdmissionReceipt = {
    requestId: request.id,
    candidateId: candidate.id,
    policyId: request.policy.id,
    policyVersion: { ...request.policy.version },
    decision: status,
    reasons: reasons.map((reason) => ({ ...reason })),
    evaluatedAt: request.evaluatedAt,
    domain: request.policy.domain,
    purpose: request.policy.purpose,
    evidenceRole: candidate.role,
    inputReferences: { candidateId: candidate.id, policyId: request.policy.id },
    temporalFitness: candidate.temporal.fitness,
    coverageState: candidate.coverage.record,
    provenanceState: candidate.provenance.state,
    authorityState: matched?.authorityClass ?? 'NONE',
    independenceState: independenceState(candidate.independence.upstreamLineageIds),
    contradictionState: candidate.contradiction.state,
    limitations: [...limitations],
    purposeFitness: candidate.supportedPurposes.includes(request.policy.purpose)
      ? EvidencePurposeFitness.FIT
      : EvidencePurposeFitness.NOT_FIT,
  };
  return {
    status,
    reasons: receipt.reasons,
    receipt: deepFreeze(receipt),
  };
}

export function evaluateEvidenceAdmission(
  input: EvidenceAdmissionRequest
): EvidenceAdmissionEvaluation {
  const request = EvidenceAdmissionRequestSchema.parse(structuredClone(input));
  const candidate = request.candidate;
  const admissionPolicy = request.policy;
  const limitations = [...admissionPolicy.limitations];

  if (candidate.quarantine.state === 'QUARANTINED' && admissionPolicy.allowQuarantined !== true) {
    return finish(
      request,
      admissionPolicy.quarantineOutcome,
      [{ code: EvidenceAdmissionReasonCode.QUARANTINE_ACTIVE }],
      limitations
    );
  }

  if (candidate.contradiction.state === 'UNRESOLVED') {
    if (admissionPolicy.contradictionPolicy === 'ALLOW_CONFLICT') {
      limitations.push('unresolved contradiction retained');
    } else if (admissionPolicy.contradictionPolicy === 'DEFER_ON_CONFLICT') {
      return finish(
        request,
        EvidenceAdmissionDecisionStatus.DEFERRED,
        [{ code: EvidenceAdmissionReasonCode.CONTRADICTION_UNRESOLVED }],
        limitations
      );
    } else {
      return finish(
        request,
        EvidenceAdmissionDecisionStatus.CONFLICTED,
        [{ code: EvidenceAdmissionReasonCode.CONTRADICTION_UNRESOLVED }],
        limitations
      );
    }
  }

  if (!admissionPolicy.allowedRoles.includes(candidate.role)) {
    return finish(
      request,
      EvidenceAdmissionDecisionStatus.REJECTED,
      [{ code: EvidenceAdmissionReasonCode.ROLE_NOT_ALLOWED }],
      limitations
    );
  }

  if (!candidate.supportedPurposes.includes(admissionPolicy.purpose)) {
    return finish(
      request,
      EvidenceAdmissionDecisionStatus.REJECTED,
      [{ code: EvidenceAdmissionReasonCode.PURPOSE_NOT_FIT }],
      limitations
    );
  }

  if (admissionPolicy.minimumAuthority !== undefined) {
    const matched = candidate.authority.find((entry) => entry.domain === admissionPolicy.domain);
    if (matched === undefined) {
      return finish(
        request,
        EvidenceAdmissionDecisionStatus.REJECTED,
        [{ code: EvidenceAdmissionReasonCode.AUTHORITY_DOMAIN_MISMATCH }],
        limitations
      );
    }
    if (AUTHORITY_RANK[matched.authorityClass] < AUTHORITY_RANK[admissionPolicy.minimumAuthority]) {
      return finish(
        request,
        EvidenceAdmissionDecisionStatus.REJECTED,
        [{ code: EvidenceAdmissionReasonCode.AUTHORITY_BELOW_MINIMUM }],
        limitations
      );
    }
  }

  const temporal = temporalStop(admissionPolicy.temporalRequirement, candidate.temporal);
  if (temporal !== undefined && 'status' in temporal) {
    return finish(request, temporal.status, [{ code: temporal.code }], limitations);
  }
  if (temporal !== undefined && 'limitation' in temporal) {
    limitations.push(temporal.limitation);
  }

  const coverage = admissionPolicy.coverageRequirement;
  if (
    !coverageAxis(candidate.coverage.record, coverage.record) ||
    !coverageAxis(candidate.coverage.geometry, coverage.geometry) ||
    !coverageAxis(candidate.coverage.temporal, coverage.temporal)
  ) {
    return finish(
      request,
      EvidenceAdmissionDecisionStatus.REJECTED,
      [{ code: EvidenceAdmissionReasonCode.COVERAGE_INSUFFICIENT }],
      limitations
    );
  }

  if (candidate.role === 'NEGATIVE' || admissionPolicy.purpose === 'ABSENCE_INFERENCE') {
    const absence = absenceStop(candidate);
    if (absence !== undefined) {
      return finish(request, absence.status, [{ code: absence.code }], limitations);
    }
  }

  if (!provenanceSatisfies(candidate.provenance.state, admissionPolicy.provenanceRequirement)) {
    return finish(
      request,
      EvidenceAdmissionDecisionStatus.REJECTED,
      [{ code: EvidenceAdmissionReasonCode.PROVENANCE_INCOMPLETE }],
      limitations
    );
  }

  if (admissionPolicy.requiresPermittedUse) {
    if (candidate.governance.decision === 'PROHIBITED') {
      return finish(
        request,
        EvidenceAdmissionDecisionStatus.REJECTED,
        [{ code: EvidenceAdmissionReasonCode.GOVERNANCE_PROHIBITED }],
        limitations
      );
    }
    if (candidate.governance.decision === 'UNKNOWN') {
      return finish(
        request,
        EvidenceAdmissionDecisionStatus.INSUFFICIENT_INFORMATION,
        [{ code: EvidenceAdmissionReasonCode.GOVERNANCE_UNKNOWN }],
        limitations
      );
    }
  }

  if (admissionPolicy.independenceMinimum !== undefined) {
    const ids = candidate.independence.upstreamLineageIds;
    if (ids.length === 0) {
      return finish(
        request,
        EvidenceAdmissionDecisionStatus.INSUFFICIENT_INFORMATION,
        [{ code: EvidenceAdmissionReasonCode.INDEPENDENCE_UNKNOWN }],
        limitations
      );
    }
    if (lineageCount(ids) < admissionPolicy.independenceMinimum) {
      return finish(
        request,
        EvidenceAdmissionDecisionStatus.REJECTED,
        [{ code: EvidenceAdmissionReasonCode.INDEPENDENCE_INSUFFICIENT }],
        limitations
      );
    }
  }

  if (
    admissionPolicy.requiredAvailabilityStates !== undefined &&
    !admissionPolicy.requiredAvailabilityStates.includes(candidate.availability)
  ) {
    return finish(
      request,
      EvidenceAdmissionDecisionStatus.REJECTED,
      [{ code: EvidenceAdmissionReasonCode.AVAILABILITY_NOT_ACCEPTED }],
      limitations
    );
  }

  if (
    admissionPolicy.requiredCandidateKinds !== undefined &&
    !admissionPolicy.requiredCandidateKinds.includes(candidate.kind)
  ) {
    return finish(
      request,
      EvidenceAdmissionDecisionStatus.REJECTED,
      [{ code: EvidenceAdmissionReasonCode.CANDIDATE_KIND_NOT_ACCEPTED }],
      limitations
    );
  }

  const limited = limitations.length > admissionPolicy.limitations.length;
  const status = limited
    ? EvidenceAdmissionDecisionStatus.ADMITTED_WITH_LIMITATIONS
    : EvidenceAdmissionDecisionStatus.ADMITTED;
  return finish(
    request,
    status,
    [
      {
        code: limited
          ? EvidenceAdmissionReasonCode.ADMITTED_WITH_LIMITATIONS
          : EvidenceAdmissionReasonCode.ADMITTED,
      },
    ],
    limitations
  );
}
